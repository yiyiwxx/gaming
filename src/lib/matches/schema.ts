import { z } from "zod";

export const MatchSchema = z.object({
  id: z.string().min(1),
  game: z.enum(["lol", "valorant"]),
  gameName: z.string().min(1),
  league: z.string().min(1),
  tournament: z.string().min(1),
  stage: z.string().optional(),
  teamA: z.string().min(1),
  teamB: z.string().min(1),
  startTime: z.string().datetime({ message: "startTime must be UTC ISO string" }),
  endTime: z.string().datetime().optional(),
  format: z.string().optional(),
  status: z.enum(["scheduled", "live", "finished", "postponed"]),
  source: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  streamUrl: z.string().url().optional(),
  summary: z.string().optional(),
  lastSyncedAt: z.string().datetime(),
});

export type ValidatedMatch = z.infer<typeof MatchSchema>;

/**
 * 验证并标准化一场比赛
 */
export function validateMatch(data: unknown): ValidatedMatch {
  return MatchSchema.parse(data);
}

/**
 * Sanitize match - 补全缺失字段
 */
export function sanitizeMatch(match: Partial<ValidatedMatch> & { id: string; game: "lol" | "valorant"; gameName: string; league: string; tournament: string; teamA: string; teamB: string; startTime: string; status: "scheduled" | "live" | "finished" | "postponed"; source: string }): ValidatedMatch {
  return {
    ...match,
    lastSyncedAt: match.lastSyncedAt || new Date().toISOString(),
    status: match.status || "scheduled",
  };
}
