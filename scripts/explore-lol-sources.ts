async function main() {
  const res = await fetch("https://lolesports.com/schedule?leagues=lpl,lck", {
    headers: { "User-Agent": "Mozilla/5.0", "Accept": "text/html" },
  });
  const html = await res.text();
  
  // Extract all JS chunk URLs
  const jsChunks = [...html.matchAll(/\/_next\/static\/chunks\/[^"'\s]+\.js/g)].map(m => m[0]);
  console.log(`Found ${jsChunks.length} JS chunks`);
  
  // Download a few key chunks and search for API endpoints
  const uniqueChunks = [...new Set(jsChunks)];
  const apiEndpoints = new Set<string>();
  
  for (let i = 0; i < Math.min(5, uniqueChunks.length); i++) {
    const url = `https://lolesports.com${uniqueChunks[i]}`;
    try {
      const jsRes = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      const js = await jsRes.text();
      
      // Search for API-like patterns
      const patterns = [
        /https:\/\/[a-z.-]+\.lolesports\.com\/[^"'\s]+/g,
        /\/api\/[^"'\s]+/g,
        /\/persisted\/[^"'\s]+/g,
        /graphql[^"'\s]*/gi,
        /"events"[^}]*"match"/g,
        /getSchedule/gi,
        /getEvent/gi,
        /getMatch/gi,
        /esports-api/gi,
      ];
      
      for (const pattern of patterns) {
        const matches = js.match(pattern);
        if (matches) {
          for (const m of matches) {
            apiEndpoints.add(m.slice(0, 200));
          }
        }
      }
    } catch (e) { /* skip */ }
  }
  
  console.log(`\nFound ${apiEndpoints.size} API-like patterns:`);
  apiEndpoints.forEach(e => console.log(" ", e));
}

main().catch(console.error);
