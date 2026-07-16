// Simplified Playwright scraper - block-based parsing
import { chromium } from "playwright";

async function main() {
  const url = "https://lolesports.com/schedule?leagues=98767991299243165,98767991302972019,98767991299243173,98767991302996019,113470241010912364,98767975604431411";

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    viewport: { width: 1920, height: 1080 },
    locale: "en-US",
  });

  await page.route("**/*", (route) => {
    if (["image", "font", "media"].includes(route.request().resourceType())) route.abort();
    else route.continue();
  });

  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);

  const bodyText = await page.evaluate(() => document.body.innerText);
  
  // Find the schedule section
  const startMarker = "EVENTS & STANDINGS";
  const startIdx = bodyText.indexOf(startMarker);
  const schedule = startIdx > 0 ? bodyText.slice(startIdx) : bodyText;

  const lines = schedule.split("\n").map(l => l.trim());

  // Print lines from after "EVENTS & STANDINGS" through the schedule data
  let printing = false;
  let lineCount = 0;

  for (const line of lines) {
    if (line === "EVENTS & STANDINGS") {
      printing = true;
      continue;
    }
    if (!printing) continue;
    if (lineCount > 200) break;
    
    // Skip cookie banner lines
    if (/cookie|privacy|consent|preferences|accept|reject/i.test(line)) continue;
    
    console.log(`L${lineCount}: "${line}"`);
    lineCount++;
  }

  await browser.close();
}

main().catch(console.error);
