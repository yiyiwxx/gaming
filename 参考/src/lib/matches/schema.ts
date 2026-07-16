import { z } from "zod";

export const gameSchema = z.enum(["lol", "valorant"]);

export const matchStatusSchema = z.enum([
  "scheduled",
  "live",
  "finished",
  "postponed",
]);

export const matchSchema = z.object({
  id: z.string().min(1),
  game: gameSchema,
  gameName: z.string().min(1),
  league: z.string().min(1),
  tournament: z.string().min(1),
  stage: z.string().optional(),
  teamA: z.string().min(1),
  teamB: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  format: z.string().optional(),
  status: matchStatusSchema,
  source: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  streamUrl: z.string().url().optional(),
  summary: z.string().optional(),
  lastSyncedAt: z.string().datetime(),
});

export const matchesQuerySchema = z.object({
  game: gameSchema.optional(),
  league: z.string().trim().optional(),
  team: z.string().trim().optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
});

export type Game = z.infer<typeof gameSchema>;
export type MatchStatus = z.infer<typeof matchStatusSchema>;
export type Match = z.infer<typeof matchSchema>;
export type MatchesQuery = z.infer<typeof matchesQuerySchema>;
