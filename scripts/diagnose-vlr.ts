// 诊断 v4 - 打印一个 match-item 的原始 HTML
async function main() {
  const res = await fetch("https://www.vlr.gg/matches", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html",
    },
  });
  const html = await res.text();
  
  // Find first match-item href
  const firstMatchIdx = html.indexOf('class="wf-module-item match-item');
  if (firstMatchIdx >= 0) {
    const snippet = html.slice(firstMatchIdx, firstMatchIdx + 3000);
    console.log(snippet);
  }
}

main().catch(console.error);
