import ical, { ICalAlarmType, ICalCalendarMethod, ICalEventStatus } from "ical-generator";

import type { Match } from "@/lib/matches/schema";
import { matchSubscriptionRule, type SubscriptionRule } from "@/lib/subscriptions/rules";

export type GenerateCalendarInput = {
  subscriptionId: string;
  subscriptionName: string;
  rule: SubscriptionRule;
  matches: Match[];
  origin: string;
  now?: Date;
};

function estimateDurationMinutes(format?: string) {
  const normalized = format?.toUpperCase();
  if (normalized === "BO1") return 60;
  if (normalized === "BO3") return 150;
  if (normalized === "BO5") return 240;
  return 120;
}

function getMatchEnd(match: Match) {
  if (match.endTime) {
    return new Date(match.endTime);
  }
  return new Date(new Date(match.startTime).getTime() + estimateDurationMinutes(match.format) * 60_000);
}

function buildDescription(match: Match) {
  return [
    `${match.gameName}｜${match.league}｜${match.tournament}`,
    match.stage ? `阶段：${match.stage}` : undefined,
    `对阵：${match.teamA} vs ${match.teamB}`,
    match.format ? `赛制：${match.format}` : undefined,
    match.streamUrl ? `直播链接：${match.streamUrl}` : undefined,
    match.sourceUrl ? `比赛页面：${match.sourceUrl}` : undefined,
    match.summary ? `AI 摘要：${match.summary}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");
}

export function generateCalendarIcs(input: GenerateCalendarInput) {
  const now = input.now ?? new Date();
  const calendar = ical({
    name: input.subscriptionName,
    method: ICalCalendarMethod.PUBLISH,
    prodId: {
      company: "Esports AI Calendar",
      product: "Esports Calendar Assistant",
      language: "ZH-CN",
    },
  });

  calendar.timezone(null);
  calendar.source(`${input.origin}/api/calendar/${input.subscriptionId}.ics`);
  calendar.ttl(60 * 30);

  input.matches
    .filter((match) => matchSubscriptionRule(match, input.rule))
    .filter((match) => getMatchEnd(match) >= now)
    .forEach((match) => {
      const event = calendar.createEvent({
        id: `${input.subscriptionId}-${match.id}@esports-ai-calendar`,
        start: new Date(match.startTime),
        end: getMatchEnd(match),
        summary: `【${match.league}】${match.teamA} vs ${match.teamB}`,
        description: buildDescription(match),
        url: match.sourceUrl ?? match.streamUrl ?? `${input.origin}/matches`,
        status:
          match.status === "postponed"
            ? ICalEventStatus.CANCELLED
            : ICalEventStatus.CONFIRMED,
        stamp: new Date(match.lastSyncedAt),
      });

      event.createAlarm({
        type: ICalAlarmType.display,
        trigger: input.rule.reminderMinutes * 60,
        description: `即将开始：${match.teamA} vs ${match.teamB}`,
      });
    });

  return calendar.toString();
}
