// Seed database with cached Playwright data
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  const cachePath = path.join(process.cwd(), "data", "lol-schedule-cache.json");
  
  if (!fs.existsSync(cachePath)) {
    console.log("No cache file found");
    return;
  }

  const raw = fs.readFileSync(cachePath, "utf-8");
  const entry = JSON.parse(raw);
  const matches = entry.matches;

  console.log(`Read ${matches.length} matches from cache`);
  console.log(`Scraped at: ${entry.scrapedAt}`);

  let inserted = 0;
  let updated = 0;

  for (const match of matches) {
    const existing = await prisma.match.findUnique({ where: { id: match.id } });
    
    if (existing) {
      await prisma.match.update({
        where: { id: match.id },
        data: {
          game: match.game,
          gameName: match.gameName,
          league: match.league,
          tournament: match.tournament,
          stage: match.stage || null,
          teamA: match.teamA,
          teamB: match.teamB,
          startTime: match.startTime,
          endTime: match.endTime || null,
          format: match.format || null,
          status: match.status,
          source: match.source,
          sourceUrl: match.sourceUrl || null,
          streamUrl: match.streamUrl || null,
          summary: match.summary || null,
          lastSyncedAt: new Date(match.lastSyncedAt),
        },
      });
      updated++;
    } else {
      await prisma.match.create({
        data: {
          id: match.id,
          game: match.game,
          gameName: match.gameName,
          league: match.league,
          tournament: match.tournament,
          stage: match.stage || null,
          teamA: match.teamA,
          teamB: match.teamB,
          startTime: match.startTime,
          endTime: match.endTime || null,
          format: match.format || null,
          status: match.status,
          source: match.source,
          sourceUrl: match.sourceUrl || null,
          streamUrl: match.streamUrl || null,
          summary: match.summary || null,
          lastSyncedAt: new Date(match.lastSyncedAt),
        },
      });
      inserted++;
    }

    if ((inserted + updated) % 10 === 0) {
      console.log(`  Progress: ${inserted + updated}/${matches.length}`);
    }
  }

  console.log(`\nDone! ${inserted} inserted, ${updated} updated`);

  // Show counts
  const counts = await prisma.match.groupBy({
    by: ["source"],
    _count: true,
  });
  console.log("\nDatabase content:");
  for (const c of counts) {
    console.log(`  source=${c.source}: ${c._count} matches`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
