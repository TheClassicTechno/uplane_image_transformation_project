// API entry point with async processing flow.
import "dotenv/config";
import cors from "cors";
import crypto from "crypto";
import express from "express";
import morgan from "morgan";
import multer from "multer";
import { performance } from "perf_hooks";
import sharp from "sharp";
import { nanoid } from "nanoid";
import { configureCloudinary, deleteByPublicId, uploadBuffer } from "./cloudinary";
import { initDb } from "./db";
import { removeBackground } from "./removeBg";
import { enqueue, getQueueDepth } from "./queue";
import {
  createRecord,
  getRecord,
  getRecordByHash,
  listRecords,
  removeRecord,
  updateRecord,
} from "./store";
import type { ImageRecord } from "./types";

export const app = express();
const port = Number(process.env.PORT ?? 3001);

if (process.env.NODE_ENV !== "test") {
  configureCloudinary();
  initDb();
}

// Supported upload formats.
const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? "*",
  })
);
app.use(morgan("tiny"));

// In-memory uploads keep the pipeline simple.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new Error("Unsupported file type"));
      return;
    }
    cb(null, true);
  },
});

// Liveness check for deployments.
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Gallery list for the "All photos" section.
app.get("/api/images", (req, res) => {
  const limit = Number(req.query.limit ?? 25);
  const cappedLimit = Number.isNaN(limit) ? 25 : Math.min(Math.max(limit, 1), 100);
  res.json({ items: listRecords(cappedLimit) });
});

// Track jobs that were deleted before completion.
const cancelledJobs = new Set<string>();

// Main processing pipeline for a single upload.
const processImageJob = async (
  record: ImageRecord,
  fileBuffer: Buffer,
  filename: string,
  mimeType: string
) => {
  const folder = "uplane-image-transformation";
  let originalPublicId: string | null = null;
  let processedPublicId: string | null = null;

  // Centralized failure update to keep state consistent.
  const markFailed = (message: string) => {
    updateRecord(record.id, {
      status: "failed",
      error: message,
      step: "done",
    });
  };

  const assertNotCancelled = () => {
    if (cancelledJobs.has(record.id)) {
      throw new Error("cancelled");
    }
  };

  try {
    // Step 1: background removal
    updateRecord(record.id, {
      status: "processing",
      step: "removing_background",
    });
    assertNotCancelled();

    const removeStart = performance.now();
    const preprocessed =
      record.mode === "optimized"
        ? await sharp(fileBuffer)
            .resize({ width: 1500, height: 1500, fit: "inside", withoutEnlargement: true })
            .toBuffer()
        : fileBuffer;
    const removedBuffer = await removeBackground(preprocessed, filename, mimeType);
    const removeEnd = performance.now();

    // Step 2: horizontal flip
    updateRecord(record.id, {
      step: "flipping",
      removeBgMs: Math.round(removeEnd - removeStart),
    });
    assertNotCancelled();

    const flipStart = performance.now();
    const processedBuffer = await sharp(removedBuffer).flop().png().toBuffer();
    const flipEnd = performance.now();

    // Step 3: upload original + processed outputs
    updateRecord(record.id, {
      step: "uploading",
      flipMs: Math.round(flipEnd - flipStart),
    });
    assertNotCancelled();

    const uploadStart = performance.now();
    const originalUpload = await uploadBuffer(fileBuffer, {
      folder,
      filename: `${record.id}-original`,
    });
    originalPublicId = originalUpload.publicId;

    const processedUpload = await uploadBuffer(processedBuffer, {
      folder,
      filename: `${record.id}-processed`,
      format: "png",
    });
    processedPublicId = processedUpload.publicId;
    const uploadEnd = performance.now();

    updateRecord(record.id, {
      status: "ready",
      step: "done",
      originalUrl: originalUpload.url,
      processedUrl: processedUpload.url,
      originalPublicId,
      processedPublicId,
      uploadMs: Math.round(uploadEnd - uploadStart),
    });

    console.log(
      JSON.stringify({
        event: "image_processed",
        id: record.id,
        removeBgMs: Math.round(removeEnd - removeStart),
        flipMs: Math.round(flipEnd - flipStart),
        uploadMs: Math.round(uploadEnd - uploadStart),
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    if (message === "cancelled") {
      return;
    }

    await Promise.allSettled(
      [originalPublicId, processedPublicId]
        .filter((publicId): publicId is string => Boolean(publicId))
        .map((publicId) => deleteByPublicId(publicId))
    );
    markFailed(message);
  }
};

// Upload endpoint: returns queued/ready record immediately.
app.post("/api/images", upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Missing image file" });
      return;
    }

    // Cache key avoids reprocessing the same image + mode.
    const mode = req.body?.mode === "original" ? "original" : "optimized";
    const hash = crypto
      .createHash("sha256")
      .update(req.file.buffer)
      .update(mode)
      .digest("hex");

    // Short-circuit if we already processed the exact file + mode.
    const cached = getRecordByHash(hash, mode);
    if (cached) {
      res.status(200).json({ ...cached, cached: true });
      return;
    }

    const id = nanoid(10);
    const filename = req.file.originalname || "upload";

    const record: ImageRecord = {
      id,
      status: "queued",
      step: "queued",
      originalUrl: "",
      processedUrl: "",
      originalPublicId: "",
      processedPublicId: "",
      hash,
      mode,
      error: null,
      removeBgMs: null,
      flipMs: null,
      uploadMs: null,
      createdAt: new Date().toISOString(),
    };

    createRecord(record);

    // Sync mode is used for tests and optional local debugging.
    const runSync = process.env.NODE_ENV === "test" || req.query.sync === "true";
    if (runSync) {
      await processImageJob(record, req.file.buffer, filename, req.file.mimetype);
      const updated = getRecord(id);
      if (updated?.status === "failed") {
        res.status(500).json(updated);
        return;
      }
      res.status(201).json(updated ?? record);
      return;
    }

    enqueue(() => processImageJob(record, req.file!.buffer, filename, req.file!.mimetype));
    res.status(202).json({ ...record, queueDepth: getQueueDepth() });
  } catch (error) {
    next(error);
  }
});

app.get("/api/images/:id", (req, res) => {
  const record = getRecord(req.params.id);
  if (!record) {
    res.status(404).json({ error: "Image not found" });
    return;
  }

  res.json(record);
});

app.delete("/api/images/:id", async (req, res, next) => {
  try {
    const record = getRecord(req.params.id);
    if (!record) {
      res.status(404).json({ error: "Image not found" });
      return;
    }

    cancelledJobs.add(record.id);

    await Promise.all([
      record.originalPublicId ? deleteByPublicId(record.originalPublicId) : Promise.resolve(),
      record.processedPublicId ? deleteByPublicId(record.processedPublicId) : Promise.resolve(),
    ]);

    removeRecord(record.id);
    res.json({ id: record.id, deleted: true });
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unexpected error";
  res.status(500).json({ error: message });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
  });
}
