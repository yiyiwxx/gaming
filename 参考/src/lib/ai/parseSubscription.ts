import OpenAI from "openai";

import {
  normalizeSubscriptionRule,
  subscriptionRuleSchema,
  type SubscriptionRule,
} from "@/lib/subscriptions/rules";

export const subscriptionParseSystemPrompt = [
  "你是电竞赛事日历订阅规则解析器。",
  "必须只输出合法 JSON，不要输出 Markdown、解释或多余字段。",
  "把用户自然语言转换为 games、leagues、teams、timezone、reminderMinutes、includeKeywords、excludeKeywords。",
  "games 只能使用 lol 或 valorant；无法判断游戏时可根据已知英雄联盟战队和 VALORANT 赛事推断，仍不确定则留空。",
  "不确定的战队或赛事要保留原文，不要随意编造。",
  "北京时间输出 Asia/Shanghai；东京时间输出 Asia/Tokyo。",
  "提前一天提醒输出 1440；赛前 60 分钟或一小时输出 60。",
].join("\n");

export const subscriptionParseUserPrompt = (query: string) =>
  `请解析以下订阅需求并输出 JSON：\n${query}`;

const parsedRuleSchema = subscriptionRuleSchema.omit({ name: true });

const parseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    games: { type: "array", items: { enum: ["lol", "valorant"], type: "string" } },
    leagues: { type: "array", items: { type: "string" } },
    teams: { type: "array", items: { type: "string" } },
    timezone: { type: "string" },
    reminderMinutes: { type: "integer" },
    includeKeywords: { type: "array", items: { type: "string" } },
    excludeKeywords: { type: "array", items: { type: "string" } },
  },
  required: [
    "games",
    "leagues",
    "teams",
    "timezone",
    "reminderMinutes",
    "includeKeywords",
    "excludeKeywords",
  ],
};

const knownTeams = [
  "BLG",
  "TES",
  "EDG",
  "T1",
  "GEN",
  "DRX",
  "PRX",
  "Wolves",
  "Sentinels",
  "FNATIC",
];

const knownLeagues = [
  "LPL",
  "LCK",
  "MSI",
  "Worlds",
  "VCT CN",
  "VCT Pacific",
  "VCT Masters",
  "Valorant Champions",
];

export function parseSubscriptionFallback(query: string): Omit<SubscriptionRule, "name"> {
  const teams = knownTeams.filter((team) =>
    new RegExp(`(^|[^A-Za-z0-9])${team}([^A-Za-z0-9]|$)`, "i").test(query),
  );
  const leagues = knownLeagues.filter((league) =>
    query.toLocaleLowerCase().includes(league.toLocaleLowerCase()),
  );

  const games = new Set<"lol" | "valorant">();
  if (
    leagues.some((league) => ["LPL", "LCK", "MSI", "Worlds"].includes(league)) ||
    teams.some((team) => ["BLG", "TES", "T1", "GEN"].includes(team))
  ) {
    games.add("lol");
  }
  if (
    leagues.some((league) => league.startsWith("VCT") || league === "Valorant Champions") ||
    teams.some((team) => ["EDG", "DRX", "PRX", "Wolves", "Sentinels", "FNATIC"].includes(team))
  ) {
    games.add("valorant");
  }

  const timezone = /东京|Tokyo|Asia\/Tokyo/i.test(query)
    ? "Asia/Tokyo"
    : "Asia/Shanghai";

  const reminderMinutes = /提前\s*(1|一)\s*天|一天|1\s*day|one\s*day/i.test(query)
    ? 1440
    : 60;

  return parsedRuleSchema.parse({
    games: Array.from(games),
    leagues,
    teams: teams.map((team) => team.toUpperCase()),
    timezone,
    reminderMinutes,
    includeKeywords: [],
    excludeKeywords: [],
  });
}

export async function parseSubscriptionWithAi(query: string): Promise<Omit<SubscriptionRule, "name">> {
  if (!process.env.OPENAI_API_KEY) {
    return parseSubscriptionFallback(query);
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      instructions: subscriptionParseSystemPrompt,
      input: subscriptionParseUserPrompt(query),
      text: {
        format: {
          type: "json_schema",
          name: "subscription_rule",
          strict: true,
          schema: parseSchema,
        },
      },
    });

    const json = JSON.parse(response.output_text);
    return parsedRuleSchema.parse(json);
  } catch (error) {
    console.warn("AI subscription parsing failed, using fallback.", error);
    return parseSubscriptionFallback(query);
  }
}

export async function buildSubscriptionRuleFromNaturalLanguage(
  query: string,
  name?: string,
): Promise<SubscriptionRule> {
  const parsed = await parseSubscriptionWithAi(query);
  return normalizeSubscriptionRule({ ...parsed, name });
}
