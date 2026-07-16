import { valorantMockMatches } from "@/lib/matches/mockData";

import type { EsportsConnector } from "./types";
import { fetchVlrMatches } from "./vlrParser";

export const valorantConnector: EsportsConnector = {
  name: "valorantConnector",
  game: "valorant",
  async fetchMatches() {
    try {
      const matches = await fetchVlrMatches();
      return matches.length > 0 ? matches : valorantMockMatches;
    } catch (error) {
      console.warn("VALORANT real connector failed, using mock data.", error);
      return valorantMockMatches;
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
