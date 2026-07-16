import { NextRequest, NextResponse } from "next/server";
import { parseSubscriptionWithAI } from "@/lib/ai/parseSubscription";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'query' field" },
        { status: 400 }
      );
    }

    const result = await parseSubscriptionWithAI(query);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] POST /api/ai/parse-subscription error:", error);
    return NextResponse.json(
      { error: "Failed to parse subscription" },
      { status: 500 }
    );
  }
}
