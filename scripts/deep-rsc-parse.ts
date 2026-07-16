// Deep RSC payload analysis - find LoL match data in lolesports.com RSC stream
async function main() {
  const url = "https://lolesports.com/schedule?leagues=lpl,lck,lec,lcs,msi,worlds,kespa,all-star";
  console.log(`Fetching: ${url}`);

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
  });

  const html = await response.text();
  console.log(`HTML: ${html.length} chars\n`);

  // Extract and combine all RSC payloads
  const rscRegex = /self\.__next_f\.push\(\[1,\s*"((?:[^"\\]|\\.)*)"\]\)/g;
  let match;
  let fullRSC = "";
  const payloads: string[] = [];

  while ((match = rscRegex.exec(html)) !== null) {
    const raw = match[1];
    const unescaped = raw
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\t/g, "\t")
      .replace(/\\\\/g, "\\");
    payloads.push(unescaped);
    fullRSC += unescaped + "\n---PAYLOAD_BOUNDARY---\n";
  }

  console.log(`Total RSC payloads: ${payloads.length}`);
  console.log(`Combined RSC size: ${fullRSC.length} chars\n`);

  // Search for match/event/schedule related keywords
  const keywords = [
    "matchId", "eventId", "schedule", "event", "match",
    "startTime", "startDate", "dateTime",
    '"code":"', '"name":"', '"slug":"',
    '"teamA"', '"teamB"', '"teams"', '"participants"',
    '"league"', '"tournament"', '"stage"',
    '"bestOf"', '"strategy"', '"format"',
    '"state"', '"status"', '"blockName"',
    '"blockLabel"', '"matchType"',
    '"todayEvents"', '"futureEvents"', '"pastEvents"',
  ];

  console.log("=== Searching for match data patterns in ALL payloads ===\n");

  for (let i = 0; i < payloads.length; i++) {
    const p = payloads[i];
    const hits: string[] = [];

    for (const kw of keywords) {
      const count = (p.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "gi")) || []).length;
      if (count > 0) {
        hits.push(`${kw}(${count})`);
      }
    }

    if (hits.length > 0) {
      console.log(`Payload #${i + 1}: ${hits.join(", ")}`);
    }
  }

  // Now look for JSON structures in the combined RSC
  console.log("\n=== Looking for JSON event/match data ===\n");

  // Pattern 1: Direct JSON arrays of events
  const eventArrayMatch = fullRSC.match(/\[[\s\S]{0,500}?"(?:startTime|matchId|eventId|blockName)"[\s\S]{0,500}?\]/);
  if (eventArrayMatch) {
    console.log("Found event array pattern:");
    console.log(eventArrayMatch[0].slice(0, 2000));
  }

  // Pattern 2: Objects with "event" or "match" keys
  const eventObjMatches = [...fullRSC.matchAll(/\{"(?:startTime|matchId|eventId|blockName|startDate)"/g)];
  console.log(`Found ${eventObjMatches.length} potential match/event objects`);

  for (const m of eventObjMatches.slice(0, 5)) {
    // Get surrounding context
    const idx = m.index!;
    const context = fullRSC.slice(Math.max(0, idx - 100), Math.min(fullRSC.length, idx + 2000));
    console.log(`\nMatch at pos ${idx}:`);
    console.log(context.slice(0, 1500));
  }

  // Pattern 3: Search for actual team names in JSON context
  console.log("\n=== Searching for team codes near event data ===\n");
  
  // Look for patterns like: "code":"T1", "code":"BLG" near "event" or "match"
  const teamCodePatterns = [
    /"code"\s*:\s*"(T1|BLG|GEN|DK|HLE|KT|DRX|BRO|AL|JDG|EDG|TES|WE|WBG|TT|LGD|LNG|iG|NIP|G2|FNC|KC|GX|FLY|TL|C9)"/g,
    /"name"\s*:\s*"(T1|Bilibili Gaming|Gen\.G|Dplus KIA|Hanwha Life|KT Rolster|Anyone.s Legend|JD Gaming|Edward Gaming|Top Esports)"/g,
  ];

  for (const pattern of teamCodePatterns) {
    const teams = [...fullRSC.matchAll(pattern)];
    if (teams.length > 0) {
      const unique = [...new Set(teams.map(t => t[1]))];
      console.log(`Found ${teams.length} team references: ${unique.join(", ")}`);
    }
  }

  // Pattern 4: Look for blocks of events - the schedule data structure
  console.log("\n=== Looking for schedule 'blocks' or 'events' arrays ===\n");
  
  const blockMatch = fullRSC.match(/"blocks"\s*:\s*\[([\s\S]{1,5000}?)\]/);
  if (blockMatch) {
    console.log("Found 'blocks' array:");
    console.log(blockMatch[0].slice(0, 3000));
  }

  const eventsMatch = fullRSC.match(/"events"\s*:\s*\[([\s\S]{1,5000}?)\]/);
  if (eventsMatch) {
    console.log("Found 'events' array:");
    console.log(eventsMatch[0].slice(0, 3000));
  }

  // Pattern 5: Dump the largest payloads that contain "event" or "schedule"
  console.log("\n=== Dumping payloads with most event-related content ===\n");
  
  const eventPayloads = payloads
    .map((p, i) => ({ idx: i, content: p, score: (p.match(/(?:event|match|schedule|tournament)/gi) || []).length }))
    .filter(p => p.score > 5)
    .sort((a, b) => b.score - a.score);

  for (const ep of eventPayloads.slice(0, 3)) {
    console.log(`\n--- Payload #${ep.idx + 1} (score: ${ep.score}) - First 3000 chars ---`);
    console.log(ep.content.slice(0, 3000));
    console.log(`\n--- Payload #${ep.idx + 1} - Last 2000 chars ---`);
    console.log(ep.content.slice(-2000));
  }
}

main().catch(console.error);
