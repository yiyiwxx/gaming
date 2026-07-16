// 清理 TBD 和远古数据
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Delete TBD vs TBD finished (spoiler-hidden matches)
  const tbd = await prisma.match.deleteMany({
    where: { teamA: "TBD", teamB: "TBD", status: "finished" },
  });
  console.log("Deleted finished TBD:", tbd.count);

  // Delete pre-2026 lolesports matches (Worlds 2025)
  const old = await prisma.match.deleteMany({
    where: { source: "lolesports", startTime: { lt: "2026-01-01T00:00:00Z" } },
  });
  console.log("Deleted pre-2026:", old.count);

  // Show counts
  const counts = await prisma.match.groupBy({ by: ["source", "status"], _count: true });
  counts.sort((a, b) => a.source.localeCompare(b.source));
  for (const c of counts) console.log(" ", c.source.padEnd(12), c.status.padEnd(12), c._count);
  console.log("  Total:", counts.reduce((s, c) => s + c._count, 0));
}
main().finally(() => prisma.$disconnect());
