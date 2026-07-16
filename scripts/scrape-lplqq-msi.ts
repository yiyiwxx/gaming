// 从 lpl.qq.com JS 数据文件获取 MSI 2026 完整赛程
import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function fetchJson(url: string) {
  const res = await fetch(url);
  const text = await res.text();
  // Strip var xxx = prefix
  const jsonStr = text.replace(/^var\s+\w+\s*=\s*/, "").replace(/;(\s*)$/, "$1");
  return JSON.parse(jsonStr);
}

async function main() {
  // 1. Fetch team list for ID -> Name mapping
  console.log("[API] Fetching team list...");
  const teamData = await fetchJson("https://lpl.qq.com/web201612/data/LOL_MATCH2_TEAM_LIST.js");
  const teamMap: Record<string, string> = {};
  for (const [id, info] of Object.entries(teamData.msg as Record<string, any>)) {
    teamMap[id] = info.TeamName || info.TeamShortName || info.TeamEnName || `Team${id}`;
  }
  console.log(`[API] Loaded ${Object.keys(teamMap).length} teams`);

  // Debug: check specific team IDs we need
  const neededIds = ["692", "476", "1127", "1136", "20", "1018", "117", "42", "699", "1166", "57"];
  console.log("[API] Team ID mapping:");
  neededIds.forEach(id => console.log(`  ${id} → ${teamMap[id] || "NOT FOUND"}`));

  // 2. Fetch the match list from the JS data file
  console.log("\n[API] Fetching BMATCH list for game 239...");
  const matchData = await fetchJson(
    "https://lpl.qq.com/web201612/data/LOL_MATCH2_MATCH_HOMEPAGE_BMATCH_LIST_239.js"
  );

  // Save raw response
  fs.writeFileSync("data/lplqq-api-raw.json", JSON.stringify(matchData, null, 2), "utf-8");

  const matchItems = Array.isArray(matchData.msg) ? matchData.msg : [];
  console.log(`[API] Got ${matchItems.length} matches from BMATCH_LIST_239.js`);
  console.log(`[API] lastUpTime: ${matchData.lastUpTime}`);

  // 3. Transform to our Match schema
  const matches: any[] = [];

  for (const m of matchItems) {
    if (!m.bMatchId) continue;

    const teamAId = String(m.TeamA);
    const teamBId = String(m.TeamB);
    const teamAName = teamMap[teamAId] || m.bMatchName?.split(" vs ")[0]?.trim() || `Team${teamAId}`;
    const teamBName = teamMap[teamBId] || m.bMatchName?.split(" vs ")[1]?.trim() || `Team${teamBId}`;

    // Parse match date/time
    const matchDate = m.MatchDate; // "2026-06-28 11:00:00"
    const localTime = matchDate ? new Date(matchDate.replace(" ", "T") + "+08:00") : new Date();
    const dateStr = matchDate ? matchDate.slice(0, 10) : "";

    // Determine status
    const status = m.MatchStatus === "3" ? "finished" : m.MatchStatus === "2" ? "live" : "scheduled";
    
    // Build summary
    const hasScore = m.ScoreA !== undefined && m.ScoreB !== undefined && m.ScoreA !== "" && m.ScoreB !== "";
    const summary = hasScore ? `${teamAName} ${m.ScoreA}-${m.ScoreB} ${teamBName}` : undefined;

    // Tournament info
    const stageType = m.GameTypeName; // "入围赛" or "淘汰赛"
    const stageDay = m.GameProcName; // "第一天", "第二天" etc.
    const stage = stageType && stageDay ? `${stageType} ${stageDay}` : stageType || undefined;
    const format = m.GameModeName; // "BO5"

    const id = `lplqq-${dateStr}-${teamAName}-${teamBName}`
      .replace(/[^a-zA-Z0-9\u4e00-\u9fff-]/g, "-")
      .toLowerCase()
      .slice(0, 80);

    matches.push({
      id,
      game: "lol",
      gameName: "英雄联盟",
      league: "MSI 2026",
      tournament: "MSI 2026",
      stage,
      teamA: teamAName,
      teamB: teamBName,
      startTime: localTime.toISOString(),
      format: format?.includes("BO") ? format : undefined,
      status,
      source: "lplqq",
      sourceUrl: "https://lpl.qq.com/web202301/event.html?tabId=schedule",
      summary,
      lastSyncedAt: new Date().toISOString(),
    });
  }

  // 4. Show results
  console.log(`\n=== Transformed ${matches.length} matches ===`);
  const byDate: Record<string, any[]> = {};
  matches.forEach((m) => {
    const d = m.startTime.slice(0, 10);
    byDate[d] = byDate[d] || [];
    byDate[d].push(m);
  });
  Object.keys(byDate)
    .sort()
    .forEach((d) => {
      byDate[d].forEach((m) =>
        console.log(`  ${d} ${m.teamA} ${m.summary || "vs"} ${m.teamB} | ${m.stage}`)
      );
    });

  // 5. Upsert to DB
  if (matches.length > 0) {
    let ins = 0;
    let upd = 0;
    for (const m of matches) {
      const existing = await prisma.match.findUnique({ where: { id: m.id } });
      if (existing) {
        await prisma.match.update({ where: { id: m.id }, data: m });
        upd++;
      } else {
        await prisma.match.create({ data: m });
        ins++;
      }
    }
    console.log(`\n[DB] ${ins} inserted, ${upd} updated (source: lplqq)`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
