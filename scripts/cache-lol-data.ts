// Cache the Playwright scrape results — multi-pass for completeness
import { scrapeLoLSchedule, closeScraper } from "../src/lib/connectors/lolScraper";
import fs from "fs";
import { Match } from "../src/lib/connectors/types";

async function main() {
  const allMatches: Match[] = [];

  // Pass 1: MSI 2026 only (to get the knockout stages)
  console.log("=== Pass 1: MSI only ===");
  const msiMatches = await scrapeLoLSchedule(["msi"]);
  console.log(`MSI: ${msiMatches.length} matches`);
  allMatches.push(...msiMatches);

  // Pass 2: Worlds only (Worlds 2025)
  console.log("\n=== Pass 2: Worlds only ===");
  const worldsMatches = await scrapeLoLSchedule(["worlds"]);
  console.log(`Worlds: ${worldsMatches.length} matches`);
  allMatches.push(...worldsMatches);

  // Pass 3: All regional leagues
  console.log("\n=== Pass 3: Regional leagues ===");
  const regionalMatches = await scrapeLoLSchedule(["lpl", "lck", "lec", "lcs"]);
  console.log(`Regional: ${regionalMatches.length} matches`);
  allMatches.push(...regionalMatches);

  await closeScraper();

  // Deduplicate
  const seen = new Set<string>();
  const unique = allMatches.filter((m) => {
    const key = `${m.teamA}-${m.teamB}-${m.tournament}-${m.startTime?.slice(0, 10)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`\n=== Total: ${unique.length} unique matches ===`);

  // Group by tournament
  const byTournament: Record<string, number> = {};
  for (const m of unique) {
    const key = m.tournament || "Unknown";
    byTournament[key] = (byTournament[key] || 0) + 1;
  }
  for (const [t, c] of Object.entries(byTournament)) {
    console.log(`  ${t}: ${c}`);
  }

  // Show date range
  const dates = unique.map((m) => m.startTime?.slice(0, 10)).filter(Boolean).sort();
  if (dates.length > 0) {
    console.log(`\nDate range: ${dates[0]} ~ ${dates[dates.length - 1]}`);
  }

  // Save cache
  const cachePath = "data/lol-schedule-cache.json";
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify({
    scrapedAt: new Date().toISOString(),
    count: unique.length,
    matches: unique,
  }, null, 2));

  console.log(`\nSaved to ${cachePath}`);
  console.log(`File size: ${(fs.statSync(cachePath).size / 1024).toFixed(1)} KB`);
}

main().catch(console.error);
