import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EsportsConnector } from "@/lib/connectors/types";
import type { Match } from "@/lib/matches/schema";

const mocks = vi.hoisted(() => ({
  deleteMockMatchesForGame: vi.fn(),
  syncLogCreate: vi.fn(),
  upsertMatches: vi.fn(async (matches: Match[]) => matches.length),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    syncLog: {
      create: mocks.syncLogCreate,
    },
  },
}));

vi.mock("@/lib/matches/repository", () => ({
  deleteMockMatchesForGame: mocks.deleteMockMatchesForGame,
  upsertMatches: mocks.upsertMatches,
}));

import { syncMatches } from "@/lib/sync/syncMatches";

function makeMatch(id: string, source: string): Match {
  return {
    id,
    game: "valorant",
    gameName: "VALORANT",
    league: "VCT CN",
    tournament: "VCT 2026: China Stage 2",
    teamA: "Bilibili Gaming",
    teamB: "Dragon Ranger Gaming",
    startTime: "2026-07-09T12:00:00.000Z",
    format: "BO3",
    status: "scheduled",
    source,
    sourceUrl: "https://www.vlr.gg/701026/example",
    lastSyncedAt: "2026-07-09T10:00:00.000Z",
  };
}

function makeConnector(matches: Match[]): EsportsConnector {
  return {
    name: "valorantConnector",
    game: "valorant",
    fetchMatches: async () => matches,
    fetchTeams: async () => [],
    fetchLeagues: async () => [],
  };
}

describe("syncMatches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears stale mock matches for a game when real source matches sync", async () => {
    await syncMatches([makeConnector([makeMatch("real-vlr-match", "vlr.gg")])]);

    expect(mocks.deleteMockMatchesForGame).toHaveBeenCalledWith("valorant");
    expect(mocks.upsertMatches).toHaveBeenCalledWith([makeMatch("real-vlr-match", "vlr.gg")]);
  });

  it("keeps mock fallback matches when no real source matches are available", async () => {
    await syncMatches([makeConnector([makeMatch("mock-valorant-match", "mock:valorant")])]);

    expect(mocks.deleteMockMatchesForGame).not.toHaveBeenCalled();
    expect(mocks.upsertMatches).toHaveBeenCalledWith([
      makeMatch("mock-valorant-match", "mock:valorant"),
    ]);
  });
});
