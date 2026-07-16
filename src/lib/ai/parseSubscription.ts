import { KNOWN_GAMES, KNOWN_LEAGUES } from "../matches/mockData";

interface ParsedSubscription {
  games: string[];
  leagues: string[];
  teams: string[];
  reminderMinutes: number;
  includeKeywords: string[];
  excludeKeywords: string[];
}

/**
 * 使用大模型解析自然语言订阅需求
 */
export async function parseSubscriptionWithAI(query: string): Promise<ParsedSubscription> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    console.warn("[AI] No OpenAI API key, using local fallback");
    return localParseSubscription(query);
  }

  try {
    const { OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });

    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `你是一个电竞赛事订阅解析器。根据用户的自然语言输入，提取结构化订阅参数。
已知游戏：${KNOWN_GAMES.map((g) => g.id).join(", ")}
已知赛事：${KNOWN_LEAGUES.map((l) => l.id).join(", ")}
常见战队：BLG, TES, EDG, JDG, RNG, WBG, T1, GEN, DK, KT, HLE, DRX, PRX, FPX, DRG, G2, FNC, WE

规则：
- 只使用已知的游戏和赛事ID
- 不确定的队伍保留用户原文
- 排除关键词不要过度推断
- 提醒时间默认为60分钟，如果用户说"前一天"则为1440分钟

输出合法JSON，不要包含其他文字。`,
        },
        {
          role: "user",
          content: query,
        },
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    const text = response.choices[0]?.message?.content || "";
    // 尝试从回复中提取 JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        games: parsed.games || [],
        leagues: parsed.leagues || [],
        teams: parsed.teams || [],
        reminderMinutes: parsed.reminderMinutes ?? 60,
        includeKeywords: parsed.includeKeywords || [],
        excludeKeywords: parsed.excludeKeywords || [],
      };
    }
    throw new Error("Failed to parse AI response");
  } catch (error) {
    console.warn("[AI] AI parsing failed, using local fallback:", (error as Error).message);
    return localParseSubscription(query);
  }
}

/**
 * 本地规则解析自然语言（无 API Key 时的 fallback）
 */
export function localParseSubscription(query: string): ParsedSubscription {
  const q = query.toLowerCase();

  const games: string[] = [];
  if (q.includes("英雄联盟") || q.includes("lol") || q.includes("league")) {
    games.push("lol");
  }
  if (q.includes("无畏契约") || q.includes("valorant") || q.includes("瓦") || q.includes("vlr") || q.includes("vct")) {
    games.push("valorant");
  }
  if (q.includes("王者荣耀") || q.includes("hok") || q.includes("kpl") || q.includes("kcc") || q.includes("挑战者杯")) {
    games.push("hok");
  }

  const leagues: string[] = [];
  const leaguePatterns: Record<string, string[]> = {
    "LPL": ["lpl"],
    "LCK": ["lck"],
    "LEC": ["lec"],
    "LCS": ["lcs"],
    "MSI": ["msi", "季中"],
    "Worlds": ["worlds", "世界赛", "全球总决赛", "s赛"],
    "VCT CN": ["vct cn", "vctcn", "cn赛区"],
    "VCT Pacific": ["vct pacific", "vctpacific", "太平洋赛区"],
    "VCT Americas": ["vct americas", "vctamericas", "美洲赛区"],
    "VCT EMEA": ["vct emea", "vctemea", "欧洲赛区"],
    "Masters": ["masters", "大师赛"],
    "Champions": ["champions", "冠军赛"],
    "KPL": ["kpl", "王者荣耀职业联赛"],
    "KCC": ["kcc", "挑战者杯"],
  };
  for (const [league, patterns] of Object.entries(leaguePatterns)) {
    if (patterns.some((p) => q.includes(p))) {
      leagues.push(league);
    }
  }

  // 提取常见战队
  const knownTeams = [
    "BLG", "TES", "EDG", "JDG", "RNG", "WBG", "WE",
    "T1", "GEN", "DK", "KT", "HLE", "DRX",
    "PRX", "FPX", "DRG", "G2", "FNC",
  ];
  const teams = knownTeams.filter((t) =>
    q.toUpperCase().includes(t.toUpperCase())
  );

  // 提醒时间
  let reminderMinutes = 60;
  if (q.includes("前一天") || q.includes("1天") || q.includes("一天")) {
    reminderMinutes = 1440;
  }
  if (q.includes("30分钟") || q.includes("半小时")) {
    reminderMinutes = 30;
  }
  if (q.includes("15分钟")) {
    reminderMinutes = 15;
  }

  // 关键词
  const includeKeywords: string[] = [];
  const excludeKeywords: string[] = [];

  const excludeMatch = q.match(/(?:不看|排除|除了|不要)(.*?)(?:的|比赛|$)/);
  if (excludeMatch) {
    const excluded = excludeMatch[1].trim();
    if (excluded) excludeKeywords.push(excluded);
  }

  return { games, leagues, teams, reminderMinutes, includeKeywords, excludeKeywords };
}
