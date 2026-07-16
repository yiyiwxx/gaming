// Download and analyze the page JS bundle to find the API endpoint
async function main() {
  // The page bundle that contains HomeFeedTodayEvents and HomeFeedFutureEvents  
  const bundles = [
    "https://lolesports.com/_next/static/chunks/app/%5Blocale%5D/lolesports/leagues/%5Bleagues%5D/page-e5089b9462d2bc01.js",
    "https://lolesports.com/_next/static/chunks/8674-6ccdc8f7ad00aab5.js",
  ];

  for (const url of bundles) {
    console.log(`\n=== ${url.split("/").pop()} ===`);
    
    try {
      const resp = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      });

      if (!resp.ok) {
        console.log(`Failed: ${resp.status}`);
        continue;
      }

      const js = await resp.text();
      console.log(`Size: ${js.length} chars`);

      // Search for API endpoint patterns
      const patterns = [
        /fetch\(["'`]([^"'`]*(?:api|schedule|event|match|league|persisted|graphql|feed)[^"'`]*)["'`]/gi,
        /["'`]https?:\/\/[^"'`]*(?:api|esports|schedule|match|persisted)[^"'`]*["'`]/gi,
        /["'`](\/api\/[^"'`]*)["'`]/gi,
        /apiUrl|API_URL|apiEndpoint|API_ENDPOINT[^=]*=\s*["'`]([^"'`]*)["'`]/gi,
        /baseUrl|BASE_URL[^=]*=\s*["'`]([^"'`]*)["'`]/gi,
        /getSchedule|getEvents|getMatches|getLive|getStandings|getLeagues/gi,
        /graphql|GraphQL|persisted/gi,
        /lolesports\.com\/[a-z]+\/[a-z]+/gi,
        /function\s+get(?:Schedule|Events|Matches|HomeFeed|TodayEvents|FutureEvents)/gi,
      ];

      for (const pattern of patterns) {
        const hits = [...js.matchAll(pattern)];
        for (const h of hits.slice(0, 5)) {
          const matchText = h[0] || h[1] || "";
          if (matchText.length > 0 && matchText.length < 200) {
            console.log(`  ${matchText}`);
          }
        }
      }

      // Also look for Next.js specific patterns
      const nextPatterns = [
        /["'`]\/_next\/[^"'`]*["'`]/g,
        /router\.(?:push|replace|refresh)\(/g,
        /useSearchParams|searchParams|query/g,
      ];
      
      for (const pattern of nextPatterns) {
        const count = [...js.matchAll(pattern)].length;
        if (count > 0) {
          console.log(`  [${pattern.source.slice(0, 40)}]: ${count} matches`);
        }
      }
    } catch (err) {
      console.log(`Error: ${(err as Error).message}`);
    }
  }
}

main().catch(console.error);
