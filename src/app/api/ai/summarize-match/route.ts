import { NextRequest, NextResponse } from "next/server";
import { summarizeMatchWithAI, templateSummarize } from "@/lib/ai/summarizeMatch";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameName, league, tournament, stage, teamA, teamB } = body;

    if (!teamA || !teamB) {
      return NextResponse.json(
        { error: "Missing required fields: teamA, teamB" },
        { status: 400 }
      );
    }

    const summary = await summarizeMatchWithAI({
      gameName: gameName || "",
      league: league || "",
      tournament: tournament || league || "",
      stage,
      teamA,
      teamB,
    });

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("[API] POST /api/ai/summarize-match error:", error);
    return NextResponse.json(
      { error: "Failed to summarize match" },
      { status: 500 }
    );
  }
}
