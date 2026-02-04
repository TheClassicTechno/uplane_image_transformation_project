// API contract tests.
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NODE_ENV = "test";

let savedRecord: any = null;

// Mock external integrations for deterministic tests.
vi.mock("./cloudinary", () => ({
  configureCloudinary: vi.fn(),
  uploadBuffer: vi.fn(async (_buffer: Buffer, options: any) => ({
    url: `https://cdn.example.com/${options.filename}.png`,
    publicId: `public-${options.filename}`,
  })),
  deleteByPublicId: vi.fn(async () => undefined),
}));

vi.mock("./removeBg", () => ({
  removeBackground: vi.fn(async (buffer: Buffer) => buffer),
}));

vi.mock("./db", () => ({
  initDb: vi.fn(),
}));

vi.mock("./store", () => ({
  createRecord: vi.fn((record: any) => {
    savedRecord = record;
  }),
  updateRecord: vi.fn((id: string, updates: any) => {
    if (savedRecord?.id === id) {
      savedRecord = { ...savedRecord, ...updates };
    }
  }),
  getRecord: vi.fn((id: string) => (savedRecord?.id === id ? savedRecord : undefined)),
  getRecordByHash: vi.fn(() => undefined),
  listRecords: vi.fn(() => (savedRecord ? [savedRecord] : [])),
  removeRecord: vi.fn(() => {
    savedRecord = null;
  }),
}));

import path from "path";
import { app } from "./index";
import { uploadBuffer, deleteByPublicId } from "./cloudinary";
import { removeBackground } from "./removeBg";

const sampleImagePath = path.resolve(__dirname, "..", "..", "image.webp");

const attachSampleImage = (req: request.Test) =>
  req.attach("image", sampleImagePath, {
    filename: "sample.webp",
    contentType: "image/webp",
  });

describe("API", () => {
  beforeEach(() => {
    savedRecord = null;
    vi.clearAllMocks();
  });

  it("returns health status", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("lists recent images", async () => {
    savedRecord = {
      id: "img_list",
      status: "ready",
      step: "done",
      originalUrl: "https://cdn.example.com/original.png",
      processedUrl: "https://cdn.example.com/processed.png",
      originalPublicId: "orig_list",
      processedPublicId: "proc_list",
      hash: "hash_list",
      mode: "optimized",
      error: null,
      removeBgMs: 10,
      flipMs: 2,
      uploadMs: 5,
      createdAt: new Date().toISOString(),
    };

    const response = await request(app).get("/api/images?limit=1");
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
  });

  it("returns 404 for missing image", async () => {
    const response = await request(app).get("/api/images/missing");
    expect(response.status).toBe(404);
  });

  it("returns 404 on delete for missing image", async () => {
    const response = await request(app).delete("/api/images/missing");
    expect(response.status).toBe(404);
  });

  it("rejects uploads with no file", async () => {
    const response = await request(app).post("/api/images");
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Missing image file");
  });

  it("creates a processed image record", async () => {
    const response = await attachSampleImage(request(app).post("/api/images"));
    expect(response.status).toBe(201);
    expect(response.body.processedUrl).toContain("processed");
    expect(response.body.originalUrl).toContain("original");
  });

  it("stores a record for later retrieval", async () => {
    const createResponse = await attachSampleImage(request(app).post("/api/images"));
    const id = createResponse.body.id;
    const getResponse = await request(app).get(`/api/images/${id}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.id).toBe(id);
  });

  it("deletes hosted images on delete", async () => {
    const createResponse = await attachSampleImage(request(app).post("/api/images"));
    const id = createResponse.body.id;
    const deleteResponse = await request(app).delete(`/api/images/${id}`);
    expect(deleteResponse.status).toBe(200);
    expect(deleteByPublicId).toHaveBeenCalledTimes(2);
  });

  it("calls remove.bg during processing", async () => {
    await attachSampleImage(request(app).post("/api/images"));
    expect(removeBackground).toHaveBeenCalled();
  });

  it("cleans up original upload when processed upload fails", async () => {
    const mockUpload = uploadBuffer as unknown as ReturnType<typeof vi.fn>;
    mockUpload
      .mockResolvedValueOnce({ url: "https://cdn.example.com/original.png", publicId: "orig" })
      .mockRejectedValueOnce(new Error("upload failed"));

    const response = await attachSampleImage(request(app).post("/api/images"));
    expect(response.status).toBe(500);
    expect(deleteByPublicId).toHaveBeenCalledWith("orig");
  });
});
