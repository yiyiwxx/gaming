import { syncMatches } from "@/lib/sync/syncMatches";

export async function POST() {
  const results = await syncMatches();
  const syncedCount = results.reduce((sum, result) => sum + result.syncedCount, 0);
  const hasError = results.some((result) => result.status === "error");

  return Response.json(
    {
      status: hasError ? "partial_error" : "success",
      syncedCount,
      results,
    },
    { status: hasError ? 207 : 200 },
  );
}
