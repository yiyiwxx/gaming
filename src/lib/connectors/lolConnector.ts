import { Match } from "./types";
import { scrapeLoLSchedule } from "./lolScraper";
import { parseLoLHtml } from "./lolParser";
import { getLplqqMatches } from "./lplqqConnector";
import { mockLoLMatches } from "../matches/mockData";
import fs from "fs";
import path from "path";

const DEFAULT_LEAGUES = ["lpl", "lck", "lec", "lcs", "msi", "worlds"];
const CACHE_PATH = path.join(process.cwd(), "data", "lol-schedule-cache.json");
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * LoL 数据源连接器
 *
 * 数据策略（按优先级）:
 * 1. 本地缓存文件 → 24h 以内的 Playwright 抓取结果（最可靠）
 * 2. Playwright 实时抓取 → 从 lolesports.com 执行 JS 渲染获取最新数据
 * 3. lpl.qq.com 官方中文数据 → MSI/LPL 赛程（中文战队名）
 * 4. HTML 静态解析 → RSC payload 解析（轻量 fallback）
 * 5. Mock 数据 → 最终 fallback
 */
export async function getLoLMatches(
  leagues: string[] = DEFAULT_LEAGUES
): Promise<Match[]> {
  // 策略 1: 读缓存（lolesports + lplqq 合并缓存）
  const cached = readCache();
  if (cached) {
    console.log(`[LoL Connector] Cache: ${cached.length} real matches`);
    return cached;
  }

  // 策略 2: Playwright 实时抓取
  try {
    const matches = await scrapeLoLSchedule(leagues);
    if (matches.length > 0) {
      const finishedCount = matches.filter((m) => m.status === "finished").length;
      const futureCount = matches.filter(
        (m) => m.status === "scheduled" && new Date(m.startTime) > new Date()
      ).length;
      console.log(
        `[LoL Connector] Playwright: ${matches.length} real matches ` +
        `(${finishedCount} finished, ${futureCount} upcoming)`
      );
      return matches;
    }
  } catch (err) {
    console.warn("[LoL Connector] Playwright failed:", (err as Error).message);
  }

  // 策略 3: lpl.qq.com 官方中文数据
  try {
    const lplqqMatches = await getLplqqMatches();
    if (lplqqMatches.length > 0) {
      console.log(`[LoL Connector] lpl.qq.com: ${lplqqMatches.length} matches`);
      return lplqqMatches;
    }
  } catch (err) {
    console.warn("[LoL Connector] lpl.qq.com failed:", (err as Error).message);
  }

  // 策略 4: HTML 解析
  try {
    const html = await fetch(
      "https://lolesports.com/schedule?leagues=" + leagues.join(",")
    ).then((r) => r.text());
    const matches = parseLoLHtml(html);
    if (matches.length > 0) {
      console.log(`[LoL Connector] HTML parser: ${matches.length} matches`);
      return matches;
    }
  } catch {
    // continue
  }

  // 策略 5: Mock fallback
  return getLoLMockMatches();
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
      console.log("[LoL Connector] Cache expired");
      return null;
    }

    return entry.matches;
  } catch {
    return null;
  }
}

function getLoLMockMatches(): Match[] {
  const now = new Date();
  const futureMatches = mockLoLMatches
    .filter((m) => new Date(m.startTime) > now)
    .map((m) => ({ ...m, lastSyncedAt: now.toISOString() }));

  console.log(`[LoL Connector] Mock fallback: ${futureMatches.length} matches`);
  return futureMatches;
}
