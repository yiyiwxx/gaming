/**
 * 无数据库依赖的比赛获取器（供 Vercel serverless 环境使用）
 *
 * 策略：优先调用真实数据源（带超时），失败则 fallback 到本地 mock 数据。
 */
import { Match } from "../connectors/types";
import { mockLoLMatches, mockValorantMatches, mockHoKMatches } from "./mockData";

export interface ICSFilters {
  games?: string[];
  leagues?: string[];
  teams?: string[];
  includeKeywords?: string[];
  excludeKeywords?: string[];
}

/**
 * 获取用于 ICS 生成的比赛数据，无需数据库
 * 优先调真实源，失败 fallback 到 mock
 */
export async function getMatchesForICS(filters: ICSFilters): Promise<Match[]> {
  const games = filters.games || [];
  const allMatches: Match[] = [];
  const promises: Promise<void>[] = [];

  // 根据选择的游戏并发拉取对应数据源
  if (games.length === 0 || games.includes("lol")) {
    promises.push(fetchLoL(allMatches));
  }
  if (games.length === 0 || games.includes("valorant")) {
    promises.push(fetchValorant(allMatches));
  }
  if (games.length === 0 || games.includes("hok")) {
    promises.push(fetchHoK(allMatches));
  }

  // 并发拉取（每个源有独立超时）
  await Promise.allSettled(promises);

  // 如果真实源全部失败，全部 fallback 到 mock
  if (allMatches.length === 0) {
    allMatches.push(...mockLoLMatches, ...mockValorantMatches, ...mockHoKMatches);
  }

  const now = new Date();

  let matches = allMatches.filter((m) => {
    return new Date(m.startTime).getTime() >= now.getTime() || m.status === "live";
  });

  // 游戏筛选
  if (games.length > 0) {
    matches = matches.filter((m) => games.includes(m.game));
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

  matches.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return matches;
}

/** 带超时的 promise */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    promise.then(
      (r) => { clearTimeout(timer); resolve(r); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

async function fetchLoL(collector: Match[]) {
  try {
    const { getLoLMatches } = await import("../connectors/lolConnector");
    const matches = await withTimeout(getLoLMatches(), 8000, "LoL");
    collector.push(...matches);
    console.log(`[ServerlessFetcher] LoL real: ${matches.length} matches`);
  } catch (e) {
    console.warn("[ServerlessFetcher] LoL source failed, using mock fallback");
    collector.push(...mockLoLMatches);
  }
}

async function fetchValorant(collector: Match[]) {
  try {
    const { getValorantMatches } = await import("../connectors/valorantConnector");
    const matches = await withTimeout(getValorantMatches(), 8000, "Valorant");
    collector.push(...matches);
    console.log(`[ServerlessFetcher] Valorant real: ${matches.length} matches`);
  } catch (e) {
    console.warn("[ServerlessFetcher] Valorant source failed, using mock fallback");
    collector.push(...mockValorantMatches);
  }
}

async function fetchHoK(collector: Match[]) {
  try {
    const { getKPLMatches } = await import("../connectors/kplConnector");
    const matches = await withTimeout(getKPLMatches(), 8000, "KPL");
    collector.push(...matches);
    console.log(`[ServerlessFetcher] KPL real: ${matches.length} matches`);
  } catch (e) {
    console.warn("[ServerlessFetcher] KPL source failed, using mock fallback");
    collector.push(...mockHoKMatches);
  }
}
