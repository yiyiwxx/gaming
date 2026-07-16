import type { Game, Match } from "@/lib/matches/schema";

export type EsportsConnector = {
  name: string;
  game: Game;
  fetchMatches: () => Promise<Match[]>;
  fetchTeams: () => Promise<string[]>;
  fetchLeagues: () => Promise<string[]>;
};
