// KPL 数据入库脚本
// 从 tga-openapi.tga.qq.com 获取 KPL 2026 夏季赛 + 春季赛赛程并写入 DB
import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

interface KPLScheduleItem {
  scheduleid: string;
  hname: string;
  gname: string;
  host_score: number;
  guest_score: number;
  match_time: string;
  match_state: number;
  stage_name: string;
  season: string;
  bo_total: number;
}

async function fetchJson(url: string) {
  const res = await fetch(url);
  return res.json();
}

async function main() {
  const seasons = [
    { seasonid: "KPL2026S2", label: "2026 夏季赛" },
    { seasonid: "KPL2026S1", label: "2026 春季赛" },
    { seasonid: "KCC2026", label: "2026 挑战者杯" },
  ];

  const allMatches: any[] = [];

  for (const season of seasons) {
    console.log(`\n[KPL] Fetching ${season.label} (${season.seasonid})...`);
    try {
      const data = await fetchJson(
        `https://tga-openapi.tga.qq.com/web/tgabank/getSchedules?seasonid=${season.seasonid}&is_people=1`
      );

      if (!data.data || !Array.isArray(data.data)) {
        console.log(`[KPL] ${season.label}: no data`);
        continue;
      }

      const items = data.data as KPLScheduleItem[];
      console.log(`[KPL] ${season.label}: ${items.length} matches from API`);

      for (const item of items) {
        const matchDate = new Date(item.match_time.replace(" ", "T") + "+08:00");
        const dateStr = item.match_time.slice(0, 10);

        const status = item.match_state === 4 ? "finished" :
                       item.match_state === 3 ? "live" : "scheduled";

        const hasScore = item.host_score !== undefined && item.host_score !== null &&
                         item.guest_score !== undefined && item.guest_score !== null &&
                         status === "finished";

        // Parse tournament label
        const yearMatch = item.season.match(/(\d{4})/);
        const year = yearMatch ? yearMatch[1] : "2025";
        let tournament = `KPL ${year}`;
        if (item.season.includes("夏季")) tournament = `KPL ${year} 夏季赛`;
        else if (item.season.includes("春季")) tournament = `KPL ${year} 春季赛`;
        else if (item.season.includes("挑战者杯")) tournament = `KPL ${year} 挑战者杯`;
        else if (item.season.includes("年度总决赛")) tournament = `KPL ${year} 年度总决赛`;
        else if (item.season.includes("世界冠军杯")) tournament = `KPL ${year} 世界冠军杯`;

        const id = `kpl-${item.scheduleid}`.toLowerCase();

        allMatches.push({
          id,
          game: "hok",
          gameName: "王者荣耀",
          league: tournament,
          tournament,
          stage: item.stage_name || undefined,
          teamA: item.hname,
          teamB: item.gname,
          startTime: matchDate.toISOString(),
          format: item.bo_total ? `BO${item.bo_total}` : undefined,
          status,
          source: "kpl",
          sourceUrl: "https://kpl.qq.com/#/Schedule",
          summary: hasScore ? `${item.hname} ${item.host_score}-${item.guest_score} ${item.gname}` : undefined,
          lastSyncedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(`[KPL] ${season.label} error:`, err);
    }
  }

  // Show results
  console.log(`\n=== Total KPL matches: ${allMatches.length} ===`);
  const byDate: Record<string, any[]> = {};
  allMatches.forEach((m) => {
    const d = m.startTime.slice(0, 10);
    byDate[d] = byDate[d] || [];
    byDate[d].push(m);
  });

  // Show first few and last few dates
  const dates = Object.keys(byDate).sort();
  const showDates = [...dates.slice(0, 5), "...", ...dates.slice(-5)];
  for (const d of showDates) {
    if (d === "...") { console.log("  ..."); continue; }
    byDate[d].forEach((m) =>
      console.log(`  ${d} ${m.teamA} ${m.summary || "vs"} ${m.teamB} | ${m.stage}`)
    );
  }

  // Show summary by tournament
  const byTournament: Record<string, number> = {};
  allMatches.forEach((m) => {
    byTournament[m.tournament] = (byTournament[m.tournament] || 0) + 1;
  });
  console.log("\n=== By tournament ===");
  Object.entries(byTournament).forEach(([t, c]) => console.log(`  ${t}: ${c} matches`));

  // Upsert to DB
  if (allMatches.length > 0) {
    let ins = 0, upd = 0;
    for (const m of allMatches) {
      const existing = await prisma.match.findUnique({ where: { id: m.id } });
      if (existing) {
        await prisma.match.update({ where: { id: m.id }, data: m });
        upd++;
      } else {
        await prisma.match.create({ data: m });
        ins++;
      }
    }
    console.log(`\n[DB] ${ins} inserted, ${upd} updated (source: kpl)`);

    // Total
    const total = await prisma.match.count();
    console.log(`[DB] Total matches across all sources: ${total}`);
  }

  // Save cache for runtime connector
  const dir = "data";
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync("data/kpl-cache.json", JSON.stringify({
    scrapedAt: new Date().toISOString(),
    count: allMatches.length,
    matches: allMatches,
  }, null, 2), "utf-8");
  console.log("[KPL] Cache saved to data/kpl-cache.json");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
