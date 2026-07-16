/**
 * npm run sync:schedules 的 CLI 入口
 */
import { syncAllMatches } from "./syncMatches";

async function main() {
  console.log("=== 电竞赛事赛程同步 ===");
  console.log("");

  const result = await syncAllMatches();

  console.log("");
  console.log("=== 同步结果 ===");
  console.log(`LoL: ${result.lol} 场比赛`);
  console.log(`Valorant: ${result.valorant} 场比赛`);
  console.log(`KPL: ${result.hok} 场比赛`);
  console.log(`总计: ${result.total} 场比赛`);
  console.log("");
  console.log("数据源分布:", JSON.stringify(result.sources, null, 2));

  process.exit(0);
}

main().catch((e) => {
  console.error("Sync failed:", e);
  process.exit(1);
});
