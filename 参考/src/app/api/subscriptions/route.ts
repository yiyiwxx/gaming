import { ZodError } from "zod";

import { getRequestAppUrl } from "@/lib/http/origin";
import { createSubscriptionFromRequest } from "@/lib/subscriptions/service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const subscription = await createSubscriptionFromRequest(body);

    return Response.json({
      subscription,
      calendarUrl: getRequestAppUrl(request, `/api/calendar/${subscription.id}.ics`),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: "Invalid subscription", details: error.issues }, { status: 400 });
    }

    return Response.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}
