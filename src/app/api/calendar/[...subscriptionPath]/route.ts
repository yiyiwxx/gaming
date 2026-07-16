import { NextRequest, NextResponse } from "next/server";
import { subscriptionService } from "@/lib/subscriptions/service";

export async function GET(
  _request: NextRequest,
  { params }: { params: { subscriptionPath: string[] } }
) {
  const subscriptionPath = params.subscriptionPath;
  const fileName = subscriptionPath[0]; // e.g. "abc123.ics"
  const subscriptionId = fileName.replace(/\.ics$/, "");

  if (!subscriptionId) {
    return NextResponse.json({ error: "Invalid subscription ID" }, { status: 400 });
  }

  try {
    const icsContent = await subscriptionService.generateICS(subscriptionId);

    if (!icsContent) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    return new NextResponse(icsContent, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename="${subscriptionId}.ics"`,
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
