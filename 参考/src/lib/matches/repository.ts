import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

import { hashMatch } from "./hash";
import { matchSchema, type Match, type MatchesQuery } from "./schema";

type DbMatch = {
  id: string;
  game: string;
  gameName: string;
  league: string;
  tournament: string;
  stage: string | null;
  teamA: string;
  teamB: string;
  startTime: Date;
  endTime: Date | null;
  format: string | null;
  status: string;
  source: string;
  sourceUrl: string | null;
  streamUrl: string | null;
  summary: string | null;
  lastSyncedAt: Date;
};

export function toMatch(record: DbMatch): Match {
  return matchSchema.parse({
    id: record.id,
    game: record.game,
    gameName: record.gameName,
    league: record.league,
    tournament: record.tournament,
    stage: record.stage ?? undefined,
    teamA: record.teamA,
    teamB: record.teamB,
    startTime: record.startTime.toISOString(),
    endTime: record.endTime?.toISOString(),
    format: record.format ?? undefined,
    status: record.status,
    source: record.source,
    sourceUrl: record.sourceUrl ?? undefined,
    streamUrl: record.streamUrl ?? undefined,
    summary: record.summary ?? undefined,
    lastSyncedAt: record.lastSyncedAt.toISOString(),
  });
}

export async function listMatches(query: MatchesQuery = {}) {
  const where: Prisma.MatchWhereInput = {};

  if (query.game) {
    where.game = query.game;
  }
  if (query.league) {
    where.OR = [
      ...(where.OR ?? []),
      { league: { contains: query.league } },
      { tournament: { contains: query.league } },
    ];
  }
  if (query.team) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      {
        OR: [
          { teamA: { contains: query.team } },
          { teamB: { contains: query.team } },
        ],
      },
    ];
  }
  if (query.from || query.to) {
    where.startTime = {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lte: new Date(query.to) } : {}),
    };
  }

  const records = await prisma.match.findMany({
    where,
    orderBy: { startTime: "asc" },
  });

  return records.map(toMatch);
}

export async function upsertMatches(matches: Match[]) {
  const validMatches = matches.map((match) => matchSchema.parse(match));

  for (const match of validMatches) {
    await prisma.match.upsert({
      where: { id: match.id },
      create: {
        id: match.id,
        game: match.game,
        gameName: match.gameName,
        league: match.league,
        tournament: match.tournament,
        stage: match.stage,
        teamA: match.teamA,
        teamB: match.teamB,
        startTime: new Date(match.startTime),
        endTime: match.endTime ? new Date(match.endTime) : null,
        format: match.format,
        status: match.status,
        source: match.source,
        sourceUrl: match.sourceUrl,
        streamUrl: match.streamUrl,
        summary: match.summary,
        hash: hashMatch(match),
        lastSyncedAt: new Date(match.lastSyncedAt),
      },
      update: {
        game: match.game,
        gameName: match.gameName,
        league: match.league,
        tournament: match.tournament,
        stage: match.stage,
        teamA: match.teamA,
        teamB: match.teamB,
        startTime: new Date(match.startTime),
        endTime: match.endTime ? new Date(match.endTime) : null,
        format: match.format,
        status: match.status,
        source: match.source,
        sourceUrl: match.sourceUrl,
        streamUrl: match.streamUrl,
        summary: match.summary,
        hash: hashMatch(match),
        lastSyncedAt: new Date(match.lastSyncedAt),
      },
    });
  }

  return validMatches.length;
}

export async function deleteMockMatchesForGame(game: Match["game"]) {
  const result = await prisma.match.deleteMany({
    where: {
      game,
      source: {
        startsWith: "mock",
      },
    },
  });

  return result.count;
}
