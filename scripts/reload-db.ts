import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();
const CACHE_PATH = "data/lol-schedule-cache.json";

async function main() {
  // Delete all existing lolesports matches
  const deleted = await prisma.match.deleteMany({ where: { source: "lolesports" } });
  console.log(`Deleted ${deleted.count} old lolesports matches`);

  // Read cache and insert fresh
  const cache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
  const matches = cache.matches;
  console.log(`Read ${matches.length} matches from cache`);

  let inserted = 0;
  for (const m of matches) {
    try {
      await prisma.match.create({ data: m });
      inserted++;
    } catch (e: any) {
      if (e.code === "P2002") continue; // duplicate, skip
      console.error(`Error inserting ${m.id}:`, e.message);
    }
    if (inserted % 50 === 0) console.log(`  Progress: ${inserted}/${matches.length}`);
  }

  console.log(`Inserted ${inserted} fresh matches`);

  // Show final stats
  const counts = await prisma.match.groupBy({ by: ["source", "status"], _count: true });
  for (const c of counts) console.log(" ", c.source.padEnd(12), c.status.padEnd(12), c._count);
  console.log("  Total:", counts.reduce((s, c) => s + c._count, 0));

  // Show latest MSI dates
  const latest = await prisma.match.findMany({
    where: { tournament: "MSI" },
    orderBy: { startTime: "desc" },
    take: 8,
  });
  console.log("\nLatest MSI:");
  latest.forEach((m) =>
    console.log(" ", m.startTime.toISOString().slice(0, 10), m.teamA, "vs", m.teamB, "|", m.stage)
  );
}
main().finally(() => prisma.$disconnect());
