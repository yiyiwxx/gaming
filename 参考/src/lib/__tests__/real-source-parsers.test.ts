import { describe, expect, it } from "vitest";

import { mapLolEventToMatch } from "@/lib/connectors/lolApi";
import { parseVlrMatchesHtml } from "@/lib/connectors/vlrParser";

describe("real source parsers", () => {
  it("maps a LoLEsports schedule event to the standard Match schema", () => {
    const match = mapLolEventToMatch({
      startTime: "2026-07-10T11:00:00Z",
      state: "unstarted",
      type: "match",
      blockName: "Week 1",
      league: { name: "LPL", slug: "lpl" },
      match: {
        id: "115000000000000001",
        strategy: { type: "bestOf", count: 3 },
        teams: [
          { name: "Bilibili Gaming", code: "BLG" },
          { name: "Top Esports", code: "TES" },
        ],
      },
    });

    expect(match).toMatchObject({
      id: "lol-115000000000000001",
      game: "lol",
      gameName: "League of Legends",
      league: "LPL",
      tournament: "LPL",
      stage: "Week 1",
      teamA: "BLG",
      teamB: "TES",
      format: "BO3",
      status: "scheduled",
      source: "lolesports-api",
      sourceUrl: "https://lolesports.com/schedule?leagues=lpl",
    });
  });

  it("parses VLR schedule HTML into VALORANT matches", () => {
    const html = `
      <div class="wf-label mod-large">Today</div>
      <a href="/701026/dragon-ranger-gaming-vs-bilibili-gaming-vct-2026-china-stage-2-w1" class="wf-module-item match-item">
        <div class="match-item-time">8:00 AM</div>
        <div class="match-item-vs-team-name">Dragon Ranger Gaming</div>
        <div class="match-item-vs-team-name">Bilibili Gaming</div>
        <div class="match-item-note">Upcoming</div>
        <div class="match-item-event-series text-of">VCT 2026: China Stage 2</div>
      </a>
    `;

    const matches = parseVlrMatchesHtml(html, new Date("2026-07-09T00:00:00.000Z"));

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      id: "valorant-vlr-701026",
      game: "valorant",
      gameName: "VALORANT",
      league: "VCT CN",
      tournament: "VCT 2026: China Stage 2",
      teamA: "Dragon Ranger Gaming",
      teamB: "Bilibili Gaming",
      format: "BO3",
      status: "scheduled",
      source: "vlr.gg",
      sourceUrl:
        "https://www.vlr.gg/701026/dragon-ranger-gaming-vs-bilibili-gaming-vct-2026-china-stage-2-w1",
    });
  });
});
