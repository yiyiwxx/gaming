// 诊断脚本：测试真实数据源
async function main() {
  console.log("=== 测试 1: SheepEsports LoL matches ===\n");
  try {
    const res = await fetch("https://www.sheepesports.com/en/lol/matches", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html",
      },
    });
    const html = await res.text();
    console.log("Status:", res.status, "Size:", html.length);
    // SheepEsports is client-rendered, so we need to find embedded data
    const scriptMatch = html.match(/__NEXT_DATA__/);
    console.log("__NEXT_DATA__ found:", !!scriptMatch);
    // Look for any JSON-like data
    const jsonMatch = html.match(/"matches"|"schedule"|"events"/g);
    console.log("JSON patterns:", jsonMatch);
  } catch (e) {
    console.error("SheepEsports error:", e.message);
  }

  console.log("\n=== 测试 2: VLR.gg matches ===\n");
  try {
    const res = await fetch("https://www.vlr.gg/matches", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html",
      },
    });
    const html = await res.text();
    console.log("Status:", res.status, "Size:", html.length);
    
    // Check for match patterns
    const matchItemCount = (html.match(/match-item/g) || []).length;
    const wfCardCount = (html.match(/wf-card/g) || []).length;
    const matchCount = (html.match(/match/g) || []).length;
    console.log("match-item:", matchItemCount, "wf-card:", wfCardCount, "word 'match':", matchCount);
    
    // Find the first 5000 chars with match nearby
    const idx = html.indexOf("match-item");
    if (idx >= 0) {
      console.log("\n--- First match-item context ---");
      console.log(html.slice(Math.max(0, idx - 200), idx + 800));
    } else {
      // Print some HTML to understand structure
      console.log("\n--- First 2000 chars ---");
      console.log(html.slice(0, 2000));
      // Check if it's a redirect/block page
      console.log("\n--- Contains Cloudflare:", html.includes("cloudflare") || html.includes("cf-"));
    }
  } catch (e) {
    console.error("VLR error:", e.message);
  }

  console.log("\n=== 测试 3: Liquipedia LoL matches ===\n");
  try {
    const res = await fetch("https://liquipedia.net/leagueoflegends/LPL/2026/Summer/Playoffs", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html",
      },
    });
    const html = await res.text();
    console.log("Status:", res.status, "Size:", html.length);
    const matchRowCount = (html.match(/match-row|match-bracket|brkts-match/g) || []).length;
    console.log("match patterns:", matchRowCount);
  } catch (e) {
    console.error("Liquipedia error:", e.message);
  }

  console.log("\n=== 测试 4: Strafe Esports API ===\n");
  try {
    const res = await fetch("https://www.strafe.com/api/v1/schedule?game=lol&limit=5", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
    });
    console.log("Status:", res.status);
    if (res.ok) {
      const data = await res.json();
      console.log("Data:", JSON.stringify(data).slice(0, 1000));
    }
  } catch (e) {
    console.error("Strafe error:", e.message);
  }
}

main().catch(console.error);
