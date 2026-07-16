/**
 * ICS 日历生成 - 手写格式确保 Outlook / Apple Calendar / Google Calendar 兼容
 */
import { Match, Subscription } from "../connectors/types";

/**
 * 根据赛制估算比赛时长（分钟）
 */
function estimateDuration(format?: string): number {
  switch (format?.toUpperCase()) {
    case "BO1": return 60;
    case "BO3": return 150;
    case "BO5": return 240;
    default: return 120;
  }
}

/** 转 UTC 时间字符串 YYYYMMDDTHHMMSSZ */
function toUTC(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** 现在 UTC */
function now(): string {
  return toUTC(new Date());
}

/** 转义 ICS 文本（逗号、分号、反斜杠、换行） */
function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** 按 RFC 5545 折行（每行最多 75 字节，续行前加一个空格） */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let remaining = line;
  while (remaining.length > 75) {
    parts.push(remaining.slice(0, 75));
    remaining = remaining.slice(75);
  }
  if (remaining.length > 0) {
    parts.push(remaining);
  }
  // 第一行之后每行前面加一个空格（RFC 5545 续行标记）
  return parts.map((p, i) => (i === 0 ? p : " " + p)).join("\r\n");
}

function generateUID(match: Match): string {
  return `esports-cal-${match.id}@esports-calendar`;
}

export function generateICS(matches: Match[], subscription: Subscription): string {
  const lines: string[] = [];
  const name = subscription.name || "电竞赛事日历";

  // VCALENDAR header
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//esports-calendar//ai-esports-subscription//ZH");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");
  lines.push(`X-WR-CALNAME:${escapeText(name)}`);
  lines.push("X-WR-CALDESC:AI 电竞赛事日历订阅助手");
  lines.push("X-WR-TIMEZONE:Asia/Shanghai");
  lines.push("REFRESH-INTERVAL;VALUE=DURATION:PT1H");
  lines.push("X-PUBLISHED-TTL:PT1H");

  const nowDate = new Date();
  let eventCount = 0;

  for (const match of matches) {
    const startTime = new Date(match.startTime);
    if (startTime < nowDate) continue;

    const endTime = match.endTime
      ? new Date(match.endTime)
      : new Date(startTime.getTime() + estimateDuration(match.format) * 60 * 1000);

    const teamA = match.teamA || "TBD";
    const teamB = match.teamB || "TBD";
    const summary = `[${match.gameName}] ${teamA} vs ${teamB}`;
    const parts = [
      `赛事：${match.tournament}`,
      match.stage ? `阶段：${match.stage}` : "",
      `对阵：${teamA} vs ${teamB}`,
      match.format ? `赛制：${match.format}` : "",
      match.summary || "",
    ].filter(Boolean);
    const description = parts.join(" | ");

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${generateUID(match)}`);
    lines.push(`DTSTAMP:${now()}`);
    lines.push(`DTSTART:${toUTC(startTime)}`);
    lines.push(`DTEND:${toUTC(endTime)}`);
    lines.push(`SUMMARY:${escapeText(summary)}`);
    lines.push(`DESCRIPTION:${escapeText(description)}`);
    if (match.sourceUrl) {
      lines.push(`URL:${escapeText(match.sourceUrl)}`);
    }
    lines.push("STATUS:CONFIRMED");

    // 提醒
    if (subscription.reminderMinutes && subscription.reminderMinutes > 0) {
      const triggerMin = -subscription.reminderMinutes;
      lines.push("BEGIN:VALARM");
      lines.push("ACTION:DISPLAY");
      lines.push(`DESCRIPTION:${escapeText(summary)}`);
      lines.push(`TRIGGER:${triggerMin < 0 ? "-" : ""}PT${Math.abs(triggerMin)}M`);
      lines.push("END:VALARM");
    }

    lines.push("END:VEVENT");
    eventCount++;
  }

  lines.push("END:VCALENDAR");

  // 折行处理
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
