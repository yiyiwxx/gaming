// Try POST RSC request to resolve Suspense boundaries
async function main() {
  const baseUrl = "https://lolesports.com/schedule?leagues=lpl,lck,lec,lcs,msi,worlds";

  // First, get the initial RSC to extract the _rsc parameter
  console.log("=== Step 1: GET initial RSC ===");
  const getResp = await fetch(baseUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "RSC": "1",
      "Next-Router-State-Tree": "%5B%22%22%2C%7B%22children%22%3A%5B%22schedule%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D",
      "Accept": "text/x-component",
    },
  });

  const initialRSC = await getResp.text();
  console.log(`Initial RSC: ${initialRSC.length} chars`);

  // Try POST to resolve Suspense
  console.log("\n=== Step 2: POST for Suspense resolution ===");
  
  // Extract the page path from the URL
  const url = new URL(baseUrl);
  const pathname = url.pathname + url.search;
  
  // Try different POST approaches
  const approaches = [
    {
      desc: "POST with Next-Url",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "RSC": "1",
        "Next-Url": pathname,
        "Next-Router-State-Tree": "%5B%22%22%2C%7B%22children%22%3A%5B%22schedule%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D",
        "Content-Type": "text/x-component",
      },
      body: "",
    },
    {
      desc: "POST with RSC param",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "RSC": "1",
        "Next-Router-State-Tree": "%5B%22%22%2C%7B%22children%22%3A%5B%22schedule%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D",
        "Content-Type": "text/x-component",
      },
      body: JSON.stringify([pathname]),
    },
    {
      desc: "GET with _rsc query",
      url: baseUrl + "&_rsc=1",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "RSC": "1",
        "Next-Router-State-Tree": "%5B%22%22%2C%7B%22children%22%3A%5B%22schedule%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D",
        "Accept": "text/x-component",
      },
    },
  ];

  for (const approach of approaches) {
    console.log(`\nTrying: ${approach.desc}`);
    try {
      const targetUrl = (approach as any).url || baseUrl;
      const method = (approach as any).body !== undefined ? "POST" : "GET";
      const options: any = {
        method,
        headers: approach.headers,
      };
      if ((approach as any).body !== undefined) {
        options.body = (approach as any).body;
      }

      const resp = await fetch(targetUrl, options);
      const text = await resp.text();
      console.log(`Status: ${resp.status}, Content-Type: ${resp.headers.get("content-type")?.slice(0, 60)}`);
      console.log(`Response: ${text.slice(0, 500)}`);
      
      // Check if we got event/match data
      if (text.includes("event") || text.includes("match") || text.includes("team") || text.includes("T1") || text.includes("BLG")) {
        console.log("FOUND EVENT/MATCH DATA!");
        console.log(`\nFull response (${text.length} chars):`);
        console.log(text.slice(0, 5000));
      }
    } catch (err) {
      console.log(`Error: ${(err as Error).message}`);
    }
  }

  // Alternative: try direct API call with the persisted query approach
  console.log("\n\n=== Step 3: Try persisted query API ===");
  
  const persistedUrls = [
    "https://esports-api.lolesports.com/persisted/gw/getSchedule?hl=en-US&leagueId=98767991299243165",
    "https://esports-api.lolesports.com/persisted/gw/getLive?hl=en-US",
    "https://esports-api.lolesports.com/persisted/gw/getCompletedEvents?hl=en-US&leagueId=98767991299243165",
  ];

  for (const apiUrl of persistedUrls) {
    try {
      const r = await fetch(apiUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
          "Origin": "https://lolesports.com",
          "Referer": "https://lolesports.com/schedule",
          "x-api-key": "", // Try without key first
        },
      });
      const body = await r.text();
      console.log(`${apiUrl.split("/").pop()?.split("?")[0]}: ${r.status} (${body.slice(0, 200)})`);
    } catch (err) {
      console.log(`${apiUrl.split("/").pop()}: Error - ${(err as Error).message}`);
    }
  }
}

main().catch(console.error);
