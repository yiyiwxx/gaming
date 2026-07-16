import { Match } from "../connectors/types";
import { Subscription } from "../connectors/types";
import { TEAM_NAME_MAP } from "../matches/mockData";

/**
 * 标准化战队名称
 * 支持简称 → 标准名称映射
 */
export function normalizeTeamName(name: string): string {
  const lower = name.trim().toLowerCase();
  return TEAM_NAME_MAP[lower] || name.trim();
}

/**
 * 标准化输入的战队列表
 */
export function normalizeTeams(teams: string[]): string[] {
  return teams.map(normalizeTeamName).filter(Boolean);
}

/**
 * 判断一场比赛是否匹配订阅规则
 */
export function matchSubscriptionRules(
  match: Match,
  subscription: Subscription
): boolean {
  // 游戏必须匹配
  const games = subscription.games || [];
  if (games.length > 0 && !games.includes(match.game)) {
    return false;
  }

  // excludeKeywords 优先级最高
  const excludeKeywords = subscription.excludeKeywords || [];
  if (excludeKeywords.length > 0) {
    const text = `${match.league} ${match.tournament} ${match.teamA} ${match.teamB} ${match.summary || ""}`.toLowerCase();
    if (excludeKeywords.some((kw) => text.includes(kw.toLowerCase()))) {
      return false;
    }
  }

  // 如果没有指定赛事和战队，匹配所有比赛（只受游戏和排除关键词限制）
  const leagues = subscription.leagues || [];
  const teams = subscription.teams || [];
  const includeKeywords = subscription.includeKeywords || [];

  const hasLeagueOrTeam = leagues.length > 0 || teams.length > 0 || includeKeywords.length > 0;

  if (!hasLeagueOrTeam) {
    return true;
  }

  // 赛事或战队命中任一即可
  if (leagues.length > 0) {
    const leagueLower = match.league.toLowerCase();
    if (leagues.some((l) => l.toLowerCase() === leagueLower)) {
      return true;
    }
  }

  if (teams.length > 0) {
    const normalizedTeams = normalizeTeams(teams);
    const teamALower = match.teamA.toLowerCase();
    const teamBLower = match.teamB.toLowerCase();
    if (
      normalizedTeams.some(
        (t) => t.toLowerCase() === teamALower || t.toLowerCase() === teamBLower
      )
    ) {
      return true;
    }
  }

  if (includeKeywords.length > 0) {
    const text = `${match.league} ${match.tournament} ${match.teamA} ${match.teamB} ${match.summary || ""}`.toLowerCase();
    if (includeKeywords.some((kw) => text.includes(kw.toLowerCase()))) {
      return true;
    }
  }

  return false;
}

/**
 * 从大量比赛中筛选匹配的
 */
export function filterMatchesBySubscription(
  matches: Match[],
  subscription: Subscription
): Match[] {
  return matches.filter((m) => matchSubscriptionRules(m, subscription));
}
