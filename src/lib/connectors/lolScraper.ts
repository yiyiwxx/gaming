// LoL Esports Playwright Scraper — extracts real match data from lolesports.com
import { chromium, Browser } from "playwright";
import { Match } from "./types";

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const LEAGUE_IDS: Record<string, string> = {
  lpl: "98767991299243165", lck: "98767991302972019",
  lec: "98767991299243173", lcs: "98767991302996019",
  msi: "113470241010912364", worlds: "98767975604431411",
};

let _browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!_browser || !_browser.isConnected()) {
    _browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return _browser;
}

/**
 * 用 Playwright 无头浏览器抓取 lolesports.com 真实赛程
 */
export async function scrapeLoLSchedule(
  leagues: string[] = ["lpl", "lck", "lec", "lcs", "msi", "worlds"]
): Promise<Match[]> {
  const leagueParam = leagues.map((l) => LEAGUE_IDS[l] || l).filter(Boolean).join(",");
  const url = `https://lolesports.com/schedule?leagues=${leagueParam}`;

  console.log(`[LoL Scraper] Launching browser...`);

  try {
    const browser = await getBrowser();
    const page = await browser.newPage({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      viewport: { width: 1920, height: 1080 },
      locale: "en-US",
    });

    // Block images/fonts for speed
    await page.route("**/*", (route) => {
      if (["image", "font", "media"].includes(route.request().resourceType()))
        route.abort();
      else route.continue();
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(5000);

    // Scroll down aggressively to trigger lazy loading
    for (let s = 0; s < 15; s++) {
      await page.evaluate(() => window.scrollBy(0, 1200));
      await page.waitForTimeout(800);
    }

    // Click "Load More" button if visible
    try {
      const loadMoreBtn = await page.$('button:has-text("Load More")');
      if (loadMoreBtn) {
        for (let c = 0; c < 5; c++) {
          await loadMoreBtn.click().catch(() => {});
          await page.waitForTimeout(1500);
        }
      }
    } catch { /* no load more button */ }

    // Scroll back to top then extract everything
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);

    // Extract rendered text — innerText preserves line breaks properly
    const bodyText = await page.evaluate(() => document.body.innerText);
    await page.close();

    // Find schedule section
    const marker = "EVENTS & STANDINGS";
    const startIdx = bodyText.indexOf(marker);
    const text = startIdx > 0 ? bodyText.slice(startIdx) : bodyText;

    const rawLines = text.split("\n");
    const lines: string[] = [];

    let inSchedule = false;
    for (const line of rawLines) {
      const trimmed = line.trim();
      if (/cookie|privacy|consent|preferences|accept|reject/i.test(trimmed))
        continue;
      if (!inSchedule) {
        if (trimmed === "Load More" || trimmed === "Leagues") {
          inSchedule = true;
          continue;
        }
        continue;
      }
      lines.push(trimmed);
    }

    // Filter empty lines
    const nonEmpty = lines.filter((l) => l.length > 0);
    const matches = parseSchedule(nonEmpty);

    console.log(`[LoL Scraper] Extracted ${matches.length} real matches`);
    return matches;
  } catch (err) {
    console.error("[LoL Scraper] Failed:", (err as Error).message);
    return [];
  }
}

/**
 * Parse the exact lolesports.com DOM text structure:
 *
 * Date headers: "Tuesday Oct 28, 2025" / "Monday Mar 16" / "Yesterday" / "Today"
 *
 * Match block (4 lines):
 *   TeamA
 *   TeamB
 *   League • Stage
 *   BoN
 *
 * With spoiler: "CLICK TO REVEAL" replaces team names
 */
function parseSchedule(lines: string[]): Match[] {
  const matches: Match[] = [];
  let currentDate = new Date();
  let i = 0;

  const dateHeaderRegex = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s/i;
  const relativeDateRegex = /^(today|yesterday|tomorrow)$/i;
  const leagueStageRegex = /^.+?\s[•·-]\s.+$/;
  const formatRegex = /^bo[135]$/i;

  while (i < lines.length) {
    const line = lines[i];

    // "No Matches" block — skip
    if (/^no matches/i.test(line)) {
      while (i < lines.length && !dateHeaderRegex.test(lines[i]) && !relativeDateRegex.test(lines[i]))
        i++;
      continue;
    }

    // Skip navigation/season bar noise
    if (/^(BIGGEST|Announcing|POWER RANKINGS|PICK'EMS|REWARDS|NEWS|TICKETS|LOGIN|HOME|SCHEDULE|EVENTS & STANDINGS|Load More|Leagues)$/i.test(line) ||
        /^(ALL REGIONS|INTERNATIONAL|Regional Split|First Stand|MSI|Worlds)$/i.test(line) ||
        /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s/i.test(line) ||
        /^\d+$/.test(line)) {
      i++;
      continue;
    }

    // Date header
    if (dateHeaderRegex.test(line) || relativeDateRegex.test(line)) {
      currentDate = parseDate(line);
      i++;
      continue;
    }

    // CLICK TO REVEAL (spoiler-hidden match) — skip entirely, useless data
    if (/^click to reveal/i.test(line)) {
      i += 3;
      continue;
    }

    // Match entry: try teamA, teamB, league, format
    const teamA = line;
    const teamB = i + 1 < lines.length ? lines[i + 1] : "";
    const leagueStr = i + 2 < lines.length ? lines[i + 2] : "";
    const formatStr = i + 3 < lines.length ? lines[i + 3] : "";

    const isTeamName = (s: string) =>
      /^[A-Za-z0-9 .&'-]{2,25}$/.test(s) && !/^(bo[135]|click|announcing|best)$/i.test(s);

    if (isTeamName(teamB) && leagueStageRegex.test(leagueStr) && formatRegex.test(formatStr)) {
      addMatch(matches, teamA, teamB, currentDate, leagueStr, formatStr);
      i += 4;
      continue;
    }

    // League line followed by format without team names — skip
    if (leagueStageRegex.test(teamA) && formatRegex.test(teamB)) {
      i += 2;
      continue;
    }

    i++;
  }

  // Deduplicate
  const seen = new Set<string>();
  return matches.filter((m) => {
    const key = `${m.teamA}-${m.teamB}-${m.tournament}-${m.startTime}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function addMatch(
  matches: Match[],
  teamA: string,
  teamB: string,
  date: Date,
  leagueStr: string,
  formatStr: string
): void {
  const { league, stage } = parseLeague(leagueStr);
  const format = parseFormat(formatStr);
  const dateStr = date.toISOString().slice(0, 10);
  const now = new Date();

  // Status: dates in the past (by more than 6 hours) are finished
  const matchDate = new Date(`${dateStr}T23:59:59Z`);
  const isPast = matchDate.getTime() < now.getTime() - 6 * 3600 * 1000;
  const hasRealTeams = teamA !== "TBD" && teamB !== "TBD";

  const id = `lol-${dateStr}-${teamA}-${teamB}-${league}`.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase();

  matches.push({
    id,
    game: "lol",
    gameName: "英雄联盟",
    league: league || "LoL",
    tournament: league || "LoL",
    stage,
    teamA,
    teamB,
    startTime: `${dateStr}T12:00:00Z`,
    format,
    status: isPast ? "finished" : "scheduled",
    source: "lolesports",
    sourceUrl: "https://lolesports.com/schedule",
    summary: hasRealTeams && isPast
      ? `${teamA} vs ${teamB}`
      : undefined,
    lastSyncedAt: now.toISOString(),
  });
}

function parseLeague(str: string): { league: string; stage: string } {
  if (!str) return { league: "", stage: "" };
  const parts = str.split(/[•·-]/).map((p) => p.trim());
  const tournament = parts[0] || "";
  const stage = parts[1] || "";

  const leagueMap: Record<string, string> = {
    worlds: "Worlds", msi: "MSI", "first stand": "MSI",
    lpl: "LPL", lck: "LCK", lec: "LEC", lcs: "LCS",
    pcs: "PCS", vcs: "VCS",
  };

  const lower = tournament.toLowerCase();
  return { league: leagueMap[lower] || tournament, stage };
}

function parseFormat(str: string): string | undefined {
  const m = str?.match(/bo(\d)/i);
  return m ? `BO${m[1]}` : undefined;
}

function parseDate(line: string): Date {
  const now = new Date();
  const lower = line.toLowerCase().trim();

  if (lower === "today") return now;
  if (lower === "yesterday") { const d = new Date(now); d.setDate(d.getDate() - 1); return d; }
  if (lower === "tomorrow") { const d = new Date(now); d.setDate(d.getDate() + 1); return d; }

  // "Tuesday Oct 28, 2025" → Month Day format
  const m = line.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})/i);
  if (!m) return now;

  const month = MONTHS[m[1].toLowerCase()];
  const day = parseInt(m[2]);
  const yearMatch = line.match(/(\d{4})/);
  const year = yearMatch ? parseInt(yearMatch[1]) : now.getFullYear();
  const d = new Date(Date.UTC(year, month, day));
  return isNaN(d.getTime()) ? now : d;
}

/**
 * Cleanup browser on shutdown
 */
export async function closeScraper(): Promise<void> {
  if (_browser) {
    await _browser.close();
    _browser = null;
  }
}
