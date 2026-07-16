import { parseVLRMatches } from "../src/lib/connectors/vlrParser";

async function main() {
  const res = await fetch("https://www.vlr.gg/matches", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html",
    },
  });
  const html = await res.text();

  const matches = parseVLRMatches(html);
  console.log(`Parsed ${matches.length} real matches from VLR.gg\n`);

  const byLeague: Record<string, typeof matches> = {};
  matches.forEach((m) => {
    if (!byLeague[m.league]) byLeague[m.league] = [];
    byLeague[m.league].push(m);
  });

  for (const [league, ms] of Object.entries(byLeague)) {
    console.log(`=== ${league} (${ms.length} matches) ===`);
    ms.slice(0, 8).forEach((m) => {
      const time = m.startTime.slice(0, 16);
      const t = m.tournament.slice(0, 50);
      console.log(`  ${m.teamA} vs ${m.teamB} | ${t} | ${m.stage || "-"} | ${time}`);
    });
    if (ms.length > 8) console.log(`  ... +${ms.length - 8} more`);
  }
}

main().catch(console.error);
