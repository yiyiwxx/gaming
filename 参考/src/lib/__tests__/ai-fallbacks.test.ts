import { describe, expect, it } from "vitest";

import {
  parseSubscriptionFallback,
  subscriptionParseSystemPrompt,
} from "@/lib/ai/parseSubscription";
import { summarizeMatchFallback, summarySystemPrompt } from "@/lib/ai/summarizeMatch";
import type { Match } from "@/lib/matches/schema";

describe("AI fallbacks and prompts", () => {
  it("extracts teams, VCT CN, timezone, and one-day reminder from Chinese text", () => {
    const parsed = parseSubscriptionFallback(
      "我只看 BLG、TES、T1 和所有 VCT CN 的比赛，提前一天提醒我，时间用北京时间。",
    );

    expect(parsed).toEqual({
      games: ["lol", "valorant"],
      leagues: ["VCT CN"],
      teams: ["BLG", "TES", "T1"],
      timezone: "Asia/Shanghai",
      reminderMinutes: 1440,
      includeKeywords: [],
      excludeKeywords: [],
    });
  });

  it("keeps prompts strict about JSON and non-fabrication", () => {
    expect(subscriptionParseSystemPrompt).toContain("合法 JSON");
    expect(subscriptionParseSystemPrompt).toContain("不要随意编造");
    expect(summarySystemPrompt).toContain("30-60 个中文字符");
    expect(summarySystemPrompt).toContain("不要预测");
  });

  it("creates a short non-predictive Chinese match summary without an API key", () => {
    const match: Match = {
      id: "valorant-vct-cn-edg-wolves",
      game: "valorant",
      gameName: "VALORANT",
      league: "VCT CN",
      tournament: "VCT CN Stage 2",
      stage: "Playoffs",
      teamA: "EDG",
      teamB: "Wolves",
      startTime: "2026-07-12T10:00:00.000Z",
      format: "BO3",
      status: "scheduled",
      source: "mock",
      sourceUrl: "https://example.com/vct-cn/edg-wolves",
      lastSyncedAt: "2026-07-09T09:00:00.000Z",
    };

    const summary = summarizeMatchFallback(match);

    expect(summary.length).toBeGreaterThanOrEqual(30);
    expect(summary.length).toBeLessThanOrEqual(60);
    expect(summary).toContain("EDG");
    expect(summary).toContain("Wolves");
    expect(summary).not.toMatch(/必胜|稳赢|夺冠/);
  });
});
