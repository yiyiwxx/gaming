/**
 * 使用大模型生成赛事摘要
 * 无 API Key 时使用模板生成
 */
export async function summarizeMatchWithAI(match: {
  gameName: string;
  league: string;
  tournament: string;
  stage?: string;
  teamA: string;
  teamB: string;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    return templateSummarize(match);
  }

  try {
    const { OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });

    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `你是一个电竞赛事摘要生成器。为比赛生成30-60个中文字符的简短摘要。
规则：
- 不确定的内容保留原文
- 不编造不存在的赛事或队伍
- 不预测赛果
- 只输出摘要文本，不要其他内容`,
        },
        {
          role: "user",
          content: `游戏：${match.gameName}
赛事：${match.tournament}
阶段：${match.stage || "未知"}
队伍：${match.teamA} vs ${match.teamB}
请生成摘要。`,
        },
      ],
      temperature: 0.5,
      max_tokens: 100,
    });

    const text = response.choices[0]?.message?.content || "";
    return text.trim() || templateSummarize(match);
  } catch (error) {
    console.warn("[AI] Summarize failed, using template:", (error as Error).message);
    return templateSummarize(match);
  }
}

/**
 * 模板摘要生成（本地 fallback）
 */
export function templateSummarize(match: {
  gameName: string;
  league: string;
  tournament: string;
  stage?: string;
  teamA: string;
  teamB: string;
}): string {
  const parts: string[] = [];
  if (match.tournament) parts.push(match.tournament);
  if (match.stage) parts.push(match.stage);
  parts.push(`${match.teamA}对阵${match.teamB}`);
  return parts.join("，") + "。";
}
