// Core image record shape.
export type ImageRecord = {
  id: string;
  status: "queued" | "processing" | "ready" | "failed";
  step: "queued" | "removing_background" | "flipping" | "uploading" | "done";
  // Optional URLs are filled once processing completes.
  originalUrl: string | null;
  processedUrl: string | null;
  originalPublicId: string | null;
  processedPublicId: string | null;
  hash: string | null;
  mode: "optimized" | "original";
  error: string | null;
  removeBgMs: number | null;
  flipMs: number | null;
  uploadMs: number | null;
  createdAt: string;
};
