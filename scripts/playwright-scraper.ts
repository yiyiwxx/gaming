// Final clean Playwright scraper - based on exact DOM structure
import { chromium } from "playwright";
import { Match } from "../src/lib/connectors/types";

const LEAGUE_IDS: Record<string, string> = {
  lpl: "98767991299243165", lck: "98767991302972019",
  lec: "98767991299243173", lcs: "98767991302996019",
  msi: "113470241010912364", worlds: "98767975604431411",
};

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const DAYS = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];

export async function scrapeLoLSchedule(
  leagues: string[] = ["lpl", "lck", "lec", "lcs", "msi", "worlds"]
): Promise<Match[]> {
  const leagueParam = leagues.map((l) => LEAGUE_IDS[l] || l).filter(Boolean).join(",");
  const url = `https://lolesports.com/schedule?leagues=${leagueParam}`;

  console.log(`[LoL Playwright] Opening browser...`);
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      viewport: { width: 1920, height: 1080 },
      locale: "en-US",
    });

    await page.route("**/*", (route) => {
      if (["image", "font", "media"].includes(route.request().resourceType())) route.abort();
      else route.continue();
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    // Wait for schedule content to render
    await page.waitForTimeout(5000);

    // Get rendered text
    const bodyText = await page.evaluate(() => document.body.innerText);
    
    // Find schedule section after season bar
    const marker = "EVENTS & STANDINGS";
    const startIdx = bodyText.indexOf(marker);
    const text = startIdx > 0 ? bodyText.slice(startIdx) : bodyText;

    // Split and filter: remove cookie, navigation, season bar lines
    const rawLines = text.split("\n");
    const lines: string[] = [];

    // Find where schedule starts (after season bar and "Leagues" / "Load More")
    let inSchedule = false;
    for (const line of rawLines) {
      const trimmed = line.trim();
      
      // Skip cookie
      if (/cookie|privacy|consent|preferences|accept|reject/i.test(trimmed)) continue;
      
      // Detect schedule start: first date header line after season bar
      if (!inSchedule) {
        if (trimmed === "Load More" || trimmed === "Leagues") {
          inSchedule = true;
          continue;
        }
        // Skip everything before Load More / Leagues
        continue;
      }

      lines.push(trimmed);
    }

    // Remove empty lines for easier parsing
    const nonEmpty = lines.filter((l) => l.length > 0);

    // Parse with the exact known structure
    const matches = parseExactStructure(nonEmpty);
    console.log(`[LoL Playwright] Parsed ${matches.length} matches from lolesports.com`);
    return matches;
  } finally {
    await browser.close();
  }
}

/**
 * Parse the EXACT structure observed from the DOM:
 * 
 * Date header: "Tuesday Oct 28, 2025" or "Monday Mar 16" or "Yesterday" / "Today"
 * 
 * Per match (5 consecutive non-empty lines after date):
 *   TeamA
 *   TeamB
 *   League • Stage
 *   BoN
 * 
 * OR with spoiler hidden:
 *   CLICK TO REVEAL
 *   [empty where teams would be]
 *   League • Stage
 *   BoN
 */
function parseExactStructure(lines: string[]): Match[] {
  const matches: Match[] = [];
  let currentDate: Date = new Date();
  let i = 0;

  const dateHeaderRegex = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s/i;
  const relativeDateRegex = /^(today|yesterday|tomorrow)$/i;
  const leagueStageRegex = /^.+?\s[•·-]\s.+$/;  // "Worlds • Quarterfinals"
  const formatRegex = /^bo[135]$/i;
  const revealRegex = /^click to reveal/i;

  while (i < lines.length) {
    const line = lines[i];

    // Empty line
    if (!line) {
      i++;
      continue;
    }

    // "No Matches" block
    if (/^no matches/i.test(line)) {
      // Skip: "No Matches Scheduled Today", "Check back soon..."
      while (i < lines.length && !dateHeaderRegex.test(lines[i]) && !relativeDateRegex.test(lines[i])) {
        i++;
      }
      continue;
    }

    // Skip noise
    if (/^BIGGEST|^Announcing|^POWER RANKINGS|^PICK'EMS|^REWARDS|^NEWS|^TICKETS|^LOGIN|^HOME|^SCHEDULE/.test(line)) {
      i++;
      continue;
    }

    // Date header
    if (dateHeaderRegex.test(line) || relativeDateRegex.test(line)) {
      currentDate = parseExactDate(line);
      i++;
      continue;
    }

    // Season bar items (contextual noise)
    if (/^(ALL REGIONS|INTERNATIONAL|Regional Split|First Stand|MSI|Worlds)$/i.test(line)) {
      i++;
      continue;
    }
    if (/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s/i.test(line)) {
      i++;
      continue;
    }
    if (/^\d+$/.test(line)) { // "3" for league count
      i++;
      continue;
    }

    // CLICK TO REVEAL match (no team names visible)
    if (revealRegex.test(line)) {
      // Next non-empty lines should be league and format
      const league = findNext(line, i, lines, leagueStageRegex);
      const format = findNext(line, i, lines, formatRegex);
      
      if (league && format) {
        addMatchFromData(matches, "TBD", "TBD", currentDate, league, format, false);
      }
      
      // Advance past this match block
      i += 3; // CLICK TO REVEAL + league + format
      continue;
    }

    // Potential team name (all caps, 2-5 chars)
    const teamA = line;
    const teamB = i + 1 < lines.length ? lines[i + 1] : "";
    const leagueStr = i + 2 < lines.length ? lines[i + 2] : "";
    const formatStr = i + 3 < lines.length ? lines[i + 3] : "";

    // Check: teamB looks like a team name (short, possibly all caps)
    const isTeamName = (s: string) => /^[A-Za-z0-9 .&'-]{2,25}$/.test(s) && !/^(bo[135]|click|announcing)$/i.test(s);

    if (isTeamName(teamB) && leagueStageRegex.test(leagueStr) && formatRegex.test(formatStr)) {
      // Perfect match: teamA, teamB, league, format
      addMatchFromData(matches, teamA, teamB, currentDate, leagueStr, formatStr, false);
      i += 4; // Advance past teamA, teamB, league, format
      continue;
    }

    // Might be a match with different line count (e.g., same-day multiple matches)
    // Check if this is actually a league line
    if (leagueStageRegex.test(teamA) && formatRegex.test(teamB)) {
      addMatchFromData(matches, "TBD", "TBD", currentDate, teamA, teamB, false);
      i += 2;
      continue;
    }

    i++;
  }

  // Deduplicate and filter  
  const seen = new Set<string>();
  return matches.filter((m, idx) => {
    // For TBD matches, use index-based dedup (don't collapse all TBDs)
    if (m.teamA === "TBD" && m.teamB === "TBD") {
      const key = `${m.tournament}-${m.stage}-${idx}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }
    const key = `${m.teamA}-${m.teamB}-${m.tournament}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function findNext(current: string, startIdx: number, lines: string[], pattern: RegExp): string {
  for (let j = startIdx + 1; j < Math.min(lines.length, startIdx + 10); j++) {
    if (pattern.test(lines[j])) return lines[j];
    if (/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s/i.test(lines[j])) break;
    if (/^(today|yesterday|tomorrow)$/i.test(lines[j])) break;
  }
  return "";
}

function addMatchFromData(
  matches: Match[],
  teamA: string,
  teamB: string,
  date: Date,
  leagueStr: string,
  formatStr: string,
  isFinished: boolean
): void {
  const { league, stage, tournament } = parseLeagueAndStage(leagueStr);
  const format = parseFormatStr(formatStr);
  const dateStr = date.toISOString().slice(0, 10);

  const id = `lol-${dateStr}-${teamA}-${teamB}-${tournament}`.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase();

  matches.push({
    id,
    game: "lol",
    gameName: "英雄联盟",
    league: league || "LoL",
    tournament: tournament || league || "LoL",
    stage,
    teamA,
    teamB,
    startTime: `${dateStr}T12:00:00Z`,
    format,
    status: isFinished ? "finished" : "scheduled",
    source: "lolesports",
    sourceUrl: "https://lolesports.com/schedule",
    lastSyncedAt: new Date().toISOString(),
  });
}

function parseLeagueAndStage(str: string): { league: string; stage: string; tournament: string } {
  if (!str) return { league: "", stage: "", tournament: "" };

  // "Worlds • Quarterfinals" → tournament=Worlds, stage=Quarterfinals
  const parts = str.split(/[•·-]/).map((p) => p.trim());
  const tournament = parts[0] || "";
  const stage = parts[1] || "";

  const leagueMap: Record<string, string> = {
    worlds: "Worlds", msi: "MSI", "first stand": "MSI",
    lpl: "LPL", lck: "LCK", lec: "LEC", lcs: "LCS",
    pcs: "PCS", vcs: "VCS", cblol: "CBLOL", lla: "LLA",
  };

  const lower = tournament.toLowerCase();
  const league = leagueMap[lower] || tournament;

  return { league, stage, tournament };
}

function parseFormatStr(str: string): string | undefined {
  if (!str) return undefined;
  const m = str.match(/bo(\d)/i);
  return m ? `BO${m[1]}` : undefined;
}

function parseExactDate(line: string): Date {
  const now = new Date();
  const lower = line.toLowerCase().trim();

  if (lower === "today") return now;
  if (lower === "yesterday") { const d = new Date(now); d.setDate(d.getDate() - 1); return d; }
  if (lower === "tomorrow") { const d = new Date(now); d.setDate(d.getDate() + 1); return d; }

  // "Tuesday Oct 28, 2025" or "Monday Mar 16" → Month Day format
  const m = line.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})/i);
  if (!m) return now;

  const month = MONTHS[m[1].toLowerCase()];
  const day = parseInt(m[2]);
  
  const yearMatch = line.match(/(\d{4})/);
  const year = yearMatch ? parseInt(yearMatch[1]) : now.getFullYear();

  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? now : d;
}

// Test
scrapeLoLSchedule().then((matches) => {
  console.log(`\n=== ${matches.length} REAL LoL matches from lolesports.com ===\n`);

  const byLeague: Record<string, Match[]> = {};
  for (const m of matches) {
    const key = m.tournament || "Unknown";
    if (!byLeague[key]) byLeague[key] = [];
    byLeague[key].push(m);
  }

  for (const [league, ms] of Object.entries(byLeague)) {
    const futureCount = ms.filter(m => m.status === "scheduled" && new Date(m.startTime) > new Date()).length;
    const finishedCount = ms.filter(m => m.status === "finished").length;
    console.log(`\n--- ${league} (${ms.length}: ${futureCount} upcoming, ${finishedCount} finished) ---`);
    for (const m of ms.slice(0, 15)) {
      const d = new Date(m.startTime).toLocaleDateString("zh-CN");
      const score = m.summary || "vs";
      console.log(`  [${d}] ${m.teamA} ${score} ${m.teamB} | ${m.stage || ""} | ${m.format || ""} | ${m.status}`);
    }
    if (ms.length > 15) console.log(`  ... +${ms.length - 15} more`);
  }
}).catch(console.error);
