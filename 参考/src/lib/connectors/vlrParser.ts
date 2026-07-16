import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import { DateTime } from "luxon";

import type { Match } from "@/lib/matches/schema";

const vlrBaseUrl = "https://www.vlr.gg";
const defaultZone = process.env.VLR_TIMEZONE || "Asia/Shanghai";

function compactText(value: string) {
  return value.replace(/\s+/g, " ").replace(/\u2013/g, "-").trim();
}

function cleanTeamName(value: string) {
  return compactText(value.replace(/[0-9]+$/g, ""));
}

function inferLeague(tournament: string) {
  const normalized = tournament.toLocaleLowerCase();
  if (normalized.includes("vct") && normalized.includes("china")) return "VCT CN";
  if (normalized.includes("vct") && normalized.includes("pacific")) return "VCT Pacific";
  if (normalized.includes("masters")) return "VCT Masters";
  if (normalized.includes("champions")) return "Valorant Champions";
  if (normalized.includes("vct") && normalized.includes("emea")) return "VCT EMEA";
  if (normalized.includes("vct") && normalized.includes("americas")) return "VCT Americas";
  return tournament;
}

function inferFormat(stage: string, tournament: string) {
  const text = `${stage} ${tournament}`.toLocaleLowerCase();
  return text.includes("final") ? "BO5" : "BO3";
}

function inferStatus(item: cheerio.Cheerio<Element>) {
  const status = compactText(item.find(".ml-status").first().text()).toLocaleLowerCase();
  return status.includes("live") ? "live" : "scheduled";
}

function parseDateLabel(label: string, baseDate: Date) {
  const normalized = compactText(label)
    .replace(/\bToday\b/gi, "")
    .replace(/\bTomorrow\b/gi, "")
    .trim();

  if (!normalized) {
    return DateTime.fromJSDate(baseDate, { zone: defaultZone });
  }

  const formats = ["ccc, LLLL d, yyyy", "cccc, LLLL d, yyyy", "LLLL d, yyyy"];
  for (const format of formats) {
    const parsed = DateTime.fromFormat(normalized, format, {
      locale: "en-US",
      zone: defaultZone,
    });
    if (parsed.isValid) {
      return parsed;
    }
  }

  return DateTime.fromJSDate(baseDate, { zone: defaultZone });
}

function parseStartTime(dateLabel: string, timeLabel: string, baseDate: Date) {
  const date = parseDateLabel(dateLabel, baseDate);
  const parsedTime = DateTime.fromFormat(timeLabel.toUpperCase(), "h:mm a", {
    zone: defaultZone,
  });

  if (!parsedTime.isValid) {
    return date.startOf("day").toUTC().toISO() ?? new Date().toISOString();
  }

  return date
    .set({
      hour: parsedTime.hour,
      minute: parsedTime.minute,
      second: 0,
      millisecond: 0,
    })
    .toUTC()
    .toISO() ?? new Date().toISOString();
}

function dateLabelForItem($: cheerio.CheerioAPI, item: cheerio.Cheerio<Element>, baseDate: Date) {
  const cardLabel = item.closest(".wf-card").prevAll(".wf-label.mod-large").first().text();
  const directLabel = item.prevAll(".wf-label.mod-large").first().text();
  const label = compactText(cardLabel || directLabel);

  if (label.toLocaleLowerCase().includes("tomorrow")) {
    const tomorrow = DateTime.fromJSDate(baseDate, { zone: defaultZone }).plus({ days: 1 });
    return tomorrow.toFormat("ccc, LLLL d, yyyy");
  }

  return label || DateTime.fromJSDate(baseDate, { zone: defaultZone }).toFormat("ccc, LLLL d, yyyy");
}

function tournamentAndStage(item: cheerio.Cheerio<Element>) {
  const eventNode = item.find(".match-item-event").first();
  const seriesNode = (eventNode.length ? eventNode : item).find(".match-item-event-series").first();
  const series = compactText(seriesNode.text());
  const tournament = eventNode.length
    ? compactText(
        eventNode
          .clone()
          .find(".match-item-event-series")
          .remove()
          .end()
          .text(),
      )
    : "";
  const seriesLooksLikeTournament =
    /\b(vct|valorant|challengers|champions|game changers|esports world cup)\b/i.test(series);

  return {
    stage: series && !seriesLooksLikeTournament ? series : undefined,
    tournament: tournament || series || "VALORANT Esports",
  };
}

export function parseVlrMatchesHtml(html: string, baseDate = new Date()): Match[] {
  const $ = cheerio.load(html);
  const matches: Match[] = [];

  $(".match-item").each((_, element) => {
    const item = $(element);
    const href = item.attr("href");
    const id = href?.match(/^\/(\d+)\//)?.[1];
    const teamNodes = item.find(".match-item-vs-team-name .text-of").length
      ? item.find(".match-item-vs-team-name .text-of")
      : item.find(".match-item-vs-team-name");
    const teams = teamNodes
      .map((__, team) => cleanTeamName($(team).text()))
      .get()
      .filter(Boolean);
    const timeLabel = compactText(item.find(".match-item-time").first().text());

    if (!href || !id || teams.length < 2 || !timeLabel) {
      return;
    }

    const { stage, tournament } = tournamentAndStage(item);
    const startTime = parseStartTime(dateLabelForItem($, item, baseDate), timeLabel, baseDate);

    matches.push({
      id: `valorant-vlr-${id}`,
      game: "valorant",
      gameName: "VALORANT",
      league: inferLeague(tournament),
      tournament,
      stage,
      teamA: teams[0],
      teamB: teams[1],
      startTime,
      format: inferFormat(stage ?? "", tournament),
      status: inferStatus(item),
      source: "vlr.gg",
      sourceUrl: `${vlrBaseUrl}${href}`,
      summary: `${inferLeague(tournament)} ${stage ?? "赛程"}：${teams[0]} 对阵 ${teams[1]}。`,
      lastSyncedAt: new Date().toISOString(),
    });
  });

  return matches;
}

export async function fetchVlrMatches() {
  const response = await fetch(`${vlrBaseUrl}/matches`, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; EsportsCalendarBot/1.0; +https://example.com)",
    },
    next: { revalidate: 60 * 15 },
  });

  if (!response.ok) {
    throw new Error(`VLR schedule request failed: ${response.status}`);
  }

  return parseVlrMatchesHtml(await response.text());
}
