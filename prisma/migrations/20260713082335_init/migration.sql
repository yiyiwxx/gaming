-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "game" TEXT NOT NULL,
    "gameName" TEXT NOT NULL,
    "league" TEXT NOT NULL,
    "tournament" TEXT NOT NULL,
    "stage" TEXT,
    "teamA" TEXT NOT NULL,
    "teamB" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT,
    "format" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "streamUrl" TEXT,
    "summary" TEXT,
    "lastSyncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "games" TEXT NOT NULL DEFAULT '[]',
    "leagues" TEXT NOT NULL DEFAULT '[]',
    "teams" TEXT NOT NULL DEFAULT '[]',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Shanghai',
    "reminderMinutes" INTEGER NOT NULL DEFAULT 60,
    "includeKeywords" TEXT NOT NULL DEFAULT '[]',
    "excludeKeywords" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Match_game_idx" ON "Match"("game");

-- CreateIndex
CREATE INDEX "Match_league_idx" ON "Match"("league");

-- CreateIndex
CREATE INDEX "Match_startTime_idx" ON "Match"("startTime");

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");
