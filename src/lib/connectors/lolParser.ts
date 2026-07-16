import { Match } from "./types";

/**
 * LoL Esports 官方赛程 HTML 解析器
 *
 * 数据来源: https://lolesports.com/schedule?leagues=lpl,lck,lec,lcs,msi,worlds
 *
 * lolesports.com 是 Next.js SPA，但 schedule 页面会服务端渲染初始 HTML，
 * 其中包含赛程数据。本解析器从原始 HTML 中提取结构化比赛数据。
 *
 * 已知限制:
 * - 页面可能使用无限滚动，初始 HTML 仅包含第一页数据
 * - 不同联赛过滤参数的 HTML 结构略有不同
 */

// 标准联赛名称映射
const LEAGUE_MAP: Record<string, string> = {
  lpl: "LPL",
  lck: "LCK",
  lec: "LEC",
  lcs: "LCS",
  lta: "LTA",
  lcp: "LCP",
  msi: "MSI",
  worlds: "Worlds",
  "world championship": "Worlds",
  "mid-season invitational": "MSI",
  "first stand": "First Stand",
  "esports world cup": "EWC",
  ewc: "EWC",
  kespa: "KeSPA Cup",
  "kespa cup": "KeSPA Cup",
  pcs: "PCS",
  vcs: "VCS",
  ljl: "LJL",
  lco: "LCO",
  cblol: "CBLOL",
  lla: "LLA",
  "prime league": "Prime League",
  nlc: "NLC",
  "hitpoint masters": "Hitpoint Masters",
  superliga: "Superliga",
  "elite series": "Elite Series",
  "honor of kings": "HoK",
  masters: "EMEA Masters",
  "european masters": "EMEA Masters",
  "liga portuguesa": "LPLOL",
  "all-star": "All-Star",
};

const LEAGUE_SLUG_MAP: Record<string, string> = {
  "98767991299243165": "LPL",
  "98767991310872058": "LPL", // LPL CL
  "98767991302972019": "LCK",
  "98767991310872068": "LCK", // LCK CL
  "98767991299243173": "LEC",
  "98767991302996019": "LCS",
  "98767991311423389": "LCP",
  "107050252879269896": "LTA",
  "98767991332355509": "MSI",
  "98767975604431411": "Worlds",
  "113470241010388072": "Worlds", // 2025 season
  "113470241010912364": "MSI",
  "113470241010912362": "First Stand",
};

/**
 * 从 lolesports.com 获取并解析赛程
 */
export async function fetchAndParseLoLSchedule(
  leagues: string[] = ["lpl", "lck", "lec", "lcs", "msi", "worlds"]
): Promise<Match[]> {
  const leagueParam = leagues.join(",");
  const url = `https://lolesports.com/schedule?leagues=${leagueParam}`;

  console.log(`[LoL Parser] Fetching ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      // Next.js fetch 会自动跟随重定向
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`[LoL Parser] Got ${html.length} chars of HTML`);

    const matches = parseLoLHtml(html);
    console.log(`[LoL Parser] Parsed ${matches.length} matches`);
    return matches;
  } catch (error) {
    console.error("[LoL Parser] Failed:", error);
    throw error;
  }
}

/**
 * 从 HTML 中提取所有比赛
 *
 * 支持两种格式:
 * A) 带联赛过滤的页面 (e.g., ?leagues=lpl,lck)
 *    - 简洁格式，日期标题 + 比赛条目
 * B) 默认 schedule 页面
 *    - VOD 链接格式，包含更多细节
 */
export function parseLoLHtml(html: string): Match[] {
  const matches: Match[] = [];

  // 首先尝试格式 A: 联赛过滤页面
  const formatAMatches = parseFormatA(html);
  if (formatAMatches.length > 0) {
    matches.push(...formatAMatches);
  }

  // 然后尝试格式 B: 默认 schedule 页面
  const formatBMatches = parseFormatB(html);
  for (const bm of formatBMatches) {
    // 去重
    if (!matches.some((m) => m.id === bm.id)) {
      matches.push(bm);
    }
  }

  // 尝试从 RSC payload 提取
  const rscMatches = parseRSCPayload(html);
  for (const rm of rscMatches) {
    if (!matches.some((m) => m.id === rm.id)) {
      matches.push(rm);
    }
  }

  // 尝试从 __NEXT_DATA__ 提取
  const nextDataMatches = parseNextData(html);
  for (const nm of nextDataMatches) {
    if (!matches.some((m) => m.id === nm.id)) {
      matches.push(nm);
    }
  }

  return matches;
}

// ====== 格式 A 解析器：联赛过滤页面 ======
// 结构: 日期标题 → 比赛条目（teamA, score, teamB, league, format）

function parseFormatA(html: string): Match[] {
  const matches: Match[] = [];

  // 匹配日期标题: <h2>, <h3>, <h4> 等包含日期格式的标题
  // e.g., "Saturday 30 May", "Monday 22 July", "Today"
  const datePatterns = [
    // 标准 HTML heading 包含日期
    /<(?:h[2-6]|div)[^>]*class="[^"]*(?:date|header|title|label|heading)[^"]*"[^>]*>\s*([^<]+?(?:January|February|March|April|May|June|July|August|September|October|November|December|Today)\s[^<]*?)\s*<\/(?:h[2-6]|div)>/gi,
    // 简化: 任意 heading 包含月份名
    /<(?:h[2-6])[^>]*>\s*((?:Today|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[^<]*?\d+\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)[^<]*?)\s*<\/(?:h[2-6])>/gi,
    // Today 单独
    /<(?:h[2-6])[^>]*>\s*Today\s*<\/(?:h[2-6])>/gi,
  ];

  // 找所有日期位置
  interface DateMarker {
    dateStr: string;
    index: number;
  }
  const dateMarkers: DateMarker[] = [];

  for (const pattern of datePatterns) {
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(html)) !== null) {
      const dateStr = m[1] || "Today";
      dateMarkers.push({ dateStr: dateStr.trim(), index: m.index });
    }
  }

  // 按位置排序并去重
  dateMarkers.sort((a, b) => a.index - b.index);
  const uniqueMarkers: DateMarker[] = [];
  for (const dm of dateMarkers) {
    if (
      uniqueMarkers.length === 0 ||
      dm.index - uniqueMarkers[uniqueMarkers.length - 1].index > 10
    ) {
      uniqueMarkers.push(dm);
    }
  }

  if (uniqueMarkers.length === 0) return matches;

  // 提取日期之间的文本块
  for (let i = 0; i < uniqueMarkers.length; i++) {
    const current = uniqueMarkers[i];
    const nextIndex =
      i + 1 < uniqueMarkers.length
        ? uniqueMarkers[i + 1].index
        : html.length;
    const block = html.slice(current.index, nextIndex);
    const date = parseLoLDate(current.dateStr);

    // 在日期块中提取匹配条目的文本
    // 比赛条目模式: teamA → score → teamB → league info → format
    const textBlock = stripHtml(block);
    const lines = textBlock
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && l.length < 200);

    // 在简化文本中搜索比赛模式
    extractMatchesFromLines(lines, date, matches);
  }

  return matches;
}

/**
 * 从文本行中提取比赛
 */
function extractMatchesFromLines(
  lines: string[],
  date: string,
  matches: Match[]
): void {
  // 找连续的 "TEAMA → SCORE → TEAMB → LEAGUE → FORMAT" 模式
  const teamPattern = /^[A-Z]{1,5}\d{0,2}$/; // 队伍简称如 BLG, T1, DK, CFO
  const scorePattern = /^\d{1,2}\s*\d{1,2}$/; // 如 "3 0" 或 "30"
  const formatPattern = /^Bo\d$/i;

  let i = 0;
  while (i < lines.length - 3) {
    const teamA = lines[i];
    const scoreLine = lines[i + 1];
    const teamB = lines[i + 2];

    // 检查是否匹配比赛模式
    const teamAMatch = teamPattern.test(teamA);
    const scoreMatch = scorePattern.test(scoreLine.replace(/\s/g, ""));
    const teamBMatch = teamPattern.test(teamB);

    if (teamAMatch && scoreMatch && teamBMatch) {
      let league = "";
      let format = "";

      // 下一行可能是 league
      if (i + 3 < lines.length && !teamPattern.test(lines[i + 3]) && !scorePattern.test(lines[i + 3].replace(/\s/g, ""))) {
        league = lines[i + 3];
        // 再下一行可能是 format
        if (i + 4 < lines.length && formatPattern.test(lines[i + 4])) {
          format = lines[i + 4];
        } else if (i + 4 < lines.length && lines[i + 4].toLowerCase().includes("best of")) {
          format = lines[i + 4];
        }
      }

      // 标准化分数
      const score = scoreLine.replace(/\s/g, "");
      const normalizedLeague = normalizeLeagueName(league);
      const normalizedFormat = normalizeFormat(format);

      const matchId = `lol-${date}-${teamA}-${teamB}`
        .replace(/\s+/g, "-")
        .toLowerCase();
      const startTime = date ? `${date}T12:00:00Z` : new Date().toISOString();

      matches.push({
        id: matchId,
        game: "lol",
        gameName: "英雄联盟",
        league: normalizedLeague || "LoL",
        tournament: league || normalizedLeague || "LoL",
        stage: undefined,
        teamA,
        teamB,
        startTime,
        format: normalizedFormat,
        status: score ? "finished" : "scheduled",
        source: "lolesports",
        sourceUrl: "https://lolesports.com/schedule",
        lastSyncedAt: new Date().toISOString(),
      });

      i += 4; // 跳过已处理的条目
      if (format) i++;
    } else {
      i++;
    }
  }
}

// ====== 格式 B 解析器：默认 schedule 页面 (VOD 链接格式) ======
// 结构: date → [time → teamA(record) → score → teamB(record) → league → format]

function parseFormatB(html: string): Match[] {
  const matches: Match[] = [];

  // 找 VOD 链接模式
  const vodPattern = /\/vod\/(\d+)\/\d+/g;
  const seenVodIds = new Set<string>();

  let vodMatch;
  while ((vodMatch = vodPattern.exec(html)) !== null) {
    const vodId = vodMatch[1];
    if (seenVodIds.has(vodId)) continue;
    seenVodIds.add(vodId);

    // 获取 VOD 链接附近的上下文
    const contextStart = Math.max(0, vodMatch.index - 3000);
    const contextEnd = Math.min(html.length, vodMatch.index + 3000);
    const context = html.slice(contextStart, contextEnd);

    // 提取队伍名称 (在 ## 标题中，带缩写)
    const teamMatches = [
      ...context.matchAll(
        /<h[2-3][^>]*>\s*(?:<a[^>]*>)?\s*([^(<\n]+?)\s*(?:\(?([A-Z]{2,5})\)?)?\s*(?:<\/a>)?\s*<\/h[2-3]>/gi
      ),
    ];

    // 简化: 从文本提取
    const textContext = stripHtml(context);
    const lines = textContext.split("\n").map((l) => l.trim()).filter(Boolean);

    if (lines.length < 4) continue;

    // 解析日期 (从上下文找，格式: "**Saturday** –5 August")
    const dateMatch = context.match(/\*\*(\w+)\*\*\s*[–-]\s*(\d+\s+\w+)/);
    const dateStr = dateMatch ? `${dateMatch[1]} ${dateMatch[2]}` : "";

    // 从 lines 中提取队伍名
    const teamLines = lines.filter(
      (l) =>
        /^[A-Z][a-zA-Z0-9 .&'-]{1,40}$/.test(l) &&
        !/^(best of|bo[135])/i.test(l) &&
        l.length >= 2 &&
        l.length <= 50
    );

    if (teamLines.length >= 2) {
      const teamA = teamLines[0];
      const teamB = teamLines[1];

      // 提取分数
      const scoreMatch = context.match(/\*\*(\d+)\s*-\s*(\d+)\*\*/);
      const score = scoreMatch
        ? `${scoreMatch[1]}-${scoreMatch[2]}`
        : undefined;

      // 提取联赛
      const leagueMatch = context.match(
        /\*\*([A-Z][A-Za-z &-]{2,30})\*\*/
      );
      const league = leagueMatch ? leagueMatch[1] : "";

      // 提取格式
      const formatMatch = context.match(/best of (\d+)/i);
      const format = formatMatch ? `Bo${formatMatch[1]}` : undefined;

      const date = parseLoLDate(dateStr);
      const normalizedLeague = normalizeLeagueName(league);

      matches.push({
        id: `lol-${vodId}`,
        game: "lol",
        gameName: "英雄联盟",
        league: normalizedLeague || "LoL",
        tournament: league || normalizedLeague || "LoL",
        stage: undefined,
        teamA,
        teamB,
        startTime: date ? `${date}T12:00:00Z` : new Date().toISOString(),
        format,
        status: score ? "finished" : "scheduled",
        source: "lolesports",
        sourceUrl: `https://lolesports.com/vod/${vodId}/1`,
        summary: score ? `${teamA} ${score} ${teamB}` : undefined,
        lastSyncedAt: new Date().toISOString(),
      });
    }
  }

  return matches;
}

// ====== RSC Payload 解析器 ======
// Next.js App Router 的 RSC payload 格式:
// self.__next_f.push([1, "..."])

function parseRSCPayload(html: string): Match[] {
  const matches: Match[] = [];
  const rscRegex = /self\.__next_f\.push\(\[1,\s*"([^"]*(?:\\.[^"]*)*)"\]\)/g;

  let match;
  while ((match = rscRegex.exec(html)) !== null) {
    try {
      // RSC payload 中的转义字符串
      const escaped = match[1];
      const unescaped = escaped
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");

      // 查找包含匹配 ID 的 payload 行
      // 常见的匹配 ID 格式在 RSC 中可能是 event ID
      const idMatches = unescaped.match(/"id"\s*:\s*"(\d{15,20})"/g);
      if (!idMatches) continue;

      for (const idStr of idMatches) {
        const idValue = idStr.match(/"(\d{15,20})"/)?.[1];
        if (!idValue) continue;

        // 在 payload 中搜索队伍名称
        const teamMatches = [
          ...unescaped.matchAll(/"name"\s*:\s*"([^"]+)"/g),
        ];
        const codeMatches = [
          ...unescaped.matchAll(/"code"\s*:\s*"([^"]+)"/g),
        ];

        const teams = teamMatches.map((m) => m[1]).slice(0, 2);
        const codes = codeMatches.map((m) => m[1]).slice(0, 2);

        if (teams.length >= 2 || codes.length >= 2) {
          const teamA = codes[0] || teams[0] || "TBD";
          const teamB = codes[1] || teams[1] || "TBD";

          // 查找日期
          const dateMatch = unescaped.match(
            /"startTime"\s*:\s*"([^"]+)"/i
          );
          const startTime = dateMatch?.[1] || new Date().toISOString();

          // 查找联赛
          const leagueMatch = unescaped.match(
            /"league"\s*:\s*\{[^}]*"slug"\s*:\s*"([^"]+)"/
          );
          const leagueSlug = leagueMatch?.[1] || "";
          const league = LEAGUE_SLUG_MAP[leagueSlug] || leagueSlug.toUpperCase();

          matches.push({
            id: `lol-${idValue}`,
            game: "lol",
            gameName: "英雄联盟",
            league: league || "LoL",
            tournament: league || "LoL",
            teamA,
            teamB,
            startTime,
            status: "scheduled",
            source: "lolesports",
            sourceUrl: `https://lolesports.com/schedule`,
            lastSyncedAt: new Date().toISOString(),
          });
        }
      }
    } catch {
      // RSC payload 解析失败，跳过
    }
  }

  return matches;
}

// ====== __NEXT_DATA__ 解析器 ======

function parseNextData(html: string): Match[] {
  const matches: Match[] = [];

  const nextDataMatch = html.match(
    /<script id="__NEXT_DATA__"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/
  );

  if (!nextDataMatch) return matches;

  try {
    const json = JSON.parse(nextDataMatch[1]);
    // 遍历 props 寻找赛程数据
    const scheduleData = findScheduleInObject(json);
    if (scheduleData && Array.isArray(scheduleData)) {
      for (const event of scheduleData) {
        const match = mapNextDataEvent(event);
        if (match) matches.push(match);
      }
    }
  } catch {
    // JSON 解析失败
  }

  return matches;
}

function findScheduleInObject(obj: any): any {
  if (!obj || typeof obj !== "object") return null;

  // 常见路径
  const paths = [
    "props.pageProps.schedule",
    "props.pageProps.events",
    "props.pageProps.data.schedule.events",
  ];

  for (const path of paths) {
    const parts = path.split(".");
    let current = obj;
    let found = true;
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        found = false;
        break;
      }
    }
    if (found && Array.isArray(current)) return current;
  }

  // 递归搜索 events 数组
  return findEventsRecursive(obj, 0);
}

function findEventsRecursive(obj: any, depth: number): any {
  if (!obj || typeof obj !== "object" || depth > 5) return null;
  if (Array.isArray(obj) && obj.length > 0 && obj[0]?.type === "match") {
    return obj;
  }
  for (const key of Object.keys(obj)) {
    if (key === "events" && Array.isArray(obj[key]) && obj[key].length > 0) {
      return obj[key];
    }
    const result = findEventsRecursive(obj[key], depth + 1);
    if (result) return result;
  }
  return null;
}

function mapNextDataEvent(event: any): Match | null {
  if (!event || event.type !== "match") return null;

  try {
    const match = event.match || event;
    const teams = match.teams || [];
    const teamA = teams[0]?.code || teams[0]?.name || "TBD";
    const teamB = teams[1]?.code || teams[1]?.name || "TBD";

    const leagueSlug = event.league?.slug || "";
    const league = LEAGUE_SLUG_MAP[leagueSlug] || leagueSlug.toUpperCase();
    const tournament = event.tournament?.name || league;

    const format = match.strategy
      ? `Bo${match.strategy.count}`
      : undefined;

    const status = mapLoLStatus(event.state);

    return {
      id: `lol-${match.id || event.id}`,
      game: "lol",
      gameName: "英雄联盟",
      league: league || "LoL",
      tournament,
      teamA,
      teamB,
      startTime: event.startTime || new Date().toISOString(),
      format,
      status,
      source: "lolesports",
      sourceUrl: match.id
        ? `https://lolesports.com/match/${match.id}`
        : undefined,
      lastSyncedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// ====== 工具函数 ======

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseLoLDate(dateStr: string): string {
  const now = new Date();
  const currentYear = now.getFullYear().toString();

  if (!dateStr || dateStr === "Today") {
    return now.toISOString().slice(0, 10);
  }

  // "Saturday 30 May" → extract day and month
  const match = dateStr.match(
    /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)/i
  );

  if (match) {
    const day = match[1].padStart(2, "0");
    const monthName = match[2].toLowerCase();
    const month = monthToNum(monthName);
    // 使用当前年份（如果日期在未来可能需要调整）
    const year = currentYear;
    return `${year}-${month}-${day}`;
  }

  // "Saturday –5 August" format
  const match2 = dateStr.match(
    /(?:–|-)\s*(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)/i
  );
  if (match2) {
    const day = match2[1].padStart(2, "0");
    const month = monthToNum(match2[2].toLowerCase());
    return `${currentYear}-${month}-${day}`;
  }

  return "";
}

function monthToNum(month: string): string {
  const months: Record<string, string> = {
    january: "01",
    february: "02",
    march: "03",
    april: "04",
    may: "05",
    june: "06",
    july: "07",
    august: "08",
    september: "09",
    october: "10",
    november: "11",
    december: "12",
  };
  return months[month] || "01";
}

function normalizeLeagueName(name: string): string {
  if (!name) return "";

  // 处理 "LPL • Playoffs" 格式
  const parts = name.split(/[•·-]/);
  const leaguePart = parts[0]?.trim() || "";

  const lower = leaguePart.toLowerCase();
  for (const [key, value] of Object.entries(LEAGUE_MAP)) {
    if (lower === key || lower.includes(key)) return value;
  }

  // 如果 leaguePart 全部大写且长度 2-5，返回原值
  if (/^[A-Z]{2,5}$/.test(leaguePart)) return leaguePart;

  return leaguePart || name;
}

function normalizeFormat(format: string): string | undefined {
  if (!format) return undefined;
  const match = format.match(/bo(\d)/i) || format.match(/best of (\d)/i);
  if (match) return `BO${match[1]}`;
  if (format.toLowerCase().includes("bo1")) return "BO1";
  if (format.toLowerCase().includes("bo3")) return "BO3";
  if (format.toLowerCase().includes("bo5")) return "BO5";
  return undefined;
}

function mapLoLStatus(state: string): Match["status"] {
  switch (state?.toLowerCase()) {
    case "unstarted":
    case "scheduled":
      return "scheduled";
    case "inprogress":
    case "live":
      return "live";
    case "completed":
    case "finished":
      return "finished";
    case "postponed":
    case "cancelled":
      return "postponed";
    default:
      return "scheduled";
  }
}
