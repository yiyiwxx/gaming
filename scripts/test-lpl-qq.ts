// LPL.QQ.COM Playwright 抓取脚本
// 抓取 https://lpl.qq.com 赛程页面，提取比赛数据
import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

interface RawResult {
  url: string;
  extractedAt: string;
  bodyText: string;
  lineCount: number;
  notes: string;
  networkApiCalls: string[];
  interactions: string[];
}

const DATA_DIR = path.resolve(__dirname, "..", "data");
const OUTPUT_FILE = path.join(DATA_DIR, "lplqq-raw-text.json");

async function ensureDataDir(): Promise<void> {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

async function main(): Promise<void> {
  await ensureDataDir();

  console.log("[LPL QQ Scraper] Launching Playwright Chromium...\n");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const collectedApiCalls: string[] = [];

  try {
    // ============================================================
    // URL 1: 旧版赛程页 (带 ?game=lol 参数)
    // ============================================================
    const url1 = "https://lpl.qq.com/cp/a20210823zmesport/page/schedule/?game=lol";
    const result1 = await scrapePage(
      browser,
      url1,
      "旧版赛程页",
      collectedApiCalls,
      async (page) => {
        const interactions: string[] = [];

        // 等待页面渲染完成
        await page.waitForTimeout(8000);

        // 尝试找"时间筛选"选择器
        const timeFilterSelectors = [
          'text=时间筛选',
          'span:has-text("时间筛选")',
          'div:has-text("时间筛选")',
          '.time-filter',
          '.date-filter',
          '.season-select',
          '[class*="filter"]',
          'select',
          'button:has-text("2026")',
          'text=2026',
          'text=2025',
          'text=年份',
          'text=赛季',
        ];

        let timeFilterFound = false;
        for (const sel of timeFilterSelectors) {
          try {
            const el = await page.$(sel);
            if (el) {
              interactions.push(`找到时间筛选元素: "${sel}"`);
              timeFilterFound = true;

              // 尝试点击打开下拉
              await el.click().catch(() => {});
              await page.waitForTimeout(1500);

              // 尝试选择 2026
              const yearSelectors = [
                'text="2026"',
                'li:has-text("2026")',
                'option:has-text("2026")',
                '[data-value="2026"]',
                '[value="2026"]',
                'text="2026年"',
              ];
              let yearSelected = false;
              for (const ySel of yearSelectors) {
                try {
                  const yEl = await page.$(ySel);
                  if (yEl) {
                    await yEl.click().catch(() => {});
                    interactions.push(`已点击选择 2026: "${ySel}"`);
                    yearSelected = true;
                    await page.waitForTimeout(3000);
                    break;
                  }
                } catch {
                  // 继续尝试下一个
                }
              }
              if (!yearSelected) {
                interactions.push("未找到 2026 选项，保持默认筛选");
              }
              break;
            }
          } catch {
            // 继续尝试下一个选择器
          }
        }
        if (!timeFilterFound) {
          interactions.push("未找到时间筛选元素，页面可能使用不同布局");
        }

        // 向下滚动加载更多比赛
        interactions.push("开始向下滚动以加载更多比赛...");
        for (let scroll = 0; scroll < 10; scroll++) {
          await page.evaluate(() => window.scrollBy(0, 800));
          await page.waitForTimeout(1000);
        }
        interactions.push("完成 10 次滚动");

        return interactions;
      }
    );

    // ============================================================
    // URL 2: 新版赛事页面 (带 tabId=schedule)
    // ============================================================
    const url2 = "https://lpl.qq.com/web202301/event.html?tabId=schedule";
    const result2 = await scrapePage(
      browser,
      url2,
      "新版赛事页面",
      collectedApiCalls,
      async (page) => {
        const interactions: string[] = [];

        await page.waitForTimeout(5000);

        // 尝试找月份选择器，点击不同月份
        const monthNames = [
          "一月", "二月", "三月", "四月", "五月", "六月",
          "七月", "八月", "九月", "十月", "十一月", "十二月",
          "1月", "2月", "3月", "4月", "5月", "6月",
          "7月", "8月", "9月", "10月", "11月", "12月",
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December",
        ];

        // 寻找月份选择器容器
        const monthContainerSelectors = [
          '.month-picker',
          '.month-select',
          '.schedule-month',
          '[class*="month"]',
          '.date-picker',
          '.calendar-nav',
          'div:has(> span:has-text("月"))',
          'div:has(> div:has-text("月"))',
        ];

        let monthContainer: any = null;
        for (const sel of monthContainerSelectors) {
          monthContainer = await page.$(sel);
          if (monthContainer) {
            interactions.push(`找到月份容器: "${sel}"`);
            break;
          }
        }

        if (monthContainer) {
          // 查找月份选择器内的所有可点击月份
          const monthButtons = await monthContainer.$$(
            "span, div, button, li, a, [class*='month']"
          );
          interactions.push(`月份容器内找到 ${monthButtons.length} 个潜在月份元素`);

          // 尝试点击 7月(七月)、8月(八月) 等
          const targetMonths = [
            "七月", "八月", "九月", "十月",
            "7月", "8月", "9月", "10月",
            "July", "August", "September", "October",
          ];

          for (const monthName of targetMonths) {
            for (const btn of monthButtons) {
              try {
                const text = await btn.textContent();
                if (text && text.trim() === monthName) {
                  await btn.click().catch(() => {});
                  interactions.push(`点击月份: ${monthName}`);
                  await page.waitForTimeout(3000);
                  break;
                }
              } catch {
                // skip
              }
            }
          }
        } else {
          // 直接在页面上找月份文字
          interactions.push("未找到月份容器，直接在页面搜索月份文字...");

          for (const monthName of monthNames) {
            try {
              const el = await page.$(`text="${monthName}"`);
              if (el) {
                const tagName = await el.evaluate((e) => e.tagName);
                // 只点击可交互元素
                if (["SPAN", "DIV", "BUTTON", "A", "LI"].includes(tagName)) {
                  await el.click().catch(() => {});
                  interactions.push(`直接点击月份: ${monthName}`);
                  await page.waitForTimeout(3000);
                }
              }
            } catch {
              // skip
            }
          }
        }

        // 滚动加载更多
        interactions.push("开始向下滚动以加载更多比赛...");
        for (let scroll = 0; scroll < 5; scroll++) {
          await page.evaluate(() => window.scrollBy(0, 800));
          await page.waitForTimeout(1000);
        }
        interactions.push("完成 5 次滚动");

        return interactions;
      }
    );

    // ============================================================
    // 保存结果
    // ============================================================
    const output: RawResult[] = [result1, result2];

    // 附加网络请求汇总
    const summary = {
      extractedAt: new Date().toISOString(),
      totalUrls: 2,
      uniqueApiEndpoints: [...new Set(collectedApiCalls)].sort(),
      results: output,
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(summary, null, 2), "utf-8");
    console.log(`\n[Done] 数据已保存到: ${OUTPUT_FILE}`);
    console.log(`  - URL1 行数: ${result1.lineCount}`);
    console.log(`  - URL2 行数: ${result2.lineCount}`);
    console.log(
      `  - 捕获 API 端点数: ${new Set(collectedApiCalls).size}`
    );

    // 打印前 2000 字符预览
    console.log("\n=== URL1 内容预览 (前 2000 字符) ===");
    console.log(result1.bodyText.slice(0, 2000));
    console.log("\n=== URL2 内容预览 (前 2000 字符) ===");
    console.log(result2.bodyText.slice(0, 2000));
  } catch (err) {
    console.error("[Error]", err);
  } finally {
    await browser.close();
    console.log("\n[LPL QQ Scraper] Browser closed.");
  }
}

/**
 * 抓取单个页面
 */
async function scrapePage(
  browser: any,
  url: string,
  label: string,
  collectedApiCalls: string[],
  interactionFn: (page: any) => Promise<string[]>
): Promise<RawResult> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`[${label}] 开始抓取: ${url}`);
  console.log(`${"=".repeat(60)}`);

  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
    locale: "zh-CN",
  });

  // 拦截并记录网络请求（寻找 API 端点）
  page.on("request", (request: any) => {
    const reqUrl = request.url();
    // 只记录 API 相关的请求
    if (
      reqUrl.includes("api") ||
      reqUrl.includes("schedule") ||
      reqUrl.includes("match") ||
      reqUrl.includes("event") ||
      reqUrl.includes("data") ||
      reqUrl.includes("json") ||
      reqUrl.includes("list") ||
      reqUrl.endsWith(".json")
    ) {
      if (!collectedApiCalls.includes(reqUrl)) {
        collectedApiCalls.push(reqUrl);
        console.log(`  [API] ${reqUrl.slice(0, 200)}`);
      }
    }
  });

  // 也拦截响应以捕获更多 API 数据
  page.on("response", async (response: any) => {
    const respUrl = response.url();
    const contentType = response.headers()["content-type"] || "";
    if (
      contentType.includes("json") ||
      respUrl.includes("api") ||
      respUrl.includes("schedule") ||
      respUrl.includes("match") ||
      respUrl.includes("event") ||
      respUrl.includes("data")
    ) {
      if (!collectedApiCalls.includes(respUrl)) {
        collectedApiCalls.push(respUrl);
      }
    }
  });

  try {
    // 可选：屏蔽图片/字体加速加载
    await page.route("**/*", (route: any) => {
      const type = route.request().resourceType();
      if (["image", "font", "media"].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    console.log(`  [${label}] 页面已加载 (domcontentloaded)`);

    // 额外等待渲染
    await page.waitForTimeout(3000);
    console.log(`  [${label}] 3 秒初始等待完成`);

    // 执行交互（筛选年份、点击月份、滚动等）
    console.log(`  [${label}] 开始页面交互...`);
    const interactions = await interactionFn(page);

    // 最终提取页面文本
    const bodyText = await page.evaluate(() => document.body.innerText);
    const lines = bodyText.split("\n");

    console.log(
      `  [${label}] 提取完成: ${bodyText.length} 字符, ${lines.length} 行`
    );

    return {
      url,
      extractedAt: new Date().toISOString(),
      bodyText,
      lineCount: lines.length,
      notes: label,
      networkApiCalls: [], // 统一在外部汇总
      interactions,
    };
  } catch (err) {
    console.error(`  [${label}] 抓取失败:`, (err as Error).message);

    // 即使失败也尝试提取当前内容
    try {
      const bodyText = await page.evaluate(() => document.body.innerText);
      return {
        url,
        extractedAt: new Date().toISOString(),
        bodyText,
        lineCount: bodyText.split("\n").length,
        notes: `${label} (部分抓取，可能有错误: ${(err as Error).message})`,
        networkApiCalls: [],
        interactions: [],
      };
    } catch {
      return {
        url,
        extractedAt: new Date().toISOString(),
        bodyText: "",
        lineCount: 0,
        notes: `${label} (抓取失败: ${(err as Error).message})`,
        networkApiCalls: [],
        interactions: [],
      };
    }
  } finally {
    await page.close();
    console.log(`  [${label}] 页面已关闭`);
  }
}

main().catch(console.error);
