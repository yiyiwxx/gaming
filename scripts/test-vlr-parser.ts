import { parseVLRMatches, computeStartTime } from "../src/lib/connectors/vlrParser";

async function main() {
  const res = await fetch("https://www.vlr.gg/matches", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html",
    },
  });
  const html = await res.text();
  
  // Debug step 1: check cards
  const cards = html.split('<div class="wf-card"');
  console.log(`Cards: ${cards.length - 1}`);
  
  // Debug step 2: check first card
  const card2 = cards[2];
  console.log(`Card 2 length: ${card2?.length || 0}`);
  
  // Split by match-item pattern
  const pattern = /<a[^>]*class="[^"]*wf-module-item match-item[^"]*"/g;
  const items = card2.match(pattern);
  console.log(`Match item patterns in card 2: ${items ? items.length : 0}`);
  
  if (items && items.length > 0) {
    console.log(`First pattern: ${items[0].slice(0, 100)}`);
  }
  
  // Try the split approach directly
  const itemParts = card2.split(/<a[^>]*class="[^"]*wf-module-item match-item[^"]*"/);
  console.log(`Item parts after split: ${itemParts.length}`);
  
  // Debug part 1 (first match item)
  if (itemParts.length > 1) {
    const part1 = itemParts[1];
    console.log(`Part 1 length: ${part1.length}`);
    console.log(`Part 1 first 500 chars:\n${part1.slice(0, 500)}`);
    
    // Try to extract teams
    const teamBlocks = part1.split('match-item-vs-team-name');
    console.log(`Team blocks: ${teamBlocks.length}`);
    
    for (let i = 1; i < Math.min(3, teamBlocks.length); i++) {
      const block = teamBlocks[i];
      console.log(`\n--- Team block ${i} first 300 chars ---`);
      console.log(block.slice(0, 300));
      
      // Try different regex patterns
      const textOfMatch1 = block.match(/class="[^"]*text-of[^"]*"[^>]*>[\s\n]*(?:<span[^>]*><\/span>)?[\s\n]*([A-Za-z0-9\u4e00-\u9fff\s&\-.']+?)[\s\n]*</);
      console.log(`Regex match: ${textOfMatch1 ? textOfMatch1[1].trim() : "null"}`);
      
      const textOfMatch2 = block.match(/class="text-of"[^>]*>([^<]+)/);
      console.log(`Simple match: ${textOfMatch2 ? textOfMatch2[1].trim() : "null"}`);
    }
  }
}

main().catch(console.error);
