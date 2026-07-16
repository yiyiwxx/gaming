import { lolMockMatches } from "@/lib/matches/mockData";

import { fetchLolMatchesFromApi } from "./lolApi";
import type { EsportsConnector } from "./types";

export const lolConnector: EsportsConnector = {
  name: "lolConnector",
  game: "lol",
  async fetchMatches() {
    try {
      const matches = await fetchLolMatchesFromApi();
      return matches.length > 0 ? matches : lolMockMatches;
    } catch (error) {
      console.warn("LoL real connector failed, using mock data.", error);
      return lolMockMatches;
    }
  },
  async fetchTeams() {
    const matches = await this.fetchMatches();
    return Array.from(new Set(matches.flatMap((match) => [match.teamA, match.teamB])));
  },
  async fetchLeagues() {
    const matches = await this.fetchMatches();
    return Array.from(new Set(matches.map((match) => match.league)));
  },
};
