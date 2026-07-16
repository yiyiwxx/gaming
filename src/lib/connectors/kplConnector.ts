// KPL (王者荣耀职业联赛) 数据连接器
// 从 tga-openapi.tga.qq.com 获取 KPL 赛程数据
import { Match } from "./types";
import { parseKPLSchedules, parseKPLMatches } from "./kplParser";
import fs from "fs";
import path from "path";

const CACHE_PATH = path.join(process.cwd(), "data", "kpl-cache.json");
const CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 小时缓存

// KPL 赛季 ID 格式: KPL{year}S{season}
// S1 = 春季赛, S2 = 夏季赛
const KPL_SEASONS = [
  { seasonid: "KPL2026S2", label: "2026 夏季赛" },
  { seasonid: "KPL2026S1", label: "2026 春季赛" },
  { seasonid: "KCC2026", label: "2026 挑战者杯" },
];

/**
 * 获取 KPL 赛程数据
 *
 * 优先级：
 * 1. 本地缓存（12h内有效）
 * 2. getSchedules API 实时抓取
 * 3. matches/open API 兜底
 */
export async function getKPLMatches(): Promise<Match[]> {
  // 策略 1: 读缓存
  const cached = readCache();
  if (cached) {
    console.log(`[KPL Connector] Cache: ${cached.length} matches`);
    return cached;
  }

  const allMatches: Match[] = [];

  // 策略 2: getSchedules API（多赛季）
  for (const season of KPL_SEASONS) {
    try {
      const url = `https://tga-openapi.tga.qq.com/web/tgabank/getSchedules?seasonid=${season.seasonid}&is_people=1`;
      const res = await fetch(url);
      const json = await res.json();

      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        const matches = parseKPLSchedules(json.data);
        console.log(`[KPL Connector] ${season.label} (getSchedules): ${matches.length} matches`);
        allMatches.push(...matches);
      }
    } catch (err) {
      console.warn(`[KPL Connector] ${season.label} getSchedules failed:`, (err as Error).message);
    }
  }

  // 策略 3: matches/open API 兜底
  if (allMatches.length === 0) {
    try {
      const url = "https://prod.comp.smoba.qq.com/leaguesite/matches/open?league_id=20250002";
      const res = await fetch(url);
      const json = await res.json();

      if (json.results && Array.isArray(json.results)) {
        const matches = parseKPLMatches(json.results);
        console.log(`[KPL Connector] matches/open: ${matches.length} matches`);
        allMatches.push(...matches);
      }
    } catch (err) {
      console.warn("[KPL Connector] matches/open failed:", (err as Error).message);
    }
  }

  // 保存缓存
  if (allMatches.length > 0) {
    saveCache(allMatches);
  }

  return allMatches;
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
      console.log("[KPL Connector] Cache expired");
      return null;
    }
    return entry.matches;
  } catch {
    return null;
  }
}

export function saveCache(matches: Match[]): void {
  const dir = path.dirname(CACHE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const entry: CacheEntry = {
    scrapedAt: new Date().toISOString(),
    count: matches.length,
    matches,
  };
  fs.writeFileSync(CACHE_PATH, JSON.stringify(entry, null, 2), "utf-8");
  console.log(`[KPL Connector] Cache saved: ${matches.length} matches`);
}
