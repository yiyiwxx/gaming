import "dotenv/config";

import { ensureSqliteSchema } from "@/lib/db/sqlite";

const dbPath = ensureSqliteSchema();
console.log(`SQLite schema ready at ${dbPath}`);
