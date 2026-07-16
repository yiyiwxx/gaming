import { NextRequest, NextResponse } from "next/server";
import { decodeSubscription, expandSubscription } from "@/lib/subscriptions/urlCodec";
import { getMatchesForICS } from "@/lib/matches/serverlessFetcher";
import { generateICS } from "@/lib/calendar/generateIcs";
import { Subscription } from "@/lib/connectors/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: { subscriptionPath: string[] } }
) {
  const subscriptionPath = params.subscriptionPath;
  const fileName = subscriptionPath[0]; // e.g. "abc123.ics" or base64encoded.ics
  const rawId = fileName.replace(/\.ics$/, "");

  if (!rawId) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  try {
    // 尝试从 URL 编码中解码订阅参数
    const encoded = decodeSubscription(rawId);
    const sub = expandSubscription(encoded);

    // 构造虚拟 Subscription 对象（无需 DB）
    const subscription: Subscription = {
      id: rawId,
      name: sub.name,
      games: sub.games,
      leagues: sub.leagues,
      teams: sub.teams,
      timezone: sub.timezone,
      reminderMinutes: sub.reminderMinutes,
      includeKeywords: sub.includeKeywords,
      excludeKeywords: sub.excludeKeywords,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const matches = await getMatchesForICS({
      games: sub.games,
      leagues: sub.leagues,
      teams: sub.teams,
      includeKeywords: sub.includeKeywords,
      excludeKeywords: sub.excludeKeywords,
    });

    const icsContent = generateICS(matches, subscription);

    return new NextResponse(icsContent, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename="esports-calendar.ics"`,
        "Cache-Control": "public, max-age=300, s-maxage=600",
      },
    });
  } catch (error) {
    console.error("[API] GET /api/calendar error:", error);
    return NextResponse.json(
      { error: "Failed to generate calendar" },
      { status: 500 }
    );
  }
}
