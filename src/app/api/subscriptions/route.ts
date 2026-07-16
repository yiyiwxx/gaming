import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { subscriptionService } from "@/lib/subscriptions/service";
import { parseSubscriptionWithAI } from "@/lib/ai/parseSubscription";

const CreateSubscriptionSchema = z.object({
  name: z.string().optional(),
  games: z.array(z.string()).optional(),
  leagues: z.array(z.string()).optional(),
  teams: z.array(z.string()).optional(),
  timezone: z.string().optional(),
  reminderMinutes: z.number().int().min(0).max(10080).optional(),
  includeKeywords: z.array(z.string()).optional(),
  excludeKeywords: z.array(z.string()).optional(),
  naturalLanguageQuery: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing 'id' parameter" }, { status: 400 });
  }

  const subscription = await subscriptionService.getById(id);
  if (!subscription) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  return NextResponse.json({ subscription });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateSubscriptionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;

    // 如果有自然语言查询，先调用 AI 解析
    if (input.naturalLanguageQuery) {
      const aiResult = await parseSubscriptionWithAI(input.naturalLanguageQuery);

      // 合并 AI 结果和手动输入（手动输入优先级更高）
      const result = await subscriptionService.create({
        name: input.name || `订阅 - ${new Date().toLocaleDateString("zh-CN")}`,
        games: input.games?.length ? input.games : aiResult.games,
        leagues: input.leagues?.length ? input.leagues : aiResult.leagues,
        teams: input.teams?.length ? input.teams : aiResult.teams,
        timezone: input.timezone || "Asia/Shanghai",
        reminderMinutes: input.reminderMinutes ?? aiResult.reminderMinutes,
        includeKeywords: input.includeKeywords || aiResult.includeKeywords,
        excludeKeywords: input.excludeKeywords || aiResult.excludeKeywords,
      });

      return NextResponse.json(result);
    }

    // 纯手动创建
    const result = await subscriptionService.create({
      name: input.name,
      games: input.games || [],
      leagues: input.leagues || [],
      teams: input.teams || [],
      timezone: input.timezone || "Asia/Shanghai",
      reminderMinutes: input.reminderMinutes ?? 60,
      includeKeywords: input.includeKeywords || [],
      excludeKeywords: input.excludeKeywords || [],
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] POST /api/subscriptions error:", error);
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}
