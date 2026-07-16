// Test script: Verify LoL parser fetches real data from lolesports.com
import { parseLoLHtml } from "../src/lib/connectors/lolParser";

async function main() {
  console.log("=== Testing LoL Parser ===\n");

  // Test 1: lolesports.com schedule with LPL+LCK
  const url = "https://lolesports.com/schedule?leagues=lpl,lck,lec,lcs,msi";
  console.log(`Fetching: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      console.log(`HTTP Error: ${response.status} ${response.statusText}`);
      return;
    }

    const html = await response.text();
    console.log(`Got HTML: ${html.length} chars`);

    const matches = parseLoLHtml(html);
    console.log(`\nParsed ${matches.length} matches:\n`);

    // Group by league
    const byLeague: Record<string, typeof matches> = {};
    for (const m of matches) {
      const key = m.league || "Unknown";
      if (!byLeague[key]) byLeague[key] = [];
      byLeague[key].push(m);
    }

    for (const [league, ms] of Object.entries(byLeague)) {
      console.log(`\n--- ${league} (${ms.length} matches) ---`);
      for (const m of ms.slice(0, 10)) {
        const date = m.startTime
          ? new Date(m.startTime).toLocaleDateString("zh-CN")
          : "N/A";
        const score = m.summary || "";
        console.log(
          `  [${date}] ${m.teamA} vs ${m.teamB} | ${m.tournament || ""} | ${m.format || ""} | ${m.status}`
        );
      }
      if (ms.length > 10) {
        console.log(`  ... and ${ms.length - 10} more`);
      }
    }

    if (matches.length === 0) {
      console.log("\nNo matches parsed. Saving sample HTML...");
      // Save first 3000 chars for debugging
      console.log("HTML sample (first 500 chars):");
      console.log(html.slice(0, 500));
      console.log("...");
      console.log("HTML sample (last 500 chars):");
      console.log(html.slice(-500));

      // Check for __NEXT_DATA__
      if (html.includes("__NEXT_DATA__")) {
        console.log("\n[INFO] Found __NEXT_DATA__ in HTML");
      }
      // Check for RSC payload
      const rscCount = (html.match(/self\.__next_f\.push/g) || []).length;
      console.log(`[INFO] Found ${rscCount} RSC payload entries`);
    }
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

main().catch(console.error);
