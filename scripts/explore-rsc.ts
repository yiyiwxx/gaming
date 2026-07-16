// Explore RSC payload structure
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
  console.log(`HTML: ${html.length} chars\n`);

  // Extract RSC payloads
  const rscRegex = /self\.__next_f\.push\(\[1,\s*"((?:[^"\\]|\\.)*)"\]\)/g;
  let match;
  let count = 0;

  while ((match = rscRegex.exec(html)) !== null && count < 30) {
    const raw = match[1];
    // Unescape
    const unescaped = raw
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\t/g, "\t")
      .replace(/\\\\/g, "\\");

    count++;
    console.log(`\n=== RSC Payload #${count} (${unescaped.length} chars) ===`);

    // Look for match-related patterns
    const patterns = [
      "match",
      "team",
      "league",
      "schedule",
      "event",
      "tournament",
      "startTime",
      '"code":',
      '"name":',
      '"slug":',
      "T1",
      "BLG",
      "GEN",
      "LPL",
      "LCK",
      "MSI",
    ];

    let hasMatchData = false;
    for (const p of patterns) {
      if (unescaped.includes(p)) {
        hasMatchData = true;
        break;
      }
    }

    if (hasMatchData) {
      console.log("[Contains match-related data]");
      console.log(unescaped.slice(0, 2000));
      if (unescaped.length > 2000) {
        console.log(`\n... (${unescaped.length - 2000} more chars) ...`);
        console.log(`\nLast 500 chars:`);
        console.log(unescaped.slice(-500));
      }
    } else {
      console.log(`[No match data] First 200 chars: ${unescaped.slice(0, 200)}`);
    }
  }

  // Also check for inline JSON/script data
  console.log("\n\n=== Checking for embedded data ===");
  
  // __NEXT_DATA__
  if (html.includes("__NEXT_DATA__")) {
    console.log("Found __NEXT_DATA__");
  } else {
    console.log("No __NEXT_DATA__");
  }

  // window.__INITIAL_STATE__ or similar patterns
  const statePatterns = [
    /window\.__INITIAL_STATE__\s*=\s*({[^<]+})/g,
    /window\.__DATA__\s*=\s*({[^<]+})/g,
    /window\.__PRELOADED_STATE__\s*=\s*({[^<]+})/g,
  ];
  for (const p of statePatterns) {
    const m = p.exec(html);
    if (m) {
      console.log(`Found state: ${m[1].slice(0, 200)}`);
    }
  }

  // Look for JSON blobs with schedule/event data
  const jsonBlobs = html.match(/\{[^}]*"schedule"[^}]*\}/g);
  if (jsonBlobs) {
    console.log(`\nFound ${jsonBlobs.length} JSON blobs with "schedule":`);
    for (const blob of jsonBlobs.slice(0, 3)) {
      console.log(blob.slice(0, 300));
    }
  }
}

main().catch(console.error);
