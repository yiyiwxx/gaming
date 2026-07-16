// Quick test: verify VLR.gg data + LoL mock data
import { getValorantMatches } from "../src/lib/connectors/valorantConnector";

async function main() {
  // Test 1: VLR.gg Valorant real data
  console.log("=== Test 1: VLR.gg Valorant ===\n");
  try {
    const vlrMatches = await getValorantMatches();
    console.log(`VLR.gg returned ${vlrMatches.length} matches`);
    if (vlrMatches.length > 0) {
      // Show first 3
      for (const m of vlrMatches.slice(0, 3)) {
        console.log(`  ${m.teamA} vs ${m.teamB} | ${m.tournament || m.league} | ${m.startTime}`);
      }
      if (vlrMatches.length > 3) console.log(`  ... and ${vlrMatches.length - 3} more`);
    }
  } catch (err) {
    console.error("VLR test failed:", (err as Error).message);
  }

  // Test 2: LoL Mock data
  console.log("\n=== Test 2: LoL Mock Data ===\n");
  const { mockLoLMatches } = await import("../src/lib/matches/mockData");
  const now = new Date();
  const future = mockLoLMatches.filter(m => new Date(m.startTime) > now);
  const past = mockLoLMatches.filter(m => new Date(m.startTime) <= now);
  console.log(`Total mock: ${mockLoLMatches.length} (${future.length} upcoming, ${past.length} finished)`);
  for (const m of future.slice(0, 5)) {
    const d = new Date(m.startTime).toLocaleDateString("zh-CN");
    console.log(`  [${d}] ${m.teamA} vs ${m.teamB} | ${m.tournament} | ${m.stage || ""}`);
  }

  // Test 3: LoL Connector (will fallback to mock since lolesports raw fetch won't get data)
  console.log("\n=== Test 3: LoL Connector ===\n");
  const { getLoLMatches } = await import("../src/lib/connectors/lolConnector");
  const lolMatches = await getLoLMatches();
  console.log(`Got ${lolMatches.length} LoL matches`);
}

main().catch(console.error);
