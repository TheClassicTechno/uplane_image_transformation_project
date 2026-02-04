// SQLite-backed image record store.
import { getDb } from "./db";
import type { ImageRecord } from "./types";

const columnMap: Record<keyof ImageRecord, string> = {
  id: "id",
  status: "status",
  step: "step",
  originalUrl: "original_url",
  processedUrl: "processed_url",
  originalPublicId: "original_public_id",
  processedPublicId: "processed_public_id",
  hash: "hash",
  mode: "mode",
  error: "error",
  removeBgMs: "remove_bg_ms",
  flipMs: "flip_ms",
  uploadMs: "upload_ms",
  createdAt: "created_at",
};

export const createRecord = (record: ImageRecord): void => {
  const db = getDb();
  // Insert a full record for a new job.
  const statement = db.prepare(`
    INSERT INTO images (
      id,
      status,
      step,
      original_url,
      processed_url,
      original_public_id,
      processed_public_id,
      hash,
      mode,
      error,
      remove_bg_ms,
      flip_ms,
      upload_ms,
      created_at
    ) VALUES (
      @id,
      @status,
      @step,
      @originalUrl,
      @processedUrl,
      @originalPublicId,
      @processedPublicId,
      @hash,
      @mode,
      @error,
      @removeBgMs,
      @flipMs,
      @uploadMs,
      @createdAt
    )
  `);

  statement.run(record);
};

export const updateRecord = (id: string, updates: Partial<ImageRecord>): void => {
  const db = getDb();
  const entries = Object.entries(updates).filter(([key]) => key !== "id");
  if (entries.length === 0) {
    return;
  }

  // Build a dynamic UPDATE for partial fields.
  const setClause = entries
    .map(([key]) => `${columnMap[key as keyof ImageRecord]} = @${key}`)
    .join(", ");

  db.prepare(`UPDATE images SET ${setClause} WHERE id = @id`).run({ id, ...updates });
};

export const getRecord = (id: string): ImageRecord | undefined => {
  const db = getDb();
  // Fetch a single job by id.
  const row = db
    .prepare(
      `
      SELECT
        id,
        status,
        step,
        original_url as originalUrl,
        processed_url as processedUrl,
        original_public_id as originalPublicId,
        processed_public_id as processedPublicId,
        hash,
        mode,
        error,
        remove_bg_ms as removeBgMs,
        flip_ms as flipMs,
        upload_ms as uploadMs,
        created_at as createdAt
      FROM images
      WHERE id = ?
    `
    )
    .get(id) as ImageRecord | undefined;

  return row;
};

export const getRecordByHash = (
  hash: string,
  mode: ImageRecord["mode"]
): ImageRecord | undefined => {
  const db = getDb();
  // Cache lookup for completed runs only.
  const row = db
    .prepare(
      `
      SELECT
        id,
        status,
        step,
        original_url as originalUrl,
        processed_url as processedUrl,
        original_public_id as originalPublicId,
        processed_public_id as processedPublicId,
        hash,
        mode,
        error,
        remove_bg_ms as removeBgMs,
        flip_ms as flipMs,
        upload_ms as uploadMs,
        created_at as createdAt
      FROM images
      WHERE hash = ? AND mode = ? AND status = 'ready'
      LIMIT 1
    `
    )
    .get(hash, mode) as ImageRecord | undefined;

  return row;
};

export const listRecords = (limit = 25): ImageRecord[] => {
  const db = getDb();
  // List recent successful records for the gallery.
  const rows = db
    .prepare(
      `
      SELECT
        id,
        status,
        step,
        original_url as originalUrl,
        processed_url as processedUrl,
        original_public_id as originalPublicId,
        processed_public_id as processedPublicId,
        hash,
        mode,
        error,
        remove_bg_ms as removeBgMs,
        flip_ms as flipMs,
        upload_ms as uploadMs,
        created_at as createdAt
      FROM images
      WHERE status = 'ready'
      ORDER BY created_at DESC
      LIMIT ?
    `
    )
    .all(limit) as ImageRecord[];

  return rows;
};

export const removeRecord = (id: string): void => {
  const db = getDb();
  db.prepare("DELETE FROM images WHERE id = ?").run(id);
};
