// LPL.QQ.COM 官方赛程解析器
// 解析 lpl.qq.com 服务器渲染的赛程页面数据
import { Match } from "./types";

// 战队名称映射（中文 → 英文）
const TEAM_MAP: Record<string, string> = {
  "苏州lng": "LNG", "深圳nip": "NIP", "北京jdg": "JDG",
  "西安we": "WE", "上海edg": "EDG",
};

function normalizeTeam(name: string): string {
  const lower = name.trim().toLowerCase();
  return TEAM_MAP[lower] || name.trim();
}

/**
 * 解析 event.html 页面（MSI 2026 等国际赛事）
 *
 * 格式：
 *   2026-06-28 11:00 星期日
 *   韩国 大田
 *   TeamA
 *   ScoreA
 *   TeamB
 *   2026季中冠军赛 入围赛 第一天
 *   BO5
 */
export function parseLplqqEventHtml(text: string): Match[] {
  const matches: Match[] = [];
  const now = new Date();

  // 匹配日期行: 2026-06-28 11:00 星期日
  const dateRegex = /(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+星期[一二三四五六日]/g;
  const dateMatches = [...text.matchAll(dateRegex)];

  for (let idx = 0; idx < dateMatches.length; idx++) {
    const dm = dateMatches[idx];
    const dateStr = dm[1];
    const timeStr = dm[2];
    const startPos = dm.index!;

    // 提取该日期后的文本（到下一个日期或文件末尾）
    const nextIdx = idx + 1 < dateMatches.length ? dateMatches[idx + 1].index! : text.length;
    const block = text.slice(startPos, nextIdx);

    // 提取行
    const lines = block.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

    if (lines.length < 6) continue;

    // 跳过日期行
    let li = 1;

    // 跳过地点行（如 "韩国 大田"）
    if (li < lines.length && /[韩国|中国|北京|上海|深圳|苏州|西安|成都|杭州|伦敦|巴黎|柏林|洛杉矶|纽约|东京|首尔]/.test(lines[li])) {
      li++;
    }

    // TeamA
    const teamA = li < lines.length ? lines[li] : "";
    li++;
    // ScoreA (跳过)
    const scoreA = li < lines.length ? lines[li] : "";
    li++;
    // TeamB
    const teamB = li < lines.length ? lines[li] : "";
    li++;
    // ScoreB
    const scoreB = li < lines.length ? lines[li] : "";
    li++;
    // Tournament/Stage (e.g., "2026季中冠军赛 入围赛 第一天")
    const tournamentLine = li < lines.length ? lines[li] : "";
    li++;

    // 跳过 [详细数据](url) [赛事回放](url) 行
    while (li < lines.length && lines[li].startsWith("[")) li++;

    // Format (e.g., "BO5")
    const formatStr = li < lines.length ? lines[li] : "";

    if (teamA && teamB && tournamentLine) {
      const { tournament, stage } = parseChineseTournament(tournamentLine);
      const format = parseFormatChinese(formatStr);
      const isFinished = /\d+/.test(scoreA) && /\d+/.test(scoreB);
      const scoreAText = scoreA === "30" ? "3" : scoreA; // Normalize

      // 判断日期是否在过去
      const matchDate = new Date(`${dateStr}T${timeStr}:00+08:00`);
      const isPast = matchDate.getTime() < now.getTime();

      const id = `lplqq-${dateStr}-${teamA}-${teamB}`.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase();

      matches.push({
        id,
        game: "lol",
        gameName: "英雄联盟",
        league: tournament || "LoL",
        tournament: tournament || "LoL国际赛事",
        stage,
        teamA: normalizeTeam(teamA),
        teamB: normalizeTeam(teamB),
        startTime: matchDate.toISOString(),
        format,
        status: isPast || isFinished ? "finished" : "scheduled",
        source: "lplqq",
        sourceUrl: "https://lpl.qq.com/web202301/event.html?tabId=schedule",
        summary: isFinished ? `${teamA} ${scoreAText}-${scoreB} ${teamB}` : undefined,
        lastSyncedAt: now.toISOString(),
      });
    }
  }

  return matches;
}

/**
 * 解析 a20210823zmesport 页面（LPL 2025 历史赛程）
 *
 * 格式：
 *   2025-07-18 星期五
 *   HH:00 tournament_name
 *   TeamA
 *   Score (e.g., "2:0")
 *   TeamB
 *   赛后回顾
 */
export function parseLplqqScheduleHtml(text: string): Match[] {
  const matches: Match[] = [];
  const now = new Date();

  // 日期头: 2025-07-18 星期五
  const dateRegex = /(\d{4}-\d{2}-\d{2})\s+星期[一二三四五六日]/g;
  const dateMatches = [...text.matchAll(dateRegex)];

  for (let idx = 0; idx < dateMatches.length; idx++) {
    const dm = dateMatches[idx];
    const dateStr = dm[1];
    const startPos = dm.index!;
    const nextIdx = idx + 1 < dateMatches.length ? dateMatches[idx + 1].index! : text.length;
    const block = text.slice(startPos, nextIdx);

    // Sanitize: remove image URLs and their surrounding noise
    const sanitized = block
      .replace(/!\[.*?\]\(.*?\)/g, "")
      .replace(/https?:\/\/[^\s]+/g, "")
      .replace(/^.*\.(jpeg|jpg|png|gif|webp).*$/gim, "");

    const lines = sanitized.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

    // 格式：时间 tournament | TeamA | score | TeamB | 赛后回顾
    // 时间 tournament: "HH:00 tournament_name"

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      // 跳过日期行本身
      if (/^\d{4}-\d{2}-\d{2}/.test(line)) { i++; continue; }

      // 匹配 "HH:00 tournament_name" 或 "HH:00tournament_name"
      const timeTournamentMatch = line.match(/^(\d{2}):00(.+)$/);
      if (!timeTournamentMatch) {
        i++;
        continue;
      }

      const timeHour = timeTournamentMatch[1];
      const tournamentLine = timeTournamentMatch[2].trim();
      i++;

      // 收集后续行直到遇到下一个时间标记或日期
      const subLines: string[] = [];
      while (i < lines.length) {
        const nl = lines[i];
        if (/^\d{2}:00/.test(nl) || /^\d{4}-\d{2}-\d{2}/.test(nl)) break;
        subLines.push(nl);
        i++;
      }

      // 解析 subLines：TeamA, Score, TeamB, 赛后回顾（可能还有其他格式）
      // 跳过纯图片标签
      const cleanLines = subLines.filter((l) => {
        if (/^(IG|KC|LYON|LGDY|RNG)$/i.test(l)) return false; // filter chip labels
        if (/^[\d.]+$/.test(l)) return false; // pure numbers
        return true;
      });

      // 找 "赛后回顾" 作为标记
      const reviewIdx = cleanLines.findIndex((l) => l.includes("赛后回顾"));

      // 从后往前找 teamA, score, teamB
      let teamA = "";
      let teamB = "";
      let scoreStr = "";
      let foundReview = false;

      if (reviewIdx >= 0) {
        foundReview = true;
        // 赛后回顾 之前的几行是 teamB, score, teamA
        if (reviewIdx >= 3) {
          teamB = cleanLines[reviewIdx - 1];
          scoreStr = cleanLines[reviewIdx - 2];
          teamA = cleanLines[reviewIdx - 3];
        }
      } else {
        // 没有"赛后回顾"——可能是未开始或正在比赛
        // 尝试找 VS 或分数模式
        for (let j = 1; j < cleanLines.length - 1; j++) {
          const scoreMatch = cleanLines[j].match(/^(\d+)\s*[:：-]\s*(\d+)$/);
          if (scoreMatch) {
            teamA = cleanLines[j - 1] || "";
            scoreStr = cleanLines[j];
            teamB = cleanLines[j + 1] || "";
            break;
          }
        }
        // 尝试找 "VS" 分隔
        if (!teamA) {
          for (let j = 1; j < cleanLines.length - 1; j++) {
            if (/^VS$/i.test(cleanLines[j])) {
              teamA = cleanLines[j - 1] || "";
              teamB = cleanLines[j + 1] || "";
              break;
            }
          }
        }
      }

      // 过滤无效队名
      const isValidTeam = (s: string) =>
        /^[A-Za-z0-9\u4e00-\u9fff .&'-]{2,30}$/.test(s) &&
        !/^(赛后回顾|VS|vs|详细数据|赛事回放|英雄联盟|http)/i.test(s);

      if (isValidTeam(teamA) && isValidTeam(teamB) && tournamentLine) {
        const { tournament, stage } = parseChineseTournament(tournamentLine);
        const isFinished = foundReview && scoreStr.includes(":");
        const matchDate = new Date(`${dateStr}T${timeHour}:00:00+08:00`);
        const isPast = matchDate.getTime() < now.getTime();

        const id = `lplqq-${dateStr}-${teamA}-${teamB}`.replace(/[^a-zA-Z0-9\u4e00-\u9fff-]/g, "-").toLowerCase();

        let summary: string | undefined;
        if (isFinished && scoreStr) {
          summary = `${teamA} ${scoreStr} ${teamB}`;
        }

        matches.push({
          id,
          game: "lol",
          gameName: "英雄联盟",
          league: tournament || "LPL",
          tournament: tournament || "LPL",
          stage,
          teamA: normalizeTeam(teamA),
          teamB: normalizeTeam(teamB),
          startTime: matchDate.toISOString(),
          format: "BO3",
          status: isPast || isFinished ? "finished" : "scheduled",
          source: "lplqq",
          sourceUrl: "https://lpl.qq.com/cp/a20210823zmesport/page/schedule/?game=lol",
          summary,
          lastSyncedAt: now.toISOString(),
        });
      }
    }
  }

  return matches;
}

/**
 * 解析中文赛事名 → tournament + stage
 * e.g. "2026季中冠军赛 入围赛 第一天" → { tournament: "MSI 2026", stage: "入围赛 第一天" }
 * e.g. "2025职业联赛第三赛段组内赛 第一周" → { tournament: "LPL 2025", stage: "第三赛段 第一周" }
 */
function parseChineseTournament(str: string): { tournament: string; stage: string } {
  const t = str.trim();

  // MSI
  if (t.includes("季中冠军赛") || t.includes("MSI")) {
    const yearMatch = t.match(/(\d{4})/);
    const year = yearMatch ? yearMatch[1] : "2026";
    const stagePart = t.replace(/\d{4}季中冠军赛\s*/, "").replace(/MSI\s*/i, "");
    return { tournament: `MSI ${year}`, stage: stagePart || "正赛" };
  }

  // 电竞世界杯 (Esports World Cup)
  if (t.includes("电竞世界杯")) {
    const stagePart = t.replace(/.*电竞世界杯.*项目\s*/, "");
    return { tournament: "电竞世界杯", stage: stagePart || "淘汰赛" };
  }

  // LPL 职业联赛
  if (t.includes("职业联赛")) {
    const yearMatch = t.match(/(\d{4})/);
    const year = yearMatch ? yearMatch[1] : "2025";
    const stagePart = t.replace(/\d{4}职业联赛\s*/, "");
    return { tournament: `LPL ${year}`, stage: stagePart || "常规赛" };
  }

  // 通用
  return { tournament: t, stage: "" };
}

function parseFormatChinese(str: string): string | undefined {
  const m = str?.match(/bo(\d)/i) || str?.match(/BO(\d)/);
  return m ? `BO${m[1]}` : undefined;
}
