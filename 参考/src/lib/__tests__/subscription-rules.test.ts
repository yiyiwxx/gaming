import { describe, expect, it } from "vitest";

import {
  matchSubscriptionRule,
  normalizeSubscriptionRule,
} from "@/lib/subscriptions/rules";
import type { Match } from "@/lib/matches/schema";

const baseMatch: Match = {
  id: "lol-lpl-blg-tes-2026-07-10",
  game: "lol",
  gameName: "League of Legends",
  league: "LPL",
  tournament: "LPL Summer 2026",
  stage: "Regular Season",
  teamA: "BLG",
  teamB: "TES",
  startTime: "2026-07-10T11:00:00.000Z",
  endTime: "2026-07-10T13:30:00.000Z",
  format: "BO3",
  status: "scheduled",
  source: "mock",
  sourceUrl: "https://example.com/lpl/blg-vs-tes",
  streamUrl: "https://live.example.com/lpl",
  summary: "LPL 焦点战，BLG 与 TES 的强强对话。",
  lastSyncedAt: "2026-07-09T09:00:00.000Z",
};

describe("subscription rules", () => {
  it("normalizes empty subscription fields to MVP defaults", () => {
    const rule = normalizeSubscriptionRule({});

    expect(rule).toEqual({
      name: "我的电竞赛事订阅",
      games: [],
      leagues: [],
      teams: [],
      timezone: "Asia/Shanghai",
      reminderMinutes: 60,
      includeKeywords: [],
      excludeKeywords: [],
    });
  });

  it("matches when either a selected league or selected team matches", () => {
    const rule = normalizeSubscriptionRule({
      games: ["lol", "valorant"],
      leagues: ["VCT CN"],
      teams: ["T1", "BLG"],
    });

    expect(matchSubscriptionRule(baseMatch, rule)).toBe(true);
    expect(
      matchSubscriptionRule(
        { ...baseMatch, id: "valorant-vct-cn", game: "valorant", league: "VCT CN", teamA: "Wolves", teamB: "EDG" },
        rule,
      ),
    ).toBe(true);
  });

  it("uses exclude keywords before include, league, and team matches", () => {
    const rule = normalizeSubscriptionRule({
      leagues: ["LPL"],
      teams: ["BLG"],
      includeKeywords: ["焦点"],
      excludeKeywords: ["TES"],
    });

    expect(matchSubscriptionRule(baseMatch, rule)).toBe(false);
  });

  it("keeps preview-like filters strict for selected games", () => {
    const rule = normalizeSubscriptionRule({
      games: ["valorant"],
      teams: ["BLG"],
    });

    expect(matchSubscriptionRule(baseMatch, rule)).toBe(false);
  });
});
