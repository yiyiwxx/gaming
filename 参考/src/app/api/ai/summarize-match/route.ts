import { ZodError } from "zod";

import { summarizeMatchWithAi } from "@/lib/ai/summarizeMatch";
import { matchSchema } from "@/lib/matches/schema";

export async function POST(request: Request) {
  try {
    const match = matchSchema.parse(await request.json());
    const summary = await summarizeMatchWithAi(match);
    return Response.json({ summary });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: "Invalid match", details: error.issues }, { status: 400 });
    }
    return Response.json({ error: "Failed to summarize match" }, { status: 500 });
  }
}
