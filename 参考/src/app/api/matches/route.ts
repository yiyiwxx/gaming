import { ZodError } from "zod";

import { listMatches } from "@/lib/matches/repository";
import { matchesQuerySchema } from "@/lib/matches/schema";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = matchesQuerySchema.parse({
      game: searchParams.get("game") || undefined,
      league: searchParams.get("league") || undefined,
      team: searchParams.get("team") || undefined,
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
    });
    const matches = await listMatches(query);

    return Response.json({ matches });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: "Invalid query", details: error.issues }, { status: 400 });
    }

    return Response.json({ error: "Failed to load matches" }, { status: 500 });
  }
}
