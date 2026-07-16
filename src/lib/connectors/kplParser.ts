// KPL (王者荣耀职业联赛) API 数据解析器
// 解析 tga-openapi.tga.qq.com getSchedules 和 prod.comp.smoba.qq.com matches/open 接口数据
import { Match } from "./types";

// KPL getSchedules API 原始数据
interface KPLScheduleItem {
  scheduleid: string;
  hname: string;
  gname: string;
  host_score: number;
  guest_score: number;
  host_id: string;
  guest_id: string;
  host_group: string;
  guest_group: string;
  match_time: string;
  match_state: number;
  match_group: string;
  match_timestamp: string;
  stage: string;
  stage_name: string;
  season: string;
  bo_total: number;
  region: string;
}

// KPL matches/open API 原始数据
interface KPLMatchItem {
  match_id: string;
  league_id: string;
  camp1: {
    team_id: string;
    team_name: string;
    is_win: boolean;
    score: number;
    team_abbreviation: string;
  };
  camp2: {
    team_id: string;
    team_name: string;
    is_win: boolean;
    score: number;
    team_abbreviation: string;
  };
  bo: number;
  win_camp: number;
  status: number;
  start_time: string;
  end_time?: string;
  match_address?: string;
  match_stage_name: string;
  match_stage_desc: string;
  cc_match_id?: string;
}

/**
 * 解析 KPL getSchedules API 响应
 * 这是 KPL 页面使用的主要数据接口
 */
export function parseKPLSchedules(data: KPLScheduleItem[]): Match[] {
  const now = new Date();
  const matches: Match[] = [];

  for (const item of data) {
    const { tournament, stage } = parseSeasonInfo(item.season, item.stage_name);
    const matchDate = new Date(item.match_time.replace(" ", "T") + "+08:00");
    const dateStr = item.match_time.slice(0, 10);

    // match_state: 4 = finished, others?
    const status: Match["status"] = item.match_state === 4 ? "finished" : 
                                     item.match_state === 3 ? "live" : "scheduled";

    const hasScore = item.host_score !== undefined && item.host_score !== null &&
                     item.guest_score !== undefined && item.guest_score !== null &&
                     status === "finished";

    const id = `kpl-${item.scheduleid}`.toLowerCase();

    matches.push({
      id,
      game: "hok",
      gameName: "王者荣耀",
      league: tournament,
      tournament,
      stage: stage || item.stage_name,
      teamA: item.hname,
      teamB: item.gname,
      startTime: matchDate.toISOString(),
      format: item.bo_total ? `BO${item.bo_total}` : "BO5",
      status,
      source: "kpl",
      sourceUrl: "https://kpl.qq.com/#/Schedule",
      summary: hasScore ? `${item.hname} ${item.host_score}-${item.guest_score} ${item.gname}` : undefined,
      lastSyncedAt: now.toISOString(),
    });
  }

  return matches;
}

/**
 * 解析 KPL matches/open API 响应
 * 有更丰富的比赛详情（end_time, individual game vods等）
 */
export function parseKPLMatches(data: KPLMatchItem[]): Match[] {
  const now = new Date();
  const matches: Match[] = [];

  for (const item of data) {
    const matchDate = new Date(item.start_time.replace(" ", "T") + "+08:00");
    const endTime = item.end_time ? new Date(item.end_time.replace(" ", "T") + "+08:00").toISOString() : undefined;

    // status: 2 = finished?
    const status: Match["status"] = item.status === 2 ? "finished" :
                                     item.status === 1 ? "live" : "scheduled";

    const hasScore = item.camp1.score !== undefined && item.camp2.score !== undefined;
    const teamA = item.camp1.team_name;
    const teamB = item.camp2.team_name;
    const scoreA = item.camp1.score;
    const scoreB = item.camp2.score;

    const tournament = parseMatchesOpenTournament(item.start_time);

    const id = `kpl-${item.match_id}`.toLowerCase();

    matches.push({
      id,
      game: "hok",
      gameName: "王者荣耀",
      league: tournament,
      tournament,
      stage: item.match_stage_desc,
      teamA,
      teamB,
      startTime: matchDate.toISOString(),
      endTime,
      format: item.bo ? `BO${item.bo}` : "BO5",
      status,
      source: "kpl",
      sourceUrl: "https://kpl.qq.com/#/Schedule",
      summary: hasScore ? `${teamA} ${scoreA}-${scoreB} ${teamB}` : undefined,
      lastSyncedAt: now.toISOString(),
    });
  }

  return matches;
}

/**
 * 根据比赛日期推导 tournaments 名称
 * 2026-06-01 前 → 春季赛，之后 → 夏季赛
 */
function parseMatchesOpenTournament(startTime: string): string {
  const match = startTime.match(/(\d{4})/);
  const year = match ? match[1] : new Date().getFullYear().toString();
  const month = parseInt(startTime.slice(5, 7), 10);
  const season = month >= 6 ? "夏季赛" : "春季赛";
  return `KPL ${year} ${season}`;
}

/**
 * 解析赛季信息
 * "2026年KPL夏季赛" → { tournament: "KPL 2026 夏季赛", stage: "常规赛第一轮" }
 */
function parseSeasonInfo(season: string, stageName: string): { tournament: string; stage: string } {
  const yearMatch = season.match(/(\d{4})/);
  const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();
  
  let seasonLabel = "KPL";
  if (season.includes("夏季")) seasonLabel = `KPL ${year} 夏季赛`;
  else if (season.includes("春季")) seasonLabel = `KPL ${year} 春季赛`;
  else if (season.includes("秋季")) seasonLabel = `KPL ${year} 秋季赛`;
  else if (season.includes("挑战者杯")) seasonLabel = `KPL ${year} 挑战者杯`;
  else if (season.includes("年度总决赛")) seasonLabel = `KPL ${year} 年度总决赛`;
  else if (season.includes("世界冠军杯")) seasonLabel = `KPL ${year} 世界冠军杯`;
  else seasonLabel = `KPL ${year}`;

  return { tournament: seasonLabel, stage: stageName || "" };
}
