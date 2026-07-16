// LPL.QQ.COM 数据连接器
// 从 lpl.qq.com 官方中文网站获取赛程数据
import { Match } from "./types";
import { parseLplqqEventHtml, parseLplqqScheduleHtml } from "./lplqqParser";
import fs from "fs";
import path from "path";

const CACHE_PATH = path.join(process.cwd(), "data", "lplqq-cache.json");
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 小时

/**
 * 获取 lpl.qq.com 赛程数据
 *
 * 优先级：
 * 1. 本地缓存（24h内有效）
 * 2. WebFetch 实时抓取 event.html（MSI 等国际赛事）
 * 3. WebFetch 实时抓取 a20210823zmesport（历史 LPL 赛程）
 * 4. 返回空（无数据时不影响其他数据源）
 */
export async function getLplqqMatches(): Promise<Match[]> {
  // 策略 1: 读缓存
  const cached = readCache();
  if (cached) {
    console.log(`[LPLQQ Connector] Cache: ${cached.length} matches`);
    return cached;
  }

  // 策略 2: event.html（MSI / Worlds 等国际赛事）
  try {
    const eventHtml = await fetch(
      "https://lpl.qq.com/web202301/event.html?tabId=schedule"
    ).then((r) => r.text());

    const matches = parseLplqqEventHtml(eventHtml);
    if (matches.length > 0) {
      console.log(`[LPLQQ Connector] event.html: ${matches.length} matches`);
      return matches;
    }
  } catch (err) {
    console.warn("[LPLQQ Connector] event.html fetch failed:", (err as Error).message);
  }

  // 策略 3: a20210823zmesport（历史 LPL 赛程）
  try {
    const scheduleHtml = await fetch(
      "https://lpl.qq.com/cp/a20210823zmesport/page/schedule/?game=lol"
    ).then((r) => r.text());

    const matches = parseLplqqScheduleHtml(scheduleHtml);
    if (matches.length > 0) {
      console.log(`[LPLQQ Connector] schedule: ${matches.length} historical matches`);
      return matches;
    }
  } catch (err) {
    console.warn("[LPLQQ Connector] schedule fetch failed:", (err as Error).message);
  }

  // 无数据
  return [];
}

interface CacheEntry {
  scrapedAt: string;
  count: number;
  matches: Match[];
}

function readCache(): Match[] | null {
  try {
    if (!fs.existsSync(CACHE_PATH)) return null;

    const raw = fs.readFileSync(CACHE_PATH, "utf-8");
    const entry: CacheEntry = JSON.parse(raw);

    const age = Date.now() - new Date(entry.scrapedAt).getTime();
    if (age > CACHE_MAX_AGE_MS) {
      console.log("[LPLQQ Connector] Cache expired");
      return null;
    }

    return entry.matches;
  } catch {
    return null;
  }
}

/**
 * 将 lpl.qq.com 数据写入缓存（供 Playwright 抓取脚本使用）
 */
export function saveCache(matches: Match[]): void {
  const dir = path.dirname(CACHE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const entry: CacheEntry = {
    scrapedAt: new Date().toISOString(),
    count: matches.length,
    matches,
  };
  fs.writeFileSync(CACHE_PATH, JSON.stringify(entry, null, 2), "utf-8");
  console.log(`[LPLQQ Connector] Cache saved: ${matches.length} matches`);
}
