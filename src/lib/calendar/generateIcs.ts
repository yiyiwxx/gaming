import ical, { ICalCalendarMethod, ICalEventStatus, ICalAlarmType } from "ical-generator";
import { Match } from "../connectors/types";
import { Subscription } from "../connectors/types";

/**
 * 根据赛制估算比赛时长（分钟）
 */
function estimateDuration(format?: string): number {
  switch (format?.toUpperCase()) {
    case "BO1":
      return 60;
    case "BO3":
      return 150;
    case "BO5":
      return 240;
    default:
      return 120;
  }
}

/**
 * 计算 endTime
 */
function getEndTime(match: Match): string {
  if (match.endTime) return match.endTime;
  const durationMinutes = estimateDuration(match.format);
  const start = new Date(match.startTime);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return end.toISOString();
}

/**
 * 生成稳定的 UID
 */
function generateUID(match: Match): string {
  return `esports-cal-${match.id}@esports-calendar`;
}

/**
 * 为一批比赛生成 ICS 日历
 * 只包含当前及未来的比赛
 */
export function generateICS(
  matches: Match[],
  subscription: Subscription
): string {
  const cal = ical({
    name: subscription.name || "电竞赛事日历",
    prodId: {
      company: "esports-calendar",
      product: "ai-esports-subscription",
      language: "ZH",
    },
    description: "AI 电竞赛事日历订阅助手",
    timezone: "UTC",
    method: ICalCalendarMethod.PUBLISH,
  });

  // Outlook 兼容属性
  cal.x([
    { key: "X-WR-CALNAME", value: subscription.name || "电竞赛事日历" },
    { key: "X-WR-TIMEZONE", value: "Asia/Shanghai" },
    { key: "REFRESH-INTERVAL;VALUE=DURATION", value: "PT1H" },
    { key: "X-PUBLISHED-TTL", value: "PT1H" },
  ]);

  const now = new Date();

  for (const match of matches) {
    // 跳过过去的比赛
    const startTime = new Date(match.startTime);
    if (startTime < now) continue;

    const endTime = new Date(getEndTime(match));

    const teamADisplay = match.teamA || "TBD";
    const teamBDisplay = match.teamB || "TBD";

    const summary = `[${match.gameName}] ${teamADisplay} vs ${teamBDisplay}`;
    const description = [
      `赛事：${match.tournament}`,
      match.stage ? `阶段：${match.stage}` : "",
      `对阵：${teamADisplay} vs ${teamBDisplay}`,
      match.format ? `赛制：${match.format}` : "",
      match.summary ? `\n${match.summary}` : "",
      match.streamUrl ? `\n直播：${match.streamUrl}` : "",
      match.sourceUrl ? `\n详情：${match.sourceUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const event = cal.createEvent({
      id: generateUID(match),
      start: startTime,
      end: endTime,
      summary,
      description,
      status: ICalEventStatus.CONFIRMED,
      url: match.sourceUrl,
    });

    // 添加提醒
    if (subscription.reminderMinutes && subscription.reminderMinutes > 0) {
      event.createAlarm({
        type: ICalAlarmType.display,
        triggerBefore: subscription.reminderMinutes * 60,
      });
    }
  }

  return cal.toString();
}
