import { NextRequest, NextResponse } from "next/server";
import { findMatches } from "@/lib/matches/repository";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const game = searchParams.get("game") || undefined;
  const league = searchParams.get("league") || undefined;
  const team = searchParams.get("team") || undefined;
  const source = searchParams.get("source") || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const status = searchParams.get("status") || undefined;
  const limit = parseInt(searchParams.get("limit") || "500") || 500;

  try {
    const matches = await findMatches({
      game,
      league,
      team,
      source,
      from,
      to,
      status,
      limit,
    });

    return NextResponse.json({ matches });
  } catch (error) {
    console.error("[API] GET /api/matches error:", error);
    return NextResponse.json(
      { error: "Failed to fetch matches" },
      { status: 500 }
    );
  }
}
