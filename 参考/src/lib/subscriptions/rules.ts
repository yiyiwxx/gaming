import { z } from "zod";

import type { Game, Match } from "@/lib/matches/schema";

export const subscriptionRuleInputSchema = z.object({
  name: z.string().trim().optional(),
  games: z.array(z.enum(["lol", "valorant"])).optional(),
  leagues: z.array(z.string()).optional(),
  teams: z.array(z.string()).optional(),
  timezone: z.string().trim().optional(),
  reminderMinutes: z.number().int().positive().optional(),
  includeKeywords: z.array(z.string()).optional(),
  excludeKeywords: z.array(z.string()).optional(),
});

export const subscriptionRuleSchema = z.object({
  name: z.string(),
  games: z.array(z.enum(["lol", "valorant"])),
  leagues: z.array(z.string()),
  teams: z.array(z.string()),
  timezone: z.string(),
  reminderMinutes: z.number().int().positive(),
  includeKeywords: z.array(z.string()),
  excludeKeywords: z.array(z.string()),
});

export type SubscriptionRuleInput = z.infer<typeof subscriptionRuleInputSchema>;
export type SubscriptionRule = z.infer<typeof subscriptionRuleSchema>;

function uniqueClean(values: string[] | undefined, transform = (value: string) => value) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => transform(value.trim()))
        .filter(Boolean),
    ),
  );
}

export function normalizeSubscriptionRule(input: SubscriptionRuleInput): SubscriptionRule {
  const parsed = subscriptionRuleInputSchema.parse(input);

  return {
    name: parsed.name?.trim() || "我的电竞赛事订阅",
    games: Array.from(new Set(parsed.games ?? [])) as Game[],
    leagues: uniqueClean(parsed.leagues),
    teams: uniqueClean(parsed.teams, (value) => value.toUpperCase()),
    timezone: parsed.timezone?.trim() || "Asia/Shanghai",
    reminderMinutes: parsed.reminderMinutes ?? 60,
    includeKeywords: uniqueClean(parsed.includeKeywords),
    excludeKeywords: uniqueClean(parsed.excludeKeywords),
  };
}

function includesText(haystack: string, needle: string) {
  return haystack.toLocaleLowerCase().includes(needle.toLocaleLowerCase());
}

function matchLeague(match: Match, league: string) {
  return (
    match.league.toLocaleLowerCase() === league.toLocaleLowerCase() ||
    match.tournament.toLocaleLowerCase().includes(league.toLocaleLowerCase())
  );
}

function matchTeam(match: Match, team: string) {
  const normalized = team.toLocaleLowerCase();
  const candidates = [
    match.teamA,
    match.teamB,
    ...teamAliases(match.teamA),
    ...teamAliases(match.teamB),
  ].map((value) => value.toLocaleLowerCase());

  return candidates.includes(normalized);
}

function teamAliases(teamName: string) {
  const aliases: Record<string, string[]> = {
    "bilibili gaming": ["BLG"],
    "top esports": ["TES"],
    "edward gaming": ["EDG"],
    "dragon ranger gaming": ["DRG"],
    "paper rex": ["PRX"],
    "wolves esports": ["WOLVES", "WOL"],
    "gen.g": ["GEN"],
    "gen.g esports": ["GEN"],
  };

  return aliases[teamName.toLocaleLowerCase()] ?? [];
}

function searchableText(match: Match) {
  return [
    match.gameName,
    match.league,
    match.tournament,
    match.stage,
    match.teamA,
    match.teamB,
    match.format,
    match.summary,
  ]
    .filter(Boolean)
    .join(" ");
}

export function matchSubscriptionRule(match: Match, rule: SubscriptionRule) {
  if (rule.games.length > 0 && !rule.games.includes(match.game)) {
    return false;
  }

  const searchText = searchableText(match);

  if (rule.excludeKeywords.some((keyword) => includesText(searchText, keyword))) {
    return false;
  }

  if (
    rule.includeKeywords.length > 0 &&
    !rule.includeKeywords.some((keyword) => includesText(searchText, keyword))
  ) {
    return false;
  }

  const hasLeagueOrTeamRule = rule.leagues.length > 0 || rule.teams.length > 0;
  if (!hasLeagueOrTeamRule) {
    return true;
  }

  return (
    rule.leagues.some((league) => matchLeague(match, league)) ||
    rule.teams.some((team) => matchTeam(match, team))
  );
}
