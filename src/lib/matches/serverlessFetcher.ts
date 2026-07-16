/**
 * 无数据库依赖的比赛获取器（供 Vercel serverless 环境使用）
 *
 * 本地开发时仍通过 Prisma/SQLite 查 match 表；
 * Vercel 上没有持久化 DB，直接使用 mock 数据。
 */
import { Match } from "../connectors/types";
import { mockLoLMatches, mockValorantMatches } from "./mockData";

export interface ICSFilters {
  games?: string[];
  leagues?: string[];
  teams?: string[];
  includeKeywords?: string[];
  excludeKeywords?: string[];
}

/**
 * 获取用于 ICS 生成的比赛数据，无需数据库
 */
export async function getMatchesForICS(filters: ICSFilters): Promise<Match[]> {
  const allMatches = [...mockLoLMatches, ...mockValorantMatches];
  const now = new Date();

  let matches = allMatches.filter((m) => {
    // 只保留未来和进行中的比赛
    return new Date(m.startTime).getTime() >= now.getTime() || m.status === "live";
  });

  // 游戏筛选
  if (filters.games && filters.games.length > 0) {
    matches = matches.filter((m) => filters.games!.includes(m.game));
  }

  // 赛事筛选
  if (filters.leagues && filters.leagues.length > 0) {
    const leagueSet = new Set(filters.leagues.map((l) => l.toLowerCase()));
    matches = matches.filter((m) => leagueSet.has(m.league.toLowerCase()));
  }

  // 战队筛选
  if (filters.teams && filters.teams.length > 0) {
    const teamSet = new Set(filters.teams.map((t) => t.toLowerCase()));
    matches = matches.filter(
      (m) =>
        teamSet.has(m.teamA.toLowerCase()) || teamSet.has(m.teamB.toLowerCase())
    );
  }

  // 关键词包含
  if (filters.includeKeywords && filters.includeKeywords.length > 0) {
    matches = matches.filter((m) => {
      const text = `${m.league} ${m.tournament} ${m.teamA} ${m.teamB} ${m.summary || ""}`.toLowerCase();
      return filters.includeKeywords!.some((kw) => text.includes(kw.toLowerCase()));
    });
  }

  // 关键词排除
  if (filters.excludeKeywords && filters.excludeKeywords.length > 0) {
    matches = matches.filter((m) => {
      const text = `${m.league} ${m.tournament} ${m.teamA} ${m.teamB} ${m.summary || ""}`.toLowerCase();
      return !filters.excludeKeywords!.some((kw) => text.includes(kw.toLowerCase()));
    });
  }

  // 按时间排序
  matches.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return matches;
}
