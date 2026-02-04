// UI interaction tests.
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import App from "./App";

describe("App", () => {
  // Helper responses keep tests concise.
  const createResponse = (ok: boolean, payload: any) =>
    ({ ok, json: async () => payload } as Response);

  const listResponse = () => createResponse(true, { items: [] });

  const readyPayload = (id: string) => ({
    id,
    status: "ready",
    step: "done",
    originalUrl: "https://cdn.example.com/original.png",
    processedUrl: "https://cdn.example.com/processed.png",
    createdAt: new Date().toISOString(),
  });

  const mockFetchSequence = (...responses: Response[]) => {
    globalThis.fetch = vi.fn();
    responses.forEach((response) => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(response);
    });
  };

  const createFile = (name: string, type = "image/png") =>
    new File(["hello"], name, { type });

  const setupClipboard = () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve()),
      },
    });
  };

  beforeEach(() => {
    globalThis.URL.createObjectURL = vi.fn(() => "blob:preview");
    setupClipboard();
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: async () => ({ items: [] }) } as Response)
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  const renderApp = async () => {
    await act(async () => {
      render(<App />);
    });
  };

  it("renders the headline", async () => {
    await renderApp();
    expect(
      screen.getByRole("heading", {
        name: /remove the background, flip the image, share instantly/i,
      })
    ).toBeInTheDocument();
  });

  it("disables the process button initially", async () => {
    await renderApp();
    expect(screen.getByRole("button", { name: /process image/i })).toBeDisabled();
  });

  it("renders the result placeholder", async () => {
    await renderApp();
    expect(screen.getByText(/your processed image will appear here/i)).toBeInTheDocument();
  });

  it("shows an error for invalid file types", async () => {
    await renderApp();
    const input = screen.getByLabelText(/upload image/i);
    fireEvent.change(input, { target: { files: [createFile("note.txt", "text/plain")] } });
    expect(screen.getByText(/please upload a valid image file/i)).toBeInTheDocument();
  });

  it("shows a preview when a valid file is selected", async () => {
    await renderApp();
    const input = screen.getByLabelText(/upload image/i);
    fireEvent.change(input, { target: { files: [createFile("photo.png")] } });
    expect(screen.getByAltText(/original preview/i)).toBeInTheDocument();
  });

  it("shows the selected file name", async () => {
    await renderApp();
    const input = screen.getByLabelText(/upload image/i);
    fireEvent.change(input, { target: { files: [createFile("photo.png")] } });
    expect(screen.getByText(/photo\.png/i)).toBeInTheDocument();
  });

  it("clears the session", async () => {
    await renderApp();
    const input = screen.getByLabelText(/upload image/i);
    fireEvent.change(input, { target: { files: [createFile("photo.png")] } });
    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(screen.getByText(/no file selected/i)).toBeInTheDocument();
  });

  it("handles drag and drop uploads", async () => {
    await renderApp();
    const dropzone = screen.getByText(/drag & drop your image here/i).parentElement;
    if (!dropzone) {
      throw new Error("Dropzone not found");
    }
    fireEvent.drop(dropzone, { dataTransfer: { files: [createFile("drop.png")] } });
    expect(screen.getByText(/drop\.png/i)).toBeInTheDocument();
  });

  it("enables the process button once a file is selected", async () => {
    await renderApp();
    const input = screen.getByLabelText(/upload image/i);
    fireEvent.change(input, { target: { files: [createFile("photo.png")] } });
    expect(screen.getByRole("button", { name: /process image/i })).toBeEnabled();
  });

  it("shows processing state while upload is pending", async () => {
    let resolveFetch: (value: Response) => void;
    const deferredFetch = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(listResponse())
      .mockReturnValueOnce(deferredFetch)
      .mockResolvedValueOnce(listResponse()) as unknown as typeof fetch;

    const successResponse = createResponse(true, readyPayload("img_1"));

    await renderApp();
    const input = screen.getByLabelText(/upload image/i);
    fireEvent.change(input, { target: { files: [createFile("photo.png")] } });
    fireEvent.click(screen.getByRole("button", { name: /process image/i }));

    expect(screen.getByText(/queued/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /processing/i })).toBeDisabled();

    await act(async () => {
      resolveFetch!(successResponse);
    });
    expect(await screen.findByAltText(/processed result/i)).toBeInTheDocument();
  });

  it("renders the processed result on success", async () => {
    mockFetchSequence(
      listResponse(),
      createResponse(true, readyPayload("img_2")),
      listResponse()
    );

    await renderApp();
    const input = screen.getByLabelText(/upload image/i);
    fireEvent.change(input, { target: { files: [createFile("photo.png")] } });
    fireEvent.click(screen.getByRole("button", { name: /process image/i }));

    expect(await screen.findByAltText(/processed result/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy url/i })).toBeInTheDocument();
  });

  it("shows an error when processing fails", async () => {
    mockFetchSequence(listResponse(), createResponse(false, { error: "Processing failed." }));

    await renderApp();
    const input = screen.getByLabelText(/upload image/i);
    fireEvent.change(input, { target: { files: [createFile("photo.png")] } });
    fireEvent.click(screen.getByRole("button", { name: /process image/i }));

    expect(await screen.findByText(/processing failed/i)).toBeInTheDocument();
  });

  it("copies the processed URL", async () => {
    mockFetchSequence(
      listResponse(),
      createResponse(true, readyPayload("img_3")),
      listResponse()
    );

    await renderApp();
    const input = screen.getByLabelText(/upload image/i);
    fireEvent.change(input, { target: { files: [createFile("photo.png")] } });
    fireEvent.click(screen.getByRole("button", { name: /process image/i }));
    await screen.findByAltText(/processed result/i);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /copy url/i }));
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "https://cdn.example.com/processed.png"
    );
  });

  it("deletes the processed image", async () => {
    mockFetchSequence(
      listResponse(),
      createResponse(true, readyPayload("img_4")),
      listResponse(),
      createResponse(true, {})
    );

    await renderApp();
    const input = screen.getByLabelText(/upload image/i);
    fireEvent.change(input, { target: { files: [createFile("photo.png")] } });
    fireEvent.click(screen.getByRole("button", { name: /process image/i }));
    await screen.findByAltText(/processed result/i);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByText(/your processed image will appear here/i)).toBeInTheDocument();
    });
  });

  it("shows an error when delete fails", async () => {
    mockFetchSequence(
      listResponse(),
      createResponse(true, readyPayload("img_5")),
      listResponse(),
      createResponse(false, { error: "Delete failed." })
    );

    await renderApp();
    const input = screen.getByLabelText(/upload image/i);
    fireEvent.change(input, { target: { files: [createFile("photo.png")] } });
    fireEvent.click(screen.getByRole("button", { name: /process image/i }));
    await screen.findByAltText(/processed result/i);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(await screen.findByText(/delete failed/i)).toBeInTheDocument();
  });

  it("shows copied state after copy action", async () => {
    mockFetchSequence(
      listResponse(),
      createResponse(true, readyPayload("img_6")),
      listResponse()
    );

    await renderApp();
    const input = screen.getByLabelText(/upload image/i);
    fireEvent.change(input, { target: { files: [createFile("photo.png")] } });
    fireEvent.click(screen.getByRole("button", { name: /process image/i }));
    await screen.findByAltText(/processed result/i);

    fireEvent.click(screen.getByRole("button", { name: /copy url/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /copied!/i })).toBeInTheDocument();
    });
  });
});
