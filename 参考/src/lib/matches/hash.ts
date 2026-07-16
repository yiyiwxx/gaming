import { createHash } from "crypto";

import type { Match } from "./schema";

export function hashMatch(match: Match): string {
  const stablePayload = [
    match.game,
    match.league,
    match.tournament,
    match.stage ?? "",
    match.teamA,
    match.teamB,
    match.startTime,
    match.endTime ?? "",
    match.format ?? "",
    match.status,
    match.sourceUrl ?? "",
    match.streamUrl ?? "",
  ].join("|");

  return createHash("sha256").update(stablePayload).digest("hex");
}
