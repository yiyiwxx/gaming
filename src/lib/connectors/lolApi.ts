import { LoLEvent, LoLEsportsSchedule, Match } from "./types";

const LOLESPORTS_API_URL = "https://esports-api.lolesports.com/persisted/gw";
const API_KEY = process.env.LOLESPORTS_API_KEY || "";

/**
 * 从 LoL Esports API 获取赛程数据
 */
export async function fetchLoLSchedule(leagueId?: string): Promise<Match[]> {
  try {
    const url = new URL(`${LOLESPORTS_API_URL}/getSchedule`);
    url.searchParams.set("hl", "zh-CN");
    if (leagueId) {
      url.searchParams.set("leagueId", leagueId);
    }

    const headers: Record<string, string> = {
      "Accept": "application/json",
      "x-api-key": API_KEY,
    };

    const response = await fetch(url.toString(), { headers });
    if (!response.ok) {
      throw new Error(`LoL Esports API error: ${response.status}`);
    }

    const data: LoLEsportsSchedule = await response.json();
    return mapLoLEventsToMatches(data.data.schedule.events);
  } catch (error) {
    console.error("Failed to fetch LoL schedule:", error);
    throw error;
  }
}

/**
 * 将 LoL Esports 事件映射为标准 Match
 */
export function mapLoLEventsToMatches(events: LoLEvent[]): Match[] {
  const now = new Date().toISOString();

  return events
    .filter((event) => event.type === "match" && event.match)
    .map((event) => {
      const match = event.match!;
      const teams = match.teams || [];
      const teamA = teams[0]?.code || teams[0]?.name || "TBD";
      const teamB = teams[1]?.code || teams[1]?.name || "TBD";

      const leagueName = event.league?.name || "Unknown League";
      const tournamentName = event.tournament?.name || event.blockName || leagueName;

      const format = match.strategy
        ? `BO${match.strategy.count}`
        : undefined;

      const status = mapLoLState(event.state);

      return {
        id: `lol-${match.id}`,
        game: "lol",
        gameName: "英雄联盟",
        league: normalizeLeagueName(leagueName),
        tournament: tournamentName,
        stage: event.blockName || undefined,
        teamA,
        teamB,
        startTime: event.startTime,
        format,
        status,
        source: "lolesports",
        sourceUrl: `https://lolesports.com/match/${match.id}`,
        streamUrl: event.streamChannel
          ? `https://www.twitch.tv/${event.streamChannel}`
          : undefined,
        lastSyncedAt: now,
      };
    });
}

function mapLoLState(state: string): Match["status"] {
  switch (state) {
    case "unstarted":
    case "scheduled":
      return "scheduled";
    case "inProgress":
    case "live":
      return "live";
    case "completed":
    case "finished":
      return "finished";
    case "postponed":
    case "cancelled":
      return "postponed";
    default:
      return "scheduled";
  }
}

/**
 * 标准化联赛名称
 */
function normalizeLeagueName(name: string): string {
  const mapping: Record<string, string> = {
    "lpl": "LPL",
    "lck": "LCK",
    "lec": "LEC",
    "lcs": "LCS",
    "msi": "MSI",
    "worlds": "Worlds",
    "world championship": "Worlds",
    "mid-season invitational": "MSI",
  };
  return mapping[name.toLowerCase()] || name;
}
