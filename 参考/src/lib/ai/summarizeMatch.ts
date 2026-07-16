import OpenAI from "openai";

import type { Match } from "@/lib/matches/schema";

export const summarySystemPrompt = [
  "你是电竞赛事日历助手，为比赛生成一句中文摘要。",
  "摘要控制在 30-60 个中文字符。",
  "不要预测确定性赛果，不要使用必胜、稳赢等表达。",
  "不要编造不存在的数据，只能基于输入中的赛事、阶段、队伍、赛制和链接信息。",
].join("\n");

export const summaryUserPrompt = (match: Match) =>
  [
    `游戏：${match.gameName}`,
    `赛事：${match.league} / ${match.tournament}`,
    `阶段：${match.stage ?? "未提供"}`,
    `对阵：${match.teamA} vs ${match.teamB}`,
    `赛制：${match.format ?? "未提供"}`,
  ].join("\n");

export function summarizeMatchFallback(match: Match) {
  const stage = match.stage ? `${match.stage} ` : "";
  const format = match.format ? `${match.format} ` : "";
  return `${match.league} ${stage}${format}焦点对局，${match.teamA} 与 ${match.teamB} 交锋，建议关注节奏变化。`;
}

export async function summarizeMatchWithAi(match: Match) {
  if (!process.env.OPENAI_API_KEY) {
    return summarizeMatchFallback(match);
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      instructions: summarySystemPrompt,
      input: summaryUserPrompt(match),
      text: { verbosity: "low" },
    });
    const summary = response.output_text.trim();
    if (summary.length < 30 || summary.length > 60) {
      return summarizeMatchFallback(match);
    }
    return summary;
  } catch (error) {
    console.warn("AI match summary failed, using fallback.", error);
    return summarizeMatchFallback(match);
  }
}
