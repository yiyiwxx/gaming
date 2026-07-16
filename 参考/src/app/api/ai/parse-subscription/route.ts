import { z, ZodError } from "zod";

import { parseSubscriptionWithAi } from "@/lib/ai/parseSubscription";

const requestSchema = z.object({
  naturalLanguageQuery: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const rule = await parseSubscriptionWithAi(body.naturalLanguageQuery);
    return Response.json(rule);
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: "Invalid request", details: error.issues }, { status: 400 });
    }
    return Response.json({ error: "Failed to parse subscription" }, { status: 500 });
  }
}
