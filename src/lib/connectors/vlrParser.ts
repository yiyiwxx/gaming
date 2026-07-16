import { Match } from "./types";

/**
 * 从 VLR.gg 页面解析真实赛程
 */
export function parseVLRMatches(html: string): Match[] {
  const matches: Match[] = [];

  // 1. 提取所有 wf-card 区块（每个区块对应一个日期）
  const cardRegex = /<div class="wf-card"[^>]*>([\s\S]*?)(?=<div class="wf-card"|<div class="wf-label mod-large"|$)/g;
  let cardMatch;

  while ((cardMatch = cardRegex.exec(html)) !== null) {
    const cardHtml = cardMatch[1];

    // 从当前 card 之前的 HTML 中找到它所属的日期标签
    // wf-label 在 card 之前
    const beforeCard = html.slice(0, cardMatch.index);
    const dateLabels = [...beforeCard.matchAll(/<div[^>]*class="[^"]*wf-label[^"]*"[^>]*>\s*(?:<span[^>]*>[^<]*<\/span>)?\s*(\w+,\s*\w+\s+\d+,\s*\d{4})/g)];
    const dateLabel = dateLabels.length > 0 ? dateLabels[dateLabels.length - 1][1] : "";
    const baseDate = dateLabel ? parseDateLabel(dateLabel) : "";

    // 2. 在 card 内找到所有 match-item <a> 标签（保留 href 等属性）
    const itemRegex = /<a\s+href="\/(\d+)\/([^"]*)"[^>]*class="[^"]*(?:wf-module-item\s+)?match-item[^"]*"[^>]*>/g;
    let itemMatch;

    while ((itemMatch = itemRegex.exec(cardHtml)) !== null) {
      const matchId = itemMatch[1];
      const matchSlug = itemMatch[2];
      const startPos = itemMatch.index;
      const restHtml = cardHtml.slice(startPos);
      const endTagIdx = findMatchingCloseTag(restHtml);
      const itemHtml = endTagIdx > 0 ? restHtml.slice(0, endTagIdx) : restHtml.slice(0, 3000);

      const extracted = extractVLRMatchItem(itemHtml, matchId, matchSlug, baseDate);
      if (extracted) {
        matches.push(extracted);
      }
    }
  }

  return matches;
}

/**
 * 找到 </a> 的结束位置（处理嵌套结构）
 */
function findMatchingCloseTag(html: string): number {
  // 简单方法：找第一个 </a>
  const idx = html.indexOf("</a>");
  return idx >= 0 ? idx + 4 : -1;
}

/**
 * 从单个 match-item HTML 提取 Match 对象
 */
function extractVLRMatchItem(
  itemHtml: string,
  matchId: string,
  _matchSlug: string,
  baseDate: string
): Match | null {
  // 1. 提取战队名
  const teams = extractTeams(itemHtml);
  if (teams.length < 2) return null;
  // 跳过双方都是 TBD 的比赛
  if (teams[0] === "TBD" && teams[1] === "TBD") return null;

  // 2. 提取时间
  const timeStr = extractTime(itemHtml);

  // 3. 提取赛事名称和阶段
  const { tournament, stage } = extractEvent(itemHtml);

  // 4. 提取状态
  const status = itemHtml.includes("mod-live") ? "live" : "scheduled";

  // 5. 映射联赛
  const league = mapVLRToLeague(tournament);

  // 6. 计算时间
  const startTime = computeVLRStartTime(timeStr, baseDate);

  return {
    id: `vlr-${matchId}`,
    game: "valorant",
    gameName: "无畏契约",
    league,
    tournament,
    stage: stage || undefined,
    teamA: normalizeVLRTeam(teams[0]),
    teamB: normalizeVLRTeam(teams[1]),
    startTime,
    status: status as Match["status"],
    source: "vlr",
    sourceUrl: `https://www.vlr.gg/${matchId}/${_matchSlug}`,
    lastSyncedAt: new Date().toISOString(),
  };
}

function extractTeams(html: string): string[] {
  const teams: string[] = [];
  // 找 match-item-vs-team-name 块
  const teamNameRegex = /class="[^"]*match-item-vs-team-name[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div class="[^"]*match-item-vs-team-score|<div class="[^"]*match-item-vs-team-name|<\/div>\s*<\/div>)/g;
  let m;
  while ((m = teamNameRegex.exec(html)) !== null && teams.length < 2) {
    // 去除 span 标签
    const clean = m[1].replace(/<span[^>]*>.*?<\/span>/g, "").replace(/<[^>]+>/g, "");
    const name = clean.trim().replace(/\s+/g, " ");
    if (name && name !== "TBD" && name !== "–" && !name.match(/^&/)) {
      teams.push(name);
    } else if (name === "TBD") {
      teams.push("TBD");
    }
  }
  return teams;
}

function extractTime(html: string): string {
  const timeMatch = html.match(/<div[^>]*class="[^"]*match-item-time[^"]*"[^>]*>\s*([\d:]+)\s*(AM|PM)?/i);
  if (!timeMatch) return "";
  return `${timeMatch[1]}${timeMatch[2] ? " " + timeMatch[2].toUpperCase() : ""}`;
}

function extractEvent(html: string): { tournament: string; stage: string } {
  let tournament = "";
  let stage = "";

  // 找 match-item-event text-of 区块
  const eventMatch = html.match(/<div[^>]*class="[^"]*match-item-event text-of[^"]*"[^>]*>([\s\S]*?)<div class="[^"]*match-item-icon/);
  if (eventMatch) {
    const content = eventMatch[1];
    // 提取 series (stage)
    const seriesMatch = content.match(/<div[^>]*class="[^"]*match-item-event-series[^"]*"[^>]*>\s*([^<]+?)\s*<\/div>/);
    if (seriesMatch) {
      stage = seriesMatch[1].trim().replace(/&ndash;/g, "–").replace(/&amp;/g, "&");
    }

    // 提取 tournament - series div 后面的纯文本
    const afterSeries = content.replace(/<div[^>]*class="[^"]*match-item-event-series[^"]*"[^>]*>[\s\S]*?<\/div>/, "");
    tournament = afterSeries.replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " ");
  }

  return { tournament, stage };
}

function computeVLRStartTime(timeStr: string, baseDate: string): string {
  if (!timeStr) return new Date().toISOString();

  // 解析 "4:00 PM" 格式
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return new Date().toISOString();

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const ampm = match[3]?.toUpperCase();

  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;

  // 使用 card 的日期 + 提取的时间
  if (baseDate) {
    const date = new Date(`${baseDate}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00Z`);
    if (!isNaN(date.getTime())) return date.toISOString();
  }

  // Fallback: 用今天
  const now = new Date();
  now.setHours(hours, minutes, 0, 0);
  return now.toISOString();
}

// ===== 以下函数同之前 =====

/**
 * 解析日期标签
 */
function parseDateLabel(label: string): string {
  // e.g. "Tue, July 14, 2026"
  const match = label.match(/(\w+),\s*(\w+)\s+(\d+),\s*(\d{4})/);
  if (match) {
    return `${match[4]}-${monthToNum(match[2])}-${match[3].padStart(2, "0")}`;
  }
  return "";
}

function monthToNum(month: string): string {
  const months: Record<string, string> = {
    january: "01", february: "02", march: "03", april: "04",
    may: "05", june: "06", july: "07", august: "08",
    september: "09", october: "10", november: "11", december: "12",
  };
  return months[month.toLowerCase()] || "01";
}

function normalizeVLRTeam(name: string): string {
  const clean = name.trim().replace(/\s+/g, " ");

  const mapping: Record<string, string> = {
    "edward gaming": "EDG", "funplus phoenix": "FPX", "dragon ranger gaming": "DRG",
    "bilibili gaming": "BLG", "titan esports club": "TEC", "tyloo": "TYL",
    "all gamers": "AG", "wolves esports": "WOL", "novo esports": "NOVO",
    "xi lai gaming": "XLG", "trace esports": "TEC", "jdg esports": "JDG",
    "gen.g": "GEN", "gen.g esports": "GEN", "gen.g gc": "GEN",
    "dplus esports": "DK", "dplus": "DK", "t1": "T1", "drx": "DRX",
    "kiwoom drx": "DRX",
    "paper rex": "PRX", "talon esports": "TLN", "team secret": "TS",
    "global esports": "GE", "rex regum qeon": "RRQ", "dfm": "DFM",
    "zeta division": "ZETA", "bleed esports": "BLD", "full sense": "FS",
    "detonation focusme": "DFM", "nongshim redforce": "NS",
    "sentinels": "SEN", "100 thieves": "100T", "cloud9": "C9", "nrg": "NRG",
    "g2 esports": "G2", "kru esports": "KRU", "leviatan": "LEV",
    "loud": "LOUD", "mibr": "MIBR", "furia": "FURIA",
    "evil geniuses": "EG", "envy": "ENVY",
    "fnatic": "FNC", "team liquid": "TL",
    "team liquid brazil": "TL", "eternal fire": "EF",
    "team vitality": "VIT", "team heretics": "TH",
    "natus vincere": "NAVI", "bbl esports": "BBL",
    "fut esports": "FUT", "karmine corp": "KC", "giantx": "GX",
    "gentle mates": "M8",
    "rising esports gc": "RISING", "akave esports gc": "AKAVE",
    "cloud9 gc": "C9", "roso gc": "ROSO",
    "kr blaze": "KRU BLAZE",
    "sa gc": "SA GC",
    "tbd": "TBD",
  };

  const lower = clean.toLowerCase();
  for (const [key, value] of Object.entries(mapping)) {
    if (lower.includes(key)) return value;
  }

  return clean;
}

function mapVLRToLeague(tournament: string): string {
  const t = tournament.toLowerCase();

  if (t.includes("champions tour") || t.includes("vct")) {
    if (t.includes("china") || t.includes(" cn")) return "VCT CN";
    if (t.includes("pacific")) return "VCT Pacific";
    if (t.includes("americas")) return "VCT Americas";
    if (t.includes("emea")) return "VCT EMEA";
    return "VCT";
  }

  if (t.includes("champions 202") && !t.includes("game changers")) return "Champions";
  if (t.includes("masters")) return "Masters";

  if (t.includes("game changers")) {
    if (t.includes("china") || t.includes(" cn")) return "VCT CN";
    if (t.includes("korea") || t.includes("pacific") || t.includes("apac") || t.includes("south asia") || t.includes("japan") || t.includes("oceania")) return "VCT Pacific";
    if (t.includes("americas") || t.includes("latam") || t.includes("brazil") || t.includes("north")) return "VCT Americas";
    if (t.includes("emea") || t.includes("europe")) return "VCT EMEA";
    return "VCT";
  }

  if (t.includes("challengers")) {
    if (t.includes("china") || t.includes(" cn")) return "VCT CN";
    if (t.includes("korea") || t.includes("pacific") || t.includes("sea") || t.includes("japan") || t.includes("oce")) return "VCT Pacific";
    if (t.includes("americas") || t.includes("brazil") || t.includes("latam") || t.includes("north")) return "VCT Americas";
    if (t.includes("emea") || t.includes("europe") || t.includes("turkey") || t.includes("mena")) return "VCT EMEA";
    return "VCT";
  }

  return "VCT";
}

export function generateVLRMatchId(teamA: string, teamB: string, startTime: string): string {
  const date = new Date(startTime);
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const slug = `${teamA}-vs-${teamB}`.toLowerCase().replace(/\s+/g, "-");
  return `${dateStr}-${slug}`;
}
