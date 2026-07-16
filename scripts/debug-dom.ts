// Debug: dump lolesports.com DOM structure
import { chromium } from "playwright";

async function main() {
  const url = "https://lolesports.com/schedule?leagues=98767991299243165,98767991302972019,98767991299243173,98767991302996019,113470241010912364,98767975604431411";
  
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  try {
    const page = await browser.newPage({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      viewport: { width: 1920, height: 1080 },
      locale: "en-US",
    });

    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    // Wait and dump the DOM
    await page.waitForTimeout(3000);

    // Dump all VOD link containers' HTML
    const htmlSamples = await page.evaluate(() => {
      const vodLinks = document.querySelectorAll('a[href*="/vod/"]');
      const results: string[] = [];

      for (const link of Array.from(vodLinks).slice(0, 10)) {
        // Go up to find the main container (up to 5 levels)
        let container = link as Element;
        for (let i = 0; i < 5; i++) {
          if (container.parentElement && 
              (container.parentElement.tagName === "DIV" || container.parentElement.tagName === "SECTION")) {
            container = container.parentElement;
          }
        }

        // Get just the element names and class names
        const structure = [];
        let el = link as Element;
        for (let i = 0; i < 8; i++) {
          const tag = el.tagName;
          const cls = (el.className && typeof el.className === "string") 
            ? el.className.split(" ").slice(0, 3).join(" ") 
            : "";
          const text = el.textContent?.slice(0, 50)?.replace(/\s+/g, " ").trim();
          structure.push(`${tag}.${cls} "${text}"`);
          if (el.parentElement) {
            el = el.parentElement;
          } else {
            break;
          }
        }

        results.push(structure.join(" > "));
      }

      return results;
    });

    console.log("=== VOD link container structures ===");
    for (const s of htmlSamples) {
      console.log(s);
      console.log("---");
    }

    // Also get the body text to understand the page content
    const bodyText = await page.evaluate(() => {
      return document.body.innerText.slice(0, 3000);
    });
    console.log("\n=== Body text (first 3000 chars) ===");
    console.log(bodyText);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
