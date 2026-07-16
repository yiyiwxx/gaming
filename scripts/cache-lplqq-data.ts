// 从 lpl.qq.com 抓取赛程数据并保存到缓存
// 用法: npx tsx scripts/cache-lplqq-data.ts
import { chromium } from "playwright";
import { parseLplqqEventHtml, parseLplqqScheduleHtml } from "../src/lib/connectors/lplqqParser";
import { saveCache } from "../src/lib/connectors/lplqqConnector";
import { Match } from "../src/lib/connectors/types";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const RAW_OUTPUT = path.join(DATA_DIR, "lplqq-raw-text.json");

async function main() {
  console.log("[LPLQQ Cache] Launching Playwright...\n");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const allMatches: Match[] = [];

  try {
    // ============================================================
    // 抓取 1: event.html（MSI 2026 等国际赛事）
    // ============================================================
    console.log("--- Fetching event.html ---");
    const page1 = await browser.newPage({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      viewport: { width: 1920, height: 1080 },
      locale: "zh-CN",
    });

    // 阻止图片/字体加速加载
    await page1.route("**/*", (route) => {
      if (["image", "font", "media"].includes(route.request().resourceType()))
        route.abort();
      else route.continue();
    });

    await page1.goto("https://lpl.qq.com/web202301/event.html?tabId=schedule", {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    await page1.waitForTimeout(5000);

    // 点击不同月份获取更多数据
    const monthButtons = ["七月", "八月", "九月", "十月"];
    for (const month of monthButtons) {
      try {
        const btn = await page1.$(`text="${month}"`);
        if (btn) {
          await btn.click();
          await page1.waitForTimeout(3000);
          console.log(`  Clicked month: ${month}`);
        }
      } catch { /* skip */ }
    }

    const eventText = await page1.evaluate(() => document.body.innerText);
    await page1.close();

    const eventMatches = parseLplqqEventHtml(eventText);
    console.log(`  event.html: ${eventMatches.length} matches`);
    allMatches.push(...eventMatches);

    // ============================================================
    // 抓取 2: a20210823zmesport（LPL 历史赛程）
    // ============================================================
    console.log("--- Fetching a20210823zmesport ---");
    const page2 = await browser.newPage({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      viewport: { width: 1920, height: 1080 },
      locale: "zh-CN",
    });

    await page2.route("**/*", (route) => {
      if (["image", "font", "media"].includes(route.request().resourceType()))
        route.abort();
      else route.continue();
    });

    await page2.goto(
      "https://lpl.qq.com/cp/a20210823zmesport/page/schedule/?game=lol",
      { waitUntil: "domcontentloaded", timeout: 20000 }
    );
    await page2.waitForTimeout(8000);

    // 滚动加载更多
    for (let i = 0; i < 10; i++) {
      await page2.evaluate(() => window.scrollBy(0, 1000));
      await page2.waitForTimeout(1000);
    }

    // 尝试点击"加载更多"或切换年份
    const loadMoreSelectors = [
      'text=加载更多',
      'text=查看更多',
      'button:has-text("2026")',
      'text=2026',
    ];
    for (const sel of loadMoreSelectors) {
      try {
        const btn = await page2.$(sel);
        if (btn) {
          await btn.click();
          await page2.waitForTimeout(3000);
          console.log(`  Clicked: ${sel}`);
        }
      } catch { /* skip */ }
    }

    const scheduleText = await page2.evaluate(() => document.body.innerText);
    await page2.close();

    const scheduleMatches = parseLplqqScheduleHtml(scheduleText);
    console.log(`  schedule: ${scheduleMatches.length} matches`);
    allMatches.push(...scheduleMatches);

    // ============================================================
    // 保存原始文本（调试用）
    // ============================================================
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(
      RAW_OUTPUT,
      JSON.stringify(
        {
          extractedAt: new Date().toISOString(),
          eventText: eventText.slice(0, 5000),
          scheduleText: scheduleText.slice(0, 5000),
          totalMatches: allMatches.length,
        },
        null,
        2
      ),
      "utf-8"
    );

    // ============================================================
    // 保存缓存
    // ============================================================
    const final = deduplicate(allMatches);
    saveCache(final);
    console.log(`\n[Done] Total: ${final.length} matches cached`);

  } catch (err) {
    console.error("[Error]", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
}

function deduplicate(matches: Match[]): Match[] {
  const seen = new Set<string>();
  return matches.filter((m) => {
    const key = `${m.teamA}-${m.teamB}-${m.startTime}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

main();
