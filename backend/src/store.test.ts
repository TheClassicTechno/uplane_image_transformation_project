// Store behavior tests.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { createRecord, getRecord, getRecordByHash, removeRecord, updateRecord } from "./store";
import { resetDb } from "./db";

const createTempDbPath = (): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "image-transform-"));
  return path.join(dir, "test.db");
};

describe("store", () => {
  let dbPath: string;

  beforeEach(() => {
    // Isolate each test with its own DB file.
    dbPath = createTempDbPath();
    process.env.DATABASE_PATH = dbPath;
    resetDb();
  });

  afterEach(() => {
    resetDb();
    if (fs.existsSync(dbPath)) {
      fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
    }
  });

  it("persists and retrieves an image record", () => {
    createRecord({
      id: "img_1",
      status: "ready",
      step: "done",
      originalUrl: "https://example.com/original.png",
      processedUrl: "https://example.com/processed.png",
      originalPublicId: "orig_1",
      processedPublicId: "proc_1",
      hash: "hash_1",
      mode: "optimized",
      error: null,
      removeBgMs: 10,
      flipMs: 2,
      uploadMs: 5,
      createdAt: new Date().toISOString(),
    });

    const record = getRecord("img_1");

    expect(record).toBeDefined();
    expect(record?.processedUrl).toBe("https://example.com/processed.png");
  });

  it("removes an image record", () => {
    createRecord({
      id: "img_2",
      status: "ready",
      step: "done",
      originalUrl: "https://example.com/original.png",
      processedUrl: "https://example.com/processed.png",
      originalPublicId: "orig_2",
      processedPublicId: "proc_2",
      hash: "hash_2",
      mode: "optimized",
      error: null,
      removeBgMs: 12,
      flipMs: 3,
      uploadMs: 6,
      createdAt: new Date().toISOString(),
    });

    removeRecord("img_2");
    const record = getRecord("img_2");

    expect(record).toBeUndefined();
  });

  it("returns undefined for missing records", () => {
    const record = getRecord("missing");
    expect(record).toBeUndefined();
  });

  it("overwrites existing record with same id", () => {
    createRecord({
      id: "img_3",
      status: "ready",
      step: "done",
      originalUrl: "https://example.com/original.png",
      processedUrl: "https://example.com/processed.png",
      originalPublicId: "orig_3",
      processedPublicId: "proc_3",
      hash: "hash_3",
      mode: "optimized",
      error: null,
      removeBgMs: 10,
      flipMs: 2,
      uploadMs: 5,
      createdAt: new Date().toISOString(),
    });

    updateRecord("img_3", {
      originalUrl: "https://example.com/original-v2.png",
      processedUrl: "https://example.com/processed-v2.png",
      originalPublicId: "orig_3b",
      processedPublicId: "proc_3b",
    });

    const record = getRecord("img_3");
    expect(record?.originalUrl).toBe("https://example.com/original-v2.png");
    expect(record?.processedPublicId).toBe("proc_3b");
  });

  it("removing a missing record does not throw", () => {
    expect(() => removeRecord("missing")).not.toThrow();
  });

  it("persists multiple records independently", () => {
    createRecord({
      id: "img_a",
      status: "ready",
      step: "done",
      originalUrl: "https://example.com/original-a.png",
      processedUrl: "https://example.com/processed-a.png",
      originalPublicId: "orig_a",
      processedPublicId: "proc_a",
      hash: "hash_a",
      mode: "optimized",
      error: null,
      removeBgMs: 10,
      flipMs: 2,
      uploadMs: 5,
      createdAt: new Date().toISOString(),
    });
    createRecord({
      id: "img_b",
      status: "ready",
      step: "done",
      originalUrl: "https://example.com/original-b.png",
      processedUrl: "https://example.com/processed-b.png",
      originalPublicId: "orig_b",
      processedPublicId: "proc_b",
      hash: "hash_b",
      mode: "optimized",
      error: null,
      removeBgMs: 10,
      flipMs: 2,
      uploadMs: 5,
      createdAt: new Date().toISOString(),
    });

    expect(getRecord("img_a")?.processedUrl).toBe("https://example.com/processed-a.png");
    expect(getRecord("img_b")?.processedUrl).toBe("https://example.com/processed-b.png");
  });

  it("finds a cached record by hash and mode", () => {
    createRecord({
      id: "img_cache",
      status: "ready",
      step: "done",
      originalUrl: "https://example.com/original.png",
      processedUrl: "https://example.com/processed.png",
      originalPublicId: "orig_cache",
      processedPublicId: "proc_cache",
      hash: "hash_cache",
      mode: "optimized",
      error: null,
      removeBgMs: 10,
      flipMs: 2,
      uploadMs: 5,
      createdAt: new Date().toISOString(),
    });

    const record = getRecordByHash("hash_cache", "optimized");
    expect(record?.id).toBe("img_cache");
  });
});
