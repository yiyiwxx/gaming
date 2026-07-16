import { PrismaClient } from "@prisma/client";
import { Match } from "../connectors/types";

const prisma = new PrismaClient();

/**
 * 查询赛程，支持多条件筛选
 */
export async function findMatches(params: {
  game?: string;
  league?: string;
  team?: string;
  source?: string;
  from?: string;
  to?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<Match[]> {
  const { game, league, team, source, from, to, status, limit = 500, offset = 0 } = params;

  const where: Record<string, unknown> = {};

  if (game) where.game = game;
  if (league) where.league = league;
  if (source) where.source = source;
  if (status) where.status = status;
  if (from) {
    where.startTime = { ...(where.startTime as object || {}), gte: from };
  }
  if (to) {
    where.startTime = { ...(where.startTime as object || {}), lte: to };
  }

  const dbMatches = await prisma.match.findMany({
    where: where as any,
    orderBy: { startTime: "desc" },
    take: limit,
    skip: offset,
  });

  let matches = mapDBMatches(dbMatches);

  // 如果指定了 team，在内存中过滤（SQLite JSON 查询限制）
  if (team) {
    const teamLower = team.toLowerCase();
    matches = matches.filter(
      (m) =>
        m.teamA.toLowerCase().includes(teamLower) ||
        m.teamB.toLowerCase().includes(teamLower)
    );
  }

  return matches;
}

/**
 * 获取未来比赛（用于 ICS 生成）
 */
export async function findUpcomingMatches(params: {
  game?: string;
  leagues?: string[];
  teams?: string[];
  includeKeywords?: string[];
  excludeKeywords?: string[];
}): Promise<Match[]> {
  const now = new Date().toISOString();
  const dbMatches = await prisma.match.findMany({
    where: {
      startTime: { gte: now },
      status: { in: ["scheduled", "live"] },
      ...(params.game ? { game: params.game } : {}),
    },
    orderBy: { startTime: "asc" },
  });

  let matches = mapDBMatches(dbMatches);

  // 应用筛选规则
  const { leagues, teams, includeKeywords, excludeKeywords } = params;

  if (leagues && leagues.length > 0) {
    const leagueSet = new Set(leagues.map((l) => l.toLowerCase()));
    matches = matches.filter((m) => leagueSet.has(m.league.toLowerCase()));
  }

  if (teams && teams.length > 0) {
    const teamSet = new Set(teams.map((t) => t.toLowerCase()));
    matches = matches.filter(
      (m) =>
        teamSet.has(m.teamA.toLowerCase()) || teamSet.has(m.teamB.toLowerCase())
    );
  }

  if (includeKeywords && includeKeywords.length > 0) {
    matches = matches.filter((m) => {
      const text = `${m.league} ${m.tournament} ${m.teamA} ${m.teamB} ${m.summary || ""}`.toLowerCase();
      return includeKeywords.some((kw) => text.includes(kw.toLowerCase()));
    });
  }

  if (excludeKeywords && excludeKeywords.length > 0) {
    matches = matches.filter((m) => {
      const text = `${m.league} ${m.tournament} ${m.teamA} ${m.teamB} ${m.summary || ""}`.toLowerCase();
      return !excludeKeywords.some((kw) => text.includes(kw.toLowerCase()));
    });
  }

  return matches;
}

/**
 * 批量写入比赛（upsert）
 */
export async function upsertMatches(matches: Match[]): Promise<number> {
  let count = 0;
  for (const match of matches) {
    await prisma.match.upsert({
      where: { id: match.id },
      create: {
        ...match,
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
        startTime: match.startTime,
        endTime: match.endTime,
        format: match.format,
        status: match.status,
        source: match.source,
        sourceUrl: match.sourceUrl,
        streamUrl: match.streamUrl,
        summary: match.summary,
        lastSyncedAt: new Date(match.lastSyncedAt),
      },
    });
    count++;
  }
  return count;
}

/**
 * 清理旧 mock 数据
 */
export async function deleteOldMockMatches(): Promise<number> {
  const result = await prisma.match.deleteMany({
    where: {
      source: "mock",
      startTime: { lt: new Date().toISOString() },
    },
  });
  return result.count;
}

/**
 * 按源统计赛事数量
 */
export async function countMatchesBySource(): Promise<Record<string, number>> {
  const matches = await prisma.match.findMany({
    select: { source: true },
  });
  const counts: Record<string, number> = {};
  for (const m of matches) {
    counts[m.source] = (counts[m.source] || 0) + 1;
  }
  return counts;
}

function mapDBMatches(
  dbMatches: Array<{
    id: string;
    game: string;
    gameName: string;
    league: string;
    tournament: string;
    stage: string | null;
    teamA: string;
    teamB: string;
    startTime: string;
    endTime: string | null;
    format: string | null;
    status: string;
    source: string;
    sourceUrl: string | null;
    streamUrl: string | null;
    summary: string | null;
    lastSyncedAt: Date;
  }>
): Match[] {
  return dbMatches.map((m) => ({
    id: m.id,
    game: m.game as Match["game"],
    gameName: m.gameName,
    league: m.league,
    tournament: m.tournament,
    stage: m.stage || undefined,
    teamA: m.teamA,
    teamB: m.teamB,
    startTime: m.startTime,
    endTime: m.endTime || undefined,
    format: m.format || undefined,
    status: m.status as Match["status"],
    source: m.source,
    sourceUrl: m.sourceUrl || undefined,
    streamUrl: m.streamUrl || undefined,
    summary: m.summary || undefined,
    lastSyncedAt: m.lastSyncedAt.toISOString(),
  }));
}
