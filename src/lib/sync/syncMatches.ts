import { getLoLMatches } from "../connectors/lolConnector";
import { getValorantMatches } from "../connectors/valorantConnector";
import { getKPLMatches } from "../connectors/kplConnector";
import { upsertMatches, deleteOldMockMatches, countMatchesBySource } from "../matches/repository";
import { summarizeMatchWithAI } from "../ai/summarizeMatch";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * 同步所有数据源的赛程
 */
export async function syncAllMatches(): Promise<{
  lol: number;
  valorant: number;
  hok: number;
  total: number;
  sources: Record<string, number>;
}> {
  console.log("[Sync] Starting full sync...");

  // 清理旧的 mock 比赛（真实源成功后）
  const deleted = await deleteOldMockMatches();
  if (deleted > 0) {
    console.log(`[Sync] Cleaned ${deleted} old mock matches`);
  }

  // 同步 LoL
  let lolCount = 0;
  try {
    const lolMatches = await getLoLMatches();
    lolCount = await upsertMatches(lolMatches);

    // 为没有摘要的比赛生成摘要
    for (const match of lolMatches) {
      if (!match.summary && match.status === "scheduled") {
        try {
          const summary = await summarizeMatchWithAI({
            gameName: match.gameName,
            league: match.league,
            tournament: match.tournament,
            stage: match.stage,
            teamA: match.teamA,
            teamB: match.teamB,
          });
          await prisma.match.update({
            where: { id: match.id },
            data: { summary },
          });
        } catch {
          // 摘要生成失败不影响同步
        }
      }
    }

    await logSync("lol", "success", lolCount);
    console.log(`[Sync] LoL: ${lolCount} matches synced`);
  } catch (error) {
    await logSync("lol", "failed", 0, (error as Error).message);
    console.error("[Sync] LoL sync failed:", error);
  }

  // 同步 Valorant
  let valorantCount = 0;
  try {
    const valorantMatches = await getValorantMatches();
    valorantCount = await upsertMatches(valorantMatches);

    for (const match of valorantMatches) {
      if (!match.summary && match.status === "scheduled") {
        try {
          const summary = await summarizeMatchWithAI({
            gameName: match.gameName,
            league: match.league,
            tournament: match.tournament,
            stage: match.stage,
            teamA: match.teamA,
            teamB: match.teamB,
          });
          await prisma.match.update({
            where: { id: match.id },
            data: { summary },
          });
        } catch {
          // 摘要生成失败不影响同步
        }
      }
    }

    await logSync("valorant", "success", valorantCount);
    console.log(`[Sync] Valorant: ${valorantCount} matches synced`);
  } catch (error) {
    await logSync("valorant", "failed", 0, (error as Error).message);
    console.error("[Sync] Valorant sync failed:", error);
  }

  // 同步 KPL
  let hokCount = 0;
  try {
    const hokMatches = await getKPLMatches();
    hokCount = await upsertMatches(hokMatches);

    for (const match of hokMatches) {
      if (!match.summary && match.status === "scheduled") {
        try {
          const summary = await summarizeMatchWithAI({
            gameName: match.gameName,
            league: match.league,
            tournament: match.tournament,
            stage: match.stage,
            teamA: match.teamA,
            teamB: match.teamB,
          });
          await prisma.match.update({
            where: { id: match.id },
            data: { summary },
          });
        } catch {
          // 摘要生成失败不影响同步
        }
      }
    }

    await logSync("kpl", "success", hokCount);
    console.log(`[Sync] KPL: ${hokCount} matches synced`);
  } catch (error) {
    await logSync("kpl", "failed", 0, (error as Error).message);
    console.error("[Sync] KPL sync failed:", error);
  }

  const sources = await countMatchesBySource();

  const total = lolCount + valorantCount + hokCount;
  console.log(`[Sync] Complete. Total: ${total} matches`);
  console.log("[Sync] Sources:", sources);

  return {
    lol: lolCount,
    valorant: valorantCount,
    hok: hokCount,
    total,
    sources,
  };
}

async function logSync(
  source: string,
  status: "success" | "failed" | "partial",
  count: number,
  error?: string
) {
  try {
    await prisma.syncLog.create({
      data: {
        id: `${source}-${Date.now()}`,
        source,
        status,
        count,
        error: error || null,
      },
    });
  } catch {
    // 日志写入失败不影响同步
  }
}
