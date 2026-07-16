import Database from "better-sqlite3";
import path from "node:path";

export function sqlitePathFromDatabaseUrl(databaseUrl = process.env.DATABASE_URL || "file:./prisma/dev.db") {
  if (!databaseUrl.startsWith("file:")) {
    throw new Error("Local MVP expects a SQLite DATABASE_URL starting with file:.");
  }

  const rawPath = databaseUrl.replace(/^file:/, "");
  return path.resolve(process.cwd(), rawPath);
}

export function ensureSqliteSchema() {
  const dbPath = sqlitePathFromDatabaseUrl();
  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS "matches" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "game" TEXT NOT NULL,
      "game_name" TEXT NOT NULL,
      "league" TEXT NOT NULL,
      "tournament" TEXT NOT NULL,
      "stage" TEXT,
      "team_a" TEXT NOT NULL,
      "team_b" TEXT NOT NULL,
      "start_time" DATETIME NOT NULL,
      "end_time" DATETIME,
      "format" TEXT,
      "status" TEXT NOT NULL,
      "source" TEXT NOT NULL,
      "source_url" TEXT,
      "stream_url" TEXT,
      "summary" TEXT,
      "hash" TEXT NOT NULL,
      "last_synced_at" DATETIME NOT NULL,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "subscriptions" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "games" TEXT NOT NULL,
      "leagues" TEXT NOT NULL,
      "teams" TEXT NOT NULL,
      "timezone" TEXT NOT NULL,
      "reminder_minutes" INTEGER NOT NULL,
      "include_keywords" TEXT NOT NULL,
      "exclude_keywords" TEXT NOT NULL,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "sync_logs" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "source" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "message" TEXT,
      "synced_count" INTEGER NOT NULL,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS "matches_game_idx" ON "matches"("game");
    CREATE INDEX IF NOT EXISTS "matches_league_idx" ON "matches"("league");
    CREATE INDEX IF NOT EXISTS "matches_start_time_idx" ON "matches"("start_time");
  `);

  db.close();
  return dbPath;
}
