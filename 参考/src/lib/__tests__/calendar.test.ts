import { describe, expect, it } from "vitest";

import { generateCalendarIcs } from "@/lib/calendar/generateIcs";
import type { Match } from "@/lib/matches/schema";
import { normalizeSubscriptionRule } from "@/lib/subscriptions/rules";

const matchWithoutEnd: Match = {
  id: "lol-worlds-t1-gen",
  game: "lol",
  gameName: "League of Legends",
  league: "Worlds",
  tournament: "World Championship 2026",
  stage: "Swiss Stage",
  teamA: "T1",
  teamB: "GEN",
  startTime: "2026-10-18T12:00:00.000Z",
  format: "BO5",
  status: "scheduled",
  source: "mock",
  sourceUrl: "https://example.com/worlds/t1-gen",
  streamUrl: "https://live.example.com/worlds",
  summary: "全球总决赛焦点对局，T1 与 GEN 再度交锋。",
  lastSyncedAt: "2026-07-09T09:00:00.000Z",
};

describe("calendar generation", () => {
  it("generates stable UTC VEVENT fields and estimates missing BO5 end time", () => {
    const ics = generateCalendarIcs({
      subscriptionId: "sub_123",
      subscriptionName: "Worlds 订阅",
      rule: normalizeSubscriptionRule({ teams: ["T1"], reminderMinutes: 1440 }),
      matches: [matchWithoutEnd],
      origin: "https://calendar.example.com",
    });

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("UID:sub_123-lol-worlds-t1-gen@esports-ai-calendar");
    expect(ics).toContain("SUMMARY:【Worlds】T1 vs GEN");
    expect(ics).toContain("DTSTART:20261018T120000Z");
    expect(ics).toContain("DTEND:20261018T160000Z");
    expect(ics).toContain("TRIGGER:-P1D");
    expect(ics).toContain("URL;VALUE=URI:https://example.com/worlds/t1-gen");
  });

  it("omits matches that already ended before the calendar is generated", () => {
    const pastMatch = {
      ...matchWithoutEnd,
      id: "lol-past-blg-tes",
      league: "LPL",
      teamA: "BLG",
      teamB: "TES",
      startTime: "2026-04-10T09:00:00.000Z",
      format: "BO3",
    } satisfies Match;

    const ics = generateCalendarIcs({
      subscriptionId: "sub_123",
      subscriptionName: "LPL 订阅",
      rule: normalizeSubscriptionRule({ games: ["lol"] }),
      matches: [pastMatch, matchWithoutEnd],
      origin: "https://calendar.example.com",
      now: new Date("2026-07-09T12:00:00.000Z"),
    });

    expect(ics).not.toContain("SUMMARY:【LPL】BLG vs TES");
    expect(ics).toContain("SUMMARY:【Worlds】T1 vs GEN");
  });
});
