// Check for type 0 RSC pushes, stream tail, and all push formats
async function main() {
  const url = "https://lolesports.com/schedule?leagues=lpl,lck,lec,lcs,msi";
  console.log(`Fetching: ${url}`);

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "RSC": "1",
      "Next-Router-State-Tree": "%5B%22%22%2C%7B%22children%22%3A%5B%22schedule%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D",
    },
  });

  const html = await response.text();
  console.log(`HTML: ${html.length} chars\n`);

  // Check all push formats
  const push0Regex = /self\.__next_f\.push\(\[0,\s*"((?:[^"\\]|\\.)*)"\]\)/g;
  const push1Regex = /self\.__next_f\.push\(\[1,\s*"((?:[^"\\]|\\.)*)"\]\)/g;

  let push0Count = 0;
  let match0;
  while ((match0 = push0Regex.exec(html)) !== null) {
    push0Count++;
    const unescaped = match0[1]
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\t/g, "\t")
      .replace(/\\\\/g, "\\");
    
    if (push0Count <= 3) {
      console.log(`Type 0 push #${push0Count}: ${unescaped.slice(0, 300)}`);
    }
  }

  let push1Count = 0;
  let match1;
  while ((match1 = push1Regex.exec(html)) !== null) {
    push1Count++;
  }

  console.log(`\nType 0 pushes: ${push0Count}`);
  console.log(`Type 1 pushes: ${push1Count}`);

  // Check for data after the LAST self.__next_f.push
  const lastPushIdx = html.lastIndexOf("self.__next_f.push");
  if (lastPushIdx > 0) {
    // Find the end of that push statement
    const afterLastPush = html.slice(lastPushIdx);
    const closeIdx = afterLastPush.indexOf("\n\n");
    const tail = closeIdx > 0 ? afterLastPush.slice(closeIdx + 2) : "";
    console.log(`\nTail after last push (${tail.length} chars):`);
    console.log(tail.slice(0, 1000));
    if (tail.length > 1000) {
      console.log(`\n... Last 1000 chars of tail:`);
      console.log(tail.slice(-1000));
    }
  }

  // Look for inline JSON data blobs
  console.log("\n=== Looking for inline JSON with match data ===");
  const jsonInScript = html.match(/<script[^>]*id="[^"]*"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g);
  if (jsonInScript) {
    console.log(`Found ${jsonInScript.length} JSON script tags`);
    for (const tag of jsonInScript.slice(0, 3)) {
      console.log(tag.slice(0, 500));
    }
  }

  // Look for window.__ data
  const windowData = html.match(/window\.__\w+\s*=\s*({[^;]*)/g);
  if (windowData) {
    console.log(`\nFound ${windowData.length} window.__ data assignments`);
    for (const wd of windowData.slice(0, 3)) {
      console.log(wd.slice(0, 300));
    }
  }

  // Last resort: search for any JSON array containing match-level data
  // Look for patterns with "match" object containing team codes
  console.log("\n=== Searching raw HTML for match JSON patterns ===");
  const matchJsonPattern = /\{"match":\s*\{[^}]*"teams":\s*\[/g;
  const matchHits = [...html.matchAll(matchJsonPattern)];
  console.log(`Found ${matchHits.length} potential match JSON objects`);
  for (const h of matchHits.slice(0, 2)) {
    const ctx = html.slice(Math.max(0, h.index! - 50), Math.min(html.length, h.index! + 500));
    console.log(ctx.slice(0, 500));
  }

  // Search for team codes paired with scores in JSON context
  const scorePattern = /"code"\s*:\s*"([A-Z]{2,4})"[^}]*"score"\s*:\s*(\d+)/g;
  const scoreHits = [...html.matchAll(scorePattern)];
  if (scoreHits.length > 0) {
    console.log(`\nFound ${scoreHits.length} team-score pairs:`);
    for (const h of scoreHits.slice(0, 20)) {
      console.log(`  ${h[1]}: score=${h[2]}`);
    }
  }
}

main().catch(console.error);
