// 综合数据刷新脚本：从 VLR.gg 实时抓取 + 更新数据库
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fetchVLRMatches() {
  console.log("[VLR] Fetching latest matches from vlr.gg...");
  const res = await fetch("https://www.vlr.gg/matches", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept": "text/html",
    },
  });

  if (!res.ok) {
    console.error(`[VLR] HTTP ${res.status}`);
    return [];
  }

  const html = await res.text();
  console.log(`[VLR] Got ${html.length} bytes`);

  // Quick parse: extract match-item blocks
  const matches = parseVLRHtml(html);
  console.log(`[VLR] Parsed ${matches.length} matches`);
  return matches;
}

interface RawMatch {
  teamA: string;
  teamB: string;
  scoreA?: string;
  scoreB?: string;
  tournament: string;
  stage: string;
  dateStr: string;
  timeStr: string;
  status: string;
  eta: string;
}

function parseVLRHtml(html: string): RawMatch[] {
  const results: RawMatch[] = [];
  const now = new Date();

  // Extract wf-card blocks (date groups)
  const cardRegex = /<div class="wf-card"[^>]*>([\s\S]*?)(?=<div class="wf-card"|$)/g;
  let cardMatch: RegExpExecArray | null;
  let currentDate = "";

  // Find date headers first
  const dateHeaderRegex = /(\w+,\s*\w+\s+\d+,\s*\d{4})/g;
  const dateHeaders = [...html.matchAll(dateHeaderRegex)];
  const dateStrs = dateHeaders.map((m) => m[1]);

  // Find match items using matchAll
  const matchItemRegex = /<a href="(\/[^"]+)" class="[^"]*match-item[^"]*">([\s\S]*?)<\/a>/g;
  const allMatches = [...html.matchAll(matchItemRegex)];

  // Map dates to matches by finding which date section each match falls in
  const dateSections: { date: string; startPos: number }[] = [];
  for (const d of dateHeaders) {
    dateSections.push({ date: d[1], startPos: d.index! });
  }

  for (const m of allMatches) {
    const href = m[1];
    const matchBlock = m[2];
    const matchPos = m.index!;

    // Determine which date section this match belongs to
    for (let i = dateSections.length - 1; i >= 0; i--) {
      if (matchPos > dateSections[i].startPos) {
        currentDate = dateSections[i].date;
        break;
      }
    }

    // Parse team names
    const teamNameRegex = /match-item-vs-team-name[^>]*>([\s\S]*?)<\/div>\s*(?=<div class="match-item-vs-team)/g;
    const teamNames: string[] = [];
    let tnMatch: RegExpExecArray | null;
    while ((tnMatch = teamNameRegex.exec(matchBlock)) !== null) {
      let name = tnMatch[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim();
      // Remove flag span
      name = name.replace(/^\s*\S+\s*/, "").trim();
      if (name) teamNames.push(name);
    }

    // Parse scores
    const scoreRegex = /match-item-vs-team-score[^>]*>([\s\S]*?)<\/div>/g;
    const scores: string[] = [];
    let sMatch: RegExpExecArray | null;
    while ((sMatch = scoreRegex.exec(matchBlock)) !== null) {
      const s = sMatch[1].trim();
      if (s && /^\d+$/.test(s)) scores.push(s);
    }

    // Parse time
    const timeMatch = matchBlock.match(/match-item-time[^>]*>([\s\S]*?)<\/div>/);
    let timeStr = "";
    if (timeMatch) {
      timeStr = timeMatch[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim();
    }

    // Parse tournament/stage from href
    // URL format: /{matchId}/{team-a-vs-team-b-tournament-slug}
    const hrefParts = href.split("/").filter(Boolean);
    const lastPart = hrefParts[hrefParts.length - 1] || "";
    // Extract tournament from slug: remove "teamA-vs-teamB-" prefix
    const vsIdx = lastPart.indexOf("-vs-");
    let tournament = "";
    if (vsIdx > 0) {
      // Find the vs end: after teamB name (next segment)
      const afterVs = lastPart.slice(vsIdx + 4); // skip "-vs-"
      // Split by "-" and find where tournament-related words start
      const parts = afterVs.split("-");
      const tourWords: string[] = [];
      const leagueWords = ["challengers", "game", "changers", "vct", "masters",
        "champions", "stage", "split", "playoffs", "qualifier", "league",
        "cup", "open", "ladder", "season", "week", "day", "group",
        "americas", "emea", "pacific", "china", "korea", "japan", "brazil",
        "latam", "south", "north", "east", "west", "asia", "india"];
      let inTournament = false;
      for (const p of parts) {
        const lower = p.toLowerCase();
        if (leagueWords.some(w => lower.startsWith(w)) || /^\d{4}$/.test(p)) {
          inTournament = true;
        }
        if (inTournament && p.length > 0 && !/^(lbf|ubf|gf|wf|ef|qf|sf)$/i.test(p)) {
          tourWords.push(p);
        }
      }
      tournament = tourWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
    if (!tournament) {
      tournament = lastPart
        .replace(/-vs-.*$/, "")
        .split("-")
        .slice(-5)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }

    // Determine status
    let status = "scheduled";
    let eta = "";
    const statusMatch = matchBlock.match(/match-item-eta[^>]*>([\s\S]*?)<\/div>/);
    if (statusMatch) {
      eta = statusMatch[1].replace(/<[^>]+>/g, "").trim();
      if (eta.toLowerCase() === "live") status = "live";
      else if (eta.toLowerCase().includes(":")) status = "scheduled";
    }
    if (scores.length >= 2) status = "finished";

    if (teamNames.length >= 2) {
      results.push({
        teamA: teamNames[0],
        teamB: teamNames[1],
        scoreA: scores[0],
        scoreB: scores[1],
        tournament,
        stage: "",
        dateStr: currentDate,
        timeStr,
        status,
        eta,
      });
    }
  }

  return results;
}

function parseVLRDate(dateStr: string, timeStr: string): Date {
  const months: Record<string, number> = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5,
    jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8,
    oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
  };

  // "Monday, July 14, 2026"
  const parts = dateStr.split(/[\s,]+/);
  if (parts.length < 3) return new Date();

  const monthStr = parts[1]?.toLowerCase();
  const day = parseInt(parts[2]);
  const year = parseInt(parts[3] || String(new Date().getFullYear()));

  const month = months[monthStr];
  if (month === undefined) return new Date();

  // Time: "4:00 PM" or "11:00 AM"
  let hour = 12;
  let min = 0;
  const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (timeMatch) {
    hour = parseInt(timeMatch[1]);
    min = parseInt(timeMatch[2]);
    const ampm = timeMatch[3].toUpperCase();
    if (ampm === "PM" && hour < 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
  }

  return new Date(Date.UTC(year, month, day, hour, min));
}

function mapVLRLeague(tournament: string): string {
  const t = tournament.toLowerCase();
  if (t.includes("champions")) return "VCT Champions";
  if (t.includes("masters")) return "VCT Masters";
  if (t.includes("game changers")) return "VCT Game Changers";
  if (t.includes("challengers")) return "VCT Challengers";
  if (t.includes("china")) return "VCT CN";
  if (t.includes("pacific")) return "VCT Pacific";
  if (t.includes("emea")) return "VCT EMEA";
  if (t.includes("americas")) return "VCT Americas";
  return "VCT";
}

function normalizeTeam(name: string): string {
  return name
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  console.log("=== 数据刷新 ===\n");

  // 1. Fetch VLR.gg
  const rawMatches = await fetchVLRMatches();

  if (rawMatches.length === 0) {
    console.log("[VLR] No matches found, keeping existing data");
  } else {
    console.log(`[VLR] Upserting ${rawMatches.length} matches to database...`);
    const now = new Date().toISOString();
    let inserted = 0;
    let updated = 0;

    for (const rm of rawMatches) {
      const startTime = parseVLRDate(rm.dateStr, rm.timeStr);
      const id = `vlr-${startTime.toISOString().slice(0, 10)}-${rm.teamA}-${rm.teamB}`
        .replace(/[^a-zA-Z0-9-]/g, "-")
        .toLowerCase()
        .slice(0, 80);

      const matchData = {
        game: "valorant" as const,
        gameName: "无畏契约",
        league: mapVLRLeague(rm.tournament),
        tournament: rm.tournament,
        stage: rm.stage || null,
        teamA: normalizeTeam(rm.teamA),
        teamB: normalizeTeam(rm.teamB),
        startTime: startTime.toISOString(),
        format: null,
        status: rm.status,
        source: "vlr",
        sourceUrl: `https://www.vlr.gg/matches`,
        summary: rm.scoreA ? `${rm.teamA} ${rm.scoreA}-${rm.scoreB} ${rm.teamB}` : null,
        lastSyncedAt: new Date(),
      };

      const existing = await prisma.match.findUnique({ where: { id } });
      if (existing) {
        await prisma.match.update({ where: { id }, data: matchData });
        updated++;
      } else {
        await prisma.match.create({ data: { id, ...matchData } });
        inserted++;
      }

      if ((inserted + updated) % 20 === 0) {
        console.log(`  Progress: ${inserted + updated}/${rawMatches.length}`);
      }
    }

    console.log(`[VLR] ${inserted} inserted, ${updated} updated`);

    // Clean up old VLR data that's no longer in the scrape
    const newIds = rawMatches.map((rm) => {
      const st = parseVLRDate(rm.dateStr, rm.timeStr);
      return `vlr-${st.toISOString().slice(0, 10)}-${rm.teamA}-${rm.teamB}`
        .replace(/[^a-zA-Z0-9-]/g, "-")
        .toLowerCase()
        .slice(0, 80);
    });

    // Remove VLR matches older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const deleted = await prisma.match.deleteMany({
      where: {
        source: "vlr",
        startTime: { lt: sevenDaysAgo.toISOString() },
      },
    });
    if (deleted.count > 0) {
      console.log(`[VLR] Cleaned ${deleted.count} old matches (>7 days)`);
    }
  }

  // 2. Show final stats
  const counts = await prisma.match.groupBy({
    by: ["source", "status"],
    _count: true,
    orderBy: { source: "asc" },
  });

  console.log("\n=== Database ===");
  for (const c of counts) {
    console.log(`  ${c.source.padEnd(12)} ${c.status.padEnd(12)} ${c._count} matches`);
  }

  const total = counts.reduce((s, c) => s + c._count, 0);
  console.log(`  Total: ${total} matches`);

  // Show upcoming (next 2 weeks)
  const twoWeeks = new Date(Date.now() + 14 * 86400000);
  const upcoming = await prisma.match.findMany({
    where: {
      startTime: { gte: new Date().toISOString(), lte: twoWeeks.toISOString() },
      status: { not: "finished" },
    },
    orderBy: { startTime: "asc" },
    take: 15,
  });
  console.log("\n=== Upcoming (next 2 weeks) ===");
  for (const m of upcoming) {
    const d = new Date(m.startTime);
    const dateLabel = d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
    console.log(`  ${dateLabel} [${m.status}] ${m.teamA} vs ${m.teamB} | ${m.tournament} | ${m.source}`);
  }
  if (upcoming.length === 0) {
    console.log("  (none)");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
