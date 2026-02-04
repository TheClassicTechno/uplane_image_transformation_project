// DB initialization and lightweight migrations.
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

let db: Database.Database | null = null;

// Resolve DB path from env or default location.
const getDatabasePath = (): string => {
  return (
    process.env.DATABASE_PATH ??
    path.join(process.cwd(), "data", "image-transform.db")
  );
};

export const initDb = (): Database.Database => {
  if (db) {
    return db;
  }

  const databasePath = getDatabasePath();
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  db = new Database(databasePath);
  db.pragma("journal_mode = WAL");
  // WAL keeps writes fast for small workloads.
  // Base schema (migrations below keep older DBs compatible).
  db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      step TEXT NOT NULL,
      original_url TEXT NOT NULL,
      processed_url TEXT NOT NULL,
      original_public_id TEXT NOT NULL,
      processed_public_id TEXT NOT NULL,
      hash TEXT,
      mode TEXT,
      error TEXT,
      remove_bg_ms INTEGER,
      flip_ms INTEGER,
      upload_ms INTEGER,
      created_at TEXT NOT NULL
    )
  `);

  // Lightweight migration for existing DBs.
  const columns = db.prepare("PRAGMA table_info(images)").all() as { name: string }[];
  const columnNames = new Set(columns.map((column) => column.name));
  const ensureColumn = (name: string, type: string, defaultValue?: string) => {
    if (columnNames.has(name)) {
      return;
    }
    const defaultClause = defaultValue ? ` DEFAULT ${defaultValue}` : "";
    db?.exec(`ALTER TABLE images ADD COLUMN ${name} ${type}${defaultClause}`);
  };

  ensureColumn("step", "TEXT", "'queued'");
  ensureColumn("hash", "TEXT");
  ensureColumn("mode", "TEXT");
  ensureColumn("error", "TEXT");
  ensureColumn("remove_bg_ms", "INTEGER");
  ensureColumn("flip_ms", "INTEGER");
  ensureColumn("upload_ms", "INTEGER");

  return db;
};

export const getDb = (): Database.Database => {
  return initDb();
};

export const resetDb = (): void => {
  // Test helper to reset the singleton.
  if (db) {
    db.close();
    db = null;
  }
};
