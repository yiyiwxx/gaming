import "dotenv/config";

import { prisma } from "@/lib/db/prisma";
import { ensureSqliteSchema } from "@/lib/db/sqlite";
import { syncMatches } from "@/lib/sync/syncMatches";

async function main() {
  ensureSqliteSchema();
  const results = await syncMatches();
  const total = results.reduce((sum, result) => sum + result.syncedCount, 0);
  console.log(JSON.stringify({ total, results }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
