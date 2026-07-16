import { NextResponse } from "next/server";
import { syncAllMatches } from "@/lib/sync/syncMatches";

export async function POST() {
  try {
    const result = await syncAllMatches();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] POST /api/admin/sync error:", error);
    return NextResponse.json(
      { error: "Sync failed", message: (error as Error).message },
      { status: 500 }
    );
  }
}
