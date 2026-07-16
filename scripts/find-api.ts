// Find the API endpoint used by HomeFeedTodayEvents component
async function main() {
  const url = "https://lolesports.com/schedule?leagues=lpl,lck,lec,lcs,msi";
  console.log(`Fetching: ${url}`);

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
  });

  const html = await response.text();

  // Find all JS chunk references
  const chunkPattern = /\/_next\/static\/chunks\/([a-zA-Z0-9_-]+\.js)/g;
  const chunks = [...new Set([...html.matchAll(chunkPattern)].map(m => m[1]))];
  console.log(`Found ${chunks.length} unique JS chunks\n`);

  // Find chunks that likely contain the schedule/event component
  // The chunks near "HomeFeed" or "TodayEvents" or "schedule"
  const rscContext = html;

  // Look for chunk references near event-related payloads
  const eventChunks: string[] = [];
  const rscRegex = /self\.__next_f\.push\(\[1,\s*"((?:[^"\\]|\\.)*)"\]\)/g;
  let match;
  while ((match = rscRegex.exec(rscContext)) !== null) {
    const raw = match[1];
    if (raw.includes("HomeFeed") || raw.includes("TodayEvents") || raw.includes("FutureEvents") || raw.includes("Schedule")) {
      // Find chunks in this payload
      const nearby = rscContext.slice(Math.max(0, match.index - 1000), match.index + 5000);
      const refs = [...nearby.matchAll(/"([a-zA-Z0-9_-]+\.js)"/g)];
      for (const r of refs) {
        if (!eventChunks.includes(r[1])) eventChunks.push(r[1]);
      }
    }
  }

  console.log(`Event-related chunks: ${eventChunks.join(", ")}\n`);

  // Download and analyze event-related JS chunks
  for (const chunk of eventChunks.slice(0, 5)) {
    const chunkUrl = `https://lolesports.com/_next/static/chunks/${chunk}`;
    console.log(`\n=== Downloading: ${chunk} ===`);
    
    try {
      const chunkResp = await fetch(chunkUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (chunkResp.ok) {
        const js = await chunkResp.text();
        console.log(`Size: ${js.length} chars`);

        // Search for API patterns
        const apiPatterns = [
          /fetch\(["']([^"']*(?:api|schedule|event|match|league|graphql|persisted)[^"']*)["']/gi,
          /url:\s*["']([^"']*(?:api|schedule|event|match|league|persisted)[^"']*)["']/gi,
          /["'](\/api\/[^"']*(?:schedule|event|match)[^"']*)["']/gi,
          /esports-api\.lolesports\.com[^"'\s]*/gi,
          /graphql[^"'\s]*/gi,
          /getSchedule[^"'\s]*/gi,
          /getEvents[^"'\s]*/gi,
          /getMatches[^"'\s]*/gi,
          /HomeFeed[^"'\s]*/gi,
          /leagueId[^"'\s]*/gi,
        ];

        for (const pattern of apiPatterns) {
          const hits = [...js.matchAll(pattern)];
          if (hits.length > 0) {
            console.log(`  Pattern "${pattern.source.slice(0, 60)}": ${hits.length} hits`);
            for (const h of hits.slice(0, 3)) {
              console.log(`    -> ${h[0]}`);
            }
          }
        }
      } else {
        console.log(`Failed: ${chunkResp.status}`);
      }
    } catch (err) {
      console.log(`Error: ${(err as Error).message}`);
    }
  }

  // Alternative: try known esports API endpoints
  console.log("\n\n=== Trying known API endpoints ===\n");

  const apis = [
    "https://esports-api.lolesports.com/persisted/gw/getSchedule?hl=en-US",
    "https://esports-api.lolesports.com/persisted/gw/getLeagues?hl=en-US",
    "https://esports-api.lolesports.com/persisted/gw/getTournamentsForLeague?hl=en-US&leagueId=98767991299243165",
    "https://feed.lolesports.com/livestats/v1/window/latest",
    "https://feed.lolesports.com/livestats/v1/schedule",
  ];

  for (const apiUrl of apis) {
    try {
      const r = await fetch(apiUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json",
          "Origin": "https://lolesports.com",
          "Referer": "https://lolesports.com/",
        },
      });
      console.log(`${apiUrl}: ${r.status} (${r.headers.get("content-type")?.slice(0, 40)})`);
      if (r.ok && r.headers.get("content-type")?.includes("json")) {
        const text = await r.text();
        console.log(`  Body: ${text.slice(0, 500)}`);
      }
    } catch (err) {
      console.log(`${apiUrl}: Error - ${(err as Error).message}`);
    }
  }
}

main().catch(console.error);
