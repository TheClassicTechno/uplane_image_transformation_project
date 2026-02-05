// Main UI for upload, processing, and gallery.
import { useEffect, useMemo, useState } from "react";

type ImageRecord = {
  id: string;
  status: "queued" | "processing" | "ready" | "failed";
  step: "queued" | "removing_background" | "flipping" | "uploading" | "done";
  originalUrl?: string | null;
  processedUrl?: string | null;
  error?: string | null;
  mode?: "optimized" | "original";
  removeBgMs?: number | null;
  flipMs?: number | null;
  uploadMs?: number | null;
  createdAt: string;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

const App = () => {
  // Local UI state for upload + processing flow.
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string | null>(null);
  const [record, setRecord] = useState<ImageRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [activeSection, setActiveSection] = useState("about");
  const [mode, setMode] = useState<"optimized" | "original">("optimized");
  const [records, setRecords] = useState<ImageRecord[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGeneratingSample, setIsGeneratingSample] = useState(false);
  const navSections = ["about", "motivation", "how", "benefits", "gallery", "tools"];

  const fileName = useMemo(() => file?.name ?? "No file selected", [file]);

  const resetSession = () => {
    // Reset to initial empty state.
    setFile(null);
    setPreviewUrl(null);
    setRecord(null);
    setError(null);
    setCopyState("idle");
    setCopiedId(null);
    setProcessingStep(null);
    setIsProcessing(false);
  };

  const fetchRecords = async () => {
    // Fetch recent successful transformations for the gallery.
    try {
      const response = await fetch(`${apiBaseUrl}/api/images?limit=25`);
      if (!response?.ok) {
        return;
      }
      const data = await response.json();
      setRecords(data.items ?? []);
    } catch {
      // ignore listing errors to avoid blocking the UI
    }
  };

  const handleFile = (selectedFile: File) => {
    // Reject non-image uploads early.
    if (!selectedFile.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      return;
    }

    setError(null);
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setRecord(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleUpload = async () => {
    // Kick off async processing on the backend.
    if (!file) {
      setError("Choose an image before processing.");
      return;
    }

    setIsProcessing(true);
    setProcessingStep("Queued...");
    setError(null);
    setCopyState("idle");

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("mode", mode);

      const response = await fetch(`${apiBaseUrl}/api/images`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Processing failed.");
      }

      const data: ImageRecord = await response.json();
      setRecord(data);
      if (data.status === "ready") {
        setIsProcessing(false);
        setProcessingStep(null);
        fetchRecords();
      }
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Unexpected error.";
      setError(message);
    } finally {
      // keep isProcessing until job completes or fails
    }
  };

  const handleCopy = async () => {
    // Copy the hosted URL for sharing.
    if (!record?.processedUrl) {
      return;
    }

    await navigator.clipboard.writeText(record.processedUrl);
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 2000);
  };

  const handleCopyFromGallery = async (id: string, url?: string | null) => {
    if (!url) {
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async () => {
    // Delete hosted assets and remove the record.
    if (!record) {
      return;
    }

    setIsProcessing(true);
    setProcessingStep("Deleting image...");
    try {
      const response = await fetch(`${apiBaseUrl}/api/images/${record.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Delete failed.");
      }

      resetSession();
      fetchRecords();
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Unexpected error.";
      setError(message);
    } finally {
      setProcessingStep(null);
      setIsProcessing(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    // Remove a record from the gallery list.
    if (deletingId) {
      return;
    }
    const confirmed = window.confirm("Delete this image and remove it from the gallery?");
    if (!confirmed) {
      return;
    }
    setDeletingId(id);
    try {
      const response = await fetch(`${apiBaseUrl}/api/images/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Delete failed.");
      }
      if (record?.id === id) {
        resetSession();
      }
      fetchRecords();
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Unexpected error.";
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const formatMs = (value?: number | null) => {
    if (value === null || value === undefined) {
      return "—";
    }
    return `${value} ms`;
  };

  const createSampleImageFile = async (): Promise<File> => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas is not available.");
    }
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#60a5fa");
    gradient.addColorStop(1, "#a78bfa");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(255, 255, 255, 0.85)";
    context.beginPath();
    context.arc(220, 210, 120, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(15, 23, 42, 0.8)";
    context.font = "bold 42px Arial";
    context.fillText("Demo", 330, 250);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (!result) {
          reject(new Error("Failed to generate sample image."));
          return;
        }
        resolve(result);
      }, "image/png");
    });

    return new File([blob], "sample.png", { type: "image/png" });
  };

  const handleTrySample = async () => {
    if (isProcessing || isGeneratingSample) {
      return;
    }
    setIsGeneratingSample(true);
    try {
      const sampleFile = await createSampleImageFile();
      handleFile(sampleFile);
    } catch (sampleError) {
      const message = sampleError instanceof Error ? sampleError.message : "Unable to load sample.";
      setError(message);
    } finally {
      setIsGeneratingSample(false);
    }
  };

  const activeStep = (() => {
    if (record?.status === "processing" || record?.status === "queued") {
      if (record.step === "removing_background") {
        return "remove";
      }
      if (record.step === "flipping") {
        return "flip";
      }
    }
    if (record?.status === "ready") {
      return "share";
    }
    if (file) {
      return "upload";
    }
    return "upload";
  })();

  useEffect(() => {
    if (!record || record.status === "ready" || record.status === "failed") {
      return;
    }

    // Poll for async processing updates.
    const interval = window.setInterval(async () => {
      const response = await fetch(`${apiBaseUrl}/api/images/${record.id}`);
      if (!response.ok) {
        return;
      }
      const updated: ImageRecord = await response.json();
      setRecord(updated);
      if (updated.status === "ready") {
        setIsProcessing(false);
        setProcessingStep(null);
        window.clearInterval(interval);
        fetchRecords();
      } else if (updated.status === "failed") {
        setIsProcessing(false);
        setProcessingStep(null);
        setError(updated.error ?? "Processing failed.");
        window.clearInterval(interval);
      } else {
        const stepLabelMap: Record<ImageRecord["step"], string> = {
          queued: "Queued...",
          removing_background: "Removing background...",
          flipping: "Flipping image...",
          uploading: "Uploading result...",
          done: "Finalizing...",
        };
        setProcessingStep(stepLabelMap[updated.step]);
      }
    }, 1500);

    return () => window.clearInterval(interval);
  }, [record?.id, record?.status]);

  useEffect(() => {
    fetchRecords();
  }, []);

  const progressValue = (() => {
    // Map steps to a simple progress fraction.
    if (!record) {
      return 0;
    }
    const progressMap: Record<ImageRecord["step"], number> = {
      queued: 0.2,
      removing_background: 0.4,
      flipping: 0.6,
      uploading: 0.8,
      done: 1,
    };
    return progressMap[record.step] ?? 0;
  })();

  useEffect(() => {
    const sections = navSections;
    const observers: IntersectionObserver[] = [];

    sections.forEach((id) => {
      const section = document.getElementById(id);
      if (!section) {
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(id);
            }
          });
        },
        { rootMargin: "-40% 0px -50% 0px" }
      );

      observer.observe(section);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);

  return (
    <div className="page">
      <nav className="nav">
        <div className="nav-brand">Image Transform Studio</div>
        <div className="nav-progress" aria-hidden="true">
          <span
            style={{
              transform: `scaleX(${(Math.max(0, navSections.indexOf(activeSection)) + 1) / navSections.length})`,
            }}
          />
        </div>
        <div className="nav-links">
          <a href="#about" data-active={activeSection === "about"}>
            About
          </a>
          <a href="#motivation" data-active={activeSection === "motivation"}>
            Motivation
          </a>
          <a href="#how" data-active={activeSection === "how"}>
            How we made it
          </a>
          <a href="#benefits" data-active={activeSection === "benefits"}>
            Benefits
          </a>
          <a href="#gallery" data-active={activeSection === "gallery"}>
            All photos
          </a>
        </div>
      </nav>

      <header className="hero" id="about">
        <div className="hero-copy">
          <span className="pill">Image Transform Studio</span>
          <h1>Remove the background, flip the image, share instantly.</h1>
          <p className="subtext">
            Upload a single image and receive a polished, transparent background result with a
            shareable URL.
          </p>
          <div className="trust-row">
            <div>
              <span>Fast</span>
              <p>Average processing under a minute.</p>
            </div>
            <div>
              <span>Clean</span>
              <p>Transparent PNG output, ready to reuse.</p>
            </div>
            <div>
              <span>Simple</span>
              <p>No accounts or setup required.</p>
            </div>
          </div>
        </div>
        <div className="hero-panel">
          <div className="panel-header">
            <h2>Live process</h2>
            <p>Every step stays visible so users never guess.</p>
          </div>
          <div className="step-list">
            <div className="step" data-active={activeStep === "upload"}>
              <span>1</span>
              <div>
                <strong>Upload</strong>
                <p>Drop a single image file.</p>
              </div>
            </div>
            <div className="step" data-active={activeStep === "remove"}>
              <span>2</span>
              <div>
                <strong>Remove background</strong>
                <p>Powered by remove.bg.</p>
              </div>
            </div>
            <div className="step" data-active={activeStep === "flip"}>
              <span>3</span>
              <div>
                <strong>Flip horizontally</strong>
                <p>Mirror the cleaned image.</p>
              </div>
            </div>
            <div className="step" data-active={activeStep === "share"}>
              <span>4</span>
              <div>
                <strong>Share</strong>
                <p>Copy the hosted URL.</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="grid">
        <section className="card">
          <h2>1. Upload</h2>
          <div className="toggle">
            <button
              className={mode === "optimized" ? "toggle-button active" : "toggle-button"}
              type="button"
              onClick={() => setMode("optimized")}
            >
              Optimized (faster)
            </button>
            <button
              className={mode === "original" ? "toggle-button active" : "toggle-button"}
              type="button"
              onClick={() => setMode("original")}
            >
              Original (highest quality)
            </button>
          </div>
          <div className="dropzone" onDrop={handleDrop} onDragOver={handleDragOver}>
            <input
              type="file"
              accept=".jpeg,.jpg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif"
              onChange={handleFileChange}
              aria-label="Upload image"
            />
            <div className="dropzone-content">
              <p>Drag &amp; drop your image here</p>
              <span>or click to browse</span>
            </div>
          </div>
          <button
            className="secondary"
            type="button"
            onClick={handleTrySample}
            disabled={isProcessing || isGeneratingSample}
          >
            {isGeneratingSample ? "Preparing sample..." : "Try sample image"}
          </button>
          <div className="file-row">
            <span>{fileName}</span>
            {file && (
              <button className="link-button" type="button" onClick={resetSession}>
                Clear
              </button>
            )}
          </div>
          {previewUrl && (
            <div className="preview">
              <img src={previewUrl} alt="Original preview" />
            </div>
          )}
          <button className="primary" onClick={handleUpload} disabled={!file || isProcessing}>
            {isProcessing ? "Processing..." : "Process image"}
          </button>
          {isProcessing && (
            <div className="progress">
              <span style={{ transform: `scaleX(${progressValue})` }} />
            </div>
          )}
          {processingStep && (
            <div className="status" aria-live="polite">
              {processingStep}
            </div>
          )}
          {error && <div className="error">{error}</div>}
        </section>

        <section className="card">
          <h2>2. Result</h2>
          {record && record.processedUrl ? (
            <>
              <div className="result">
                <img src={record.processedUrl} alt="Processed result" />
              </div>
              <div className="actions">
                <button className="secondary" type="button" onClick={handleCopy}>
                  {copyState === "copied" ? "Copied!" : "Copy URL"}
                </button>
                <a className="secondary" href={record.processedUrl} download>
                  Download
                </a>
                <button className="danger" type="button" onClick={handleDelete} disabled={isProcessing}>
                  Delete
                </button>
              </div>
              <div className="metrics-row">
                <span>remove.bg: {formatMs(record.removeBgMs)}</span>
                <span>flip: {formatMs(record.flipMs)}</span>
                <span>upload: {formatMs(record.uploadMs)}</span>
              </div>
            </>
          ) : record ? (
            <div className="empty">
              <p>Processing your image…</p>
              <span>{processingStep ?? "We are preparing your result."}</span>
              {isProcessing && (
                <div className="progress inline">
                  <span style={{ transform: `scaleX(${progressValue})` }} />
                </div>
              )}
            </div>
          ) : (
            <div className="empty">
              <p>Your processed image will appear here.</p>
              <span>We will host it and give you a unique URL.</span>
            </div>
          )}
        </section>
      </main>

      <section className="info" id="motivation">
        <div className="info-card">
          <h2>Motivation</h2>
          <p>
            I started this site because I’ve used remove.bg constantly since high school as an avid
            photographer and editor. My parents never had the chance to travel outside their
            hometowns in small towns in China, so they wanted to give me and my brother an immersive,
            worldly experience. We took road trips and vacations often—from the islands of Hawaii to
            the beaches of Florida to the mountains of Virginia—so I was always taking photos and
            editing them to share on Instagram. For this site, I wanted to build a product for other
            passionate photographers and editors that streamlines their work: calm, fast, and
            obvious. Upload once, see the preview instantly, and never wonder what happens next.
          </p>
          <p>
            The goal is to make background removal feel as satisfying as hitting “send” on a great
            email—one clean action that gives you a shareable, ready‑to‑use result.
          </p>
        </div>
      </section>

      <section className="info" id="how">
        <div className="info-card">
          <h2>How we made it</h2>
          <p>
            We kept the product flow to a single screen and mirrored it in the experience: upload,
            wait a few seconds, then share. The interface shows each step in plain language, so
            users never feel lost or stuck.
          </p>
          <p>
            After the result appears, you can copy the link, download a clean PNG, or delete it to
            start fresh. It’s designed for fast, repeatable use without setup or training.
          </p>
        </div>
      </section>

      <section className="info" id="benefits">
        <div className="info-grid">
          <div className="info-card">
            <h2>Benefits</h2>
            <p>
              Single‑screen flow, clear progress, and zero setup. The process rail keeps your
              place, and the result is always hosted and ready to share.
            </p>
          </div>
          <div className="info-card">
            <h3>For creators</h3>
            <p>
              Clean PNGs with transparent backgrounds for slides, mockups, and social. Copy the URL
              into a doc or drop the file straight into your design tool.
            </p>
          </div>
          <div className="info-card">
            <h3>For teams</h3>
            <p>
              Consistent, shareable outputs with a single click to delete. Perfect for quick
              collaboration without clutter or manual file wrangling.
            </p>
          </div>
        </div>
      </section>

      <section className="info" id="gallery">
        <div className="info-card">
          <h2>All photos</h2>
          {records.length === 0 ? (
            <div className="empty-gallery">
              <div className="empty-orb" aria-hidden="true" />
              <p>No uploads yet. Your recent transformations will appear here.</p>
              <span>Try the sample image above to see a full end‑to‑end run.</span>
            </div>
          ) : (
            <div className="table">
              <div className="table-row header">
                <span>Preview</span>
                <span>Image</span>
                <span>Mode</span>
                <span>Created</span>
                <span>Result</span>
                <span>Action</span>
              </div>
              {records.filter((item) => item.status === "ready").map((item, index) => (
                <div className="table-row" key={item.id}>
                  <span>
                    {item.processedUrl ? (
                      <img className="thumb" src={item.processedUrl} alt={`Image ${index + 1}`} />
                    ) : (
                      "—"
                    )}
                  </span>
                  <span>{`Image ${index + 1}`}</span>
                  <span>{item.mode ?? "optimized"}</span>
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                  <span>
                    {item.processedUrl ? (
                      <a href={item.processedUrl} target="_blank" rel="noreferrer">
                        View
                      </a>
                    ) : (
                      "—"
                    )}
                  </span>
                  <span>
                    <div className="table-actions">
                      <button
                        className="table-action secondary"
                        type="button"
                        onClick={() => handleCopyFromGallery(item.id, item.processedUrl)}
                      >
                        {copiedId === item.id ? "Copied" : "Share"}
                      </button>
                      {item.processedUrl && (
                        <a className="table-action secondary" href={item.processedUrl} download>
                          Download
                        </a>
                      )}
                      <button
                        className="table-action danger"
                        type="button"
                        onClick={() => handleDeleteRecord(item.id)}
                        disabled={deletingId === item.id}
                      >
                        {deletingId === item.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="info" id="tools">
        <div className="info-card">
          <h2>Built with</h2>
          <p>
            Cloudinary for hosted images, remove.bg for background removal, TypeScript for the
            backend, React for the frontend, and Sharp for image processing.
          </p>
          <p>
            Made by Juli Huang. Supports JPG, PNG, AVIF, and WebP uploads, and adapts to phone and
            desktop screens.
          </p>
        </div>
      </section>
    </div>
  );
};

export default App;
