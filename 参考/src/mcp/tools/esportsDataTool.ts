import { z } from "zod";

import { esportsConnectors } from "@/lib/connectors";
import { listMatches } from "@/lib/matches/repository";
import { matchesQuerySchema } from "@/lib/matches/schema";

export const esportsDataTool = {
  name: "esportsDataTool",
  inputSchema: z.object({
    action: z.enum(["queryMatches", "queryTeams", "queryLeagues"]),
    query: matchesQuerySchema.optional(),
  }),
  outputSchema: z.object({
    matches: z.array(z.unknown()).optional(),
    teams: z.array(z.string()).optional(),
    leagues: z.array(z.string()).optional(),
  }),
  async call(input: unknown) {
    const parsed = this.inputSchema.parse(input);

    if (parsed.action === "queryMatches") {
      return { matches: await listMatches(parsed.query ?? {}) };
    }

    if (parsed.action === "queryTeams") {
      const teams = await Promise.all(esportsConnectors.map((connector) => connector.fetchTeams()));
      return { teams: Array.from(new Set(teams.flat())).sort() };
    }

    const leagues = await Promise.all(esportsConnectors.map((connector) => connector.fetchLeagues()));
    return { leagues: Array.from(new Set(leagues.flat())).sort() };
  },
};
