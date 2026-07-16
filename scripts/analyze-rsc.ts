// Get clean RSC response and analyze for match data
async function main() {
  const url = "https://lolesports.com/schedule?leagues=lpl,lck,lec,lcs,msi,worlds";
  console.log(`Fetching with RSC headers: ${url}`);

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "RSC": "1",
      "Next-Router-State-Tree": "%5B%22%22%2C%7B%22children%22%3A%5B%22schedule%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D",
      "Accept": "text/x-component",
    },
  });

  const rscText = await response.text();
  console.log(`RSC response: ${rscText.length} chars`);
  
  // Save to file for analysis
  const fs = await import("fs");
  fs.writeFileSync("scripts/rsc_response.txt", rscText);
  console.log("Saved to scripts/rsc_response.txt");

  // Analyze the RSC format
  // RSC format uses newlines as separators between chunks
  const lines = rscText.split("\n");
  console.log(`Lines: ${lines.length}`);

  // Show first 10 lines
  console.log("\n=== First 10 lines ===");
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    console.log(`L${i + 1} (${lines[i].length}): ${lines[i].slice(0, 200)}`);
  }

  // Search for match/event data patterns
  const searches = [
    "matchId",
    "eventId",
    "startTime",
    "team",
    "league",
    "tournament",
    "schedule",
    "blockName",
    "HomeFeed",
    "todayEvents",
    "futureEvents",
    '"code"',
    '"name"',
    'T1',
    'BLG',
    'GEN',
  ];

  console.log("\n=== Search hits ===");
  for (const s of searches) {
    const count = (rscText.match(new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "gi")) || []).length;
    if (count > 0) {
      console.log(`"${s}": ${count} occurrences`);
    }
  }

  // Try to parse RSC line format
  // RSC lines are: ID:JSON
  console.log("\n=== Parsing RSC lines ===");
  let foundData = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length === 0) continue;
    
    // RSC format: <number>:<data>
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0 && colonIdx < 10) {
      const idPart = line.slice(0, colonIdx);
      const dataPart = line.slice(colonIdx + 1);
      
      if (dataPart.includes("event") || dataPart.includes("match") || dataPart.includes("team") || dataPart.includes("schedule")) {
        console.log(`\nL${i + 1}: ID=${idPart}`);
        console.log(dataPart.slice(0, 1000));
        if (dataPart.length > 1000) {
          console.log(`... (${dataPart.length - 1000} more chars)`);
          console.log(`Last 500: ${dataPart.slice(-500)}`);
        }
        foundData = true;
      }
    }
  }

  if (!foundData) {
    console.log("\nNo RSC lines found with event/match data in key:value format");
    // Try analyzing as JSON parseable chunks
    console.log("\n=== Trying JSON parse on each line ===");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.length < 10) continue;
      
      const colonIdx = line.indexOf(":");
      if (colonIdx > 0 && colonIdx < 10) {
        const dataPart = line.slice(colonIdx + 1);
        try {
          const json = JSON.parse(dataPart);
          const str = JSON.stringify(json);
          if (str.includes("event") || str.includes("match") || str.includes("team") || str.includes("T1") || str.includes("BLG")) {
            console.log(`\nL${i + 1}: Parseable JSON with match data`);
            console.log(str.slice(0, 1500));
          }
        } catch {
          // Not valid JSON, skip
        }
      }
    }
  }

  // Look at the full text for any JSON-like structures
  console.log("\n=== License/raw content patterns ===");
  
  // Check for "M1:" format (RSC line prefix)
  const mPrefixCount = (rscText.match(/^[A-Z]?\d+:["\[]/gm) || []).length;
  console.log(`Lines with RSC prefix format: ${mPrefixCount}`);

  // Check what the BEGINNING of real content looks like
  // Usually first meaningful line after metadata
  const firstContentIndex = lines.findIndex(l => l.length > 5 && !l.startsWith("0:") && !l.startsWith("1:"));
  if (firstContentIndex > 0) {
    console.log(`\nFirst content line (L${firstContentIndex + 1}):`);
    console.log(lines[firstContentIndex].slice(0, 500));
  }
}

main().catch(console.error);
