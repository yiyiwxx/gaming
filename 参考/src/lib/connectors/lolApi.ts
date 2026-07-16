import type { Match, MatchStatus } from "@/lib/matches/schema";

const publicLolesportsApiKey = "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z";
const lolesportsBaseUrl = "https://esports-api.lolesports.com/persisted/gw";

export const lolLeagueConfigs = [
  { id: "98767991314006698", slug: "lpl", name: "LPL" },
  { id: "98767991310872058", slug: "lck", name: "LCK" },
  { id: "98767991325878492", slug: "msi", name: "MSI" },
  { id: "98767975604431411", slug: "worlds", name: "Worlds" },
];

type LolTeam = {
  code?: string;
  name?: string;
};

type LolEvent = {
  startTime?: string;
  state?: string;
  type?: string;
  blockName?: string;
  league?: {
    name?: string;
    slug?: string;
  };
  match?: {
    id?: string;
    strategy?: {
      type?: string;
      count?: number;
    };
    teams?: LolTeam[];
  };
};

function lolStatus(state?: string): MatchStatus {
  if (state === "inProgress") return "live";
  if (state === "completed") return "finished";
  if (state === "unstarted") return "scheduled";
  return "scheduled";
}

function teamLabel(team: LolTeam | undefined) {
  return team?.code || team?.name || "TBD";
}

export function mapLolEventToMatch(event: LolEvent): Match | null {
  if (!event.match?.id || !event.startTime || event.type !== "match") {
    return null;
  }

  const teams = event.match.teams ?? [];
  const league = event.league?.name || "LoL Esports";
  const slug = event.league?.slug || league.toLocaleLowerCase().replace(/\s+/g, "-");
  const format =
    event.match.strategy?.type === "bestOf" && event.match.strategy.count
      ? `BO${event.match.strategy.count}`
      : undefined;

  return {
    id: `lol-${event.match.id}`,
    game: "lol",
    gameName: "League of Legends",
    league,
    tournament: league,
    stage: event.blockName,
    teamA: teamLabel(teams[0]),
    teamB: teamLabel(teams[1]),
    startTime: new Date(event.startTime).toISOString(),
    format,
    status: lolStatus(event.state),
    source: "lolesports-api",
    sourceUrl: `https://lolesports.com/schedule?leagues=${slug}`,
    streamUrl: "https://lolesports.com/live",
    summary: `${league} ${event.blockName ?? "赛程"}：${teamLabel(teams[0])} 对阵 ${teamLabel(teams[1])}。`,
    lastSyncedAt: new Date().toISOString(),
  };
}

async function fetchSchedulePage(leagueId: string, pageToken?: string) {
  const url = new URL(`${lolesportsBaseUrl}/getSchedule`);
  url.searchParams.set("hl", "en-US");
  url.searchParams.set("leagueId", leagueId);
  if (pageToken) {
    url.searchParams.set("pageToken", pageToken);
  }

  const response = await fetch(url, {
    headers: {
      "x-api-key": process.env.LOLESPORTS_API_KEY || publicLolesportsApiKey,
    },
    next: { revalidate: 60 * 30 },
  });

  if (!response.ok) {
    throw new Error(`LoLEsports schedule request failed: ${response.status}`);
  }

  return (await response.json()) as {
    data?: {
      schedule?: {
        pages?: { newer?: string | null };
        events?: LolEvent[];
      };
    };
  };
}

export async function fetchLolMatchesFromApi() {
  const currentYear = new Date().getUTCFullYear();
  const yearStart = Date.UTC(currentYear, 0, 1);
  const byId = new Map<string, Match>();

  for (const league of lolLeagueConfigs) {
    let pageToken: string | undefined;

    for (let page = 0; page < 4; page += 1) {
      const data = await fetchSchedulePage(league.id, pageToken);
      const schedule = data.data?.schedule;
      const events = schedule?.events ?? [];

      for (const event of events) {
        const match = mapLolEventToMatch(event);
        if (match && new Date(match.startTime).getTime() >= yearStart) {
          byId.set(match.id, match);
        }
      }

      const nextToken = schedule?.pages?.newer ?? undefined;
      if (!nextToken || nextToken === pageToken) {
        break;
      }
      pageToken = nextToken;
    }
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
}
