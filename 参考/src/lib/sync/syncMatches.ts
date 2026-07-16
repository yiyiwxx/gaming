import { esportsConnectors, type EsportsConnector } from "@/lib/connectors";
import { prisma } from "@/lib/db/prisma";
import { deleteMockMatchesForGame, upsertMatches } from "@/lib/matches/repository";
import type { Match } from "@/lib/matches/schema";

export type SyncResult = {
  source: string;
  status: "success" | "error";
  message: string;
  syncedCount: number;
};

function hasRealSourceMatches(matches: Match[]) {
  return matches.some((match) => !match.source.toLocaleLowerCase().startsWith("mock"));
}

export async function syncMatches(connectors: EsportsConnector[] = esportsConnectors) {
  const results: SyncResult[] = [];

  for (const connector of connectors) {
    try {
      const matches = await connector.fetchMatches();
      if (hasRealSourceMatches(matches)) {
        await deleteMockMatchesForGame(connector.game);
      }
      const syncedCount = await upsertMatches(matches);
      const result: SyncResult = {
        source: connector.name,
        status: "success",
        message: `Synced ${syncedCount} ${connector.game} matches from ${connector.name}.`,
        syncedCount,
      };
      await prisma.syncLog.create({
        data: {
          source: result.source,
          status: result.status,
          message: result.message,
          syncedCount: result.syncedCount,
        },
      });
      results.push(result);
    } catch (error) {
      const result: SyncResult = {
        source: connector.name,
        status: "error",
        message: error instanceof Error ? error.message : "Unknown sync error",
        syncedCount: 0,
      };
      await prisma.syncLog.create({
        data: {
          source: result.source,
          status: result.status,
          message: result.message,
          syncedCount: result.syncedCount,
        },
      });
      results.push(result);
    }
  }

  return results;
}
