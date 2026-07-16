import { getRequestAppUrl } from "@/lib/http/origin";
import { listMatches } from "@/lib/matches/repository";
import { generateCalendarIcs } from "@/lib/calendar/generateIcs";
import { getSubscription } from "@/lib/subscriptions/repository";

function parseSubscriptionId(path: string[]) {
  const last = path.at(-1) ?? "";
  return last.endsWith(".ics") ? last.slice(0, -4) : last;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ subscriptionPath: string[] }> },
) {
  const params = await context.params;
  const subscriptionId = parseSubscriptionId(params.subscriptionPath);
  const subscription = await getSubscription(subscriptionId);

  if (!subscription) {
    return new Response("Subscription not found", { status: 404 });
  }

  const matches = await listMatches();
  const ics = generateCalendarIcs({
    subscriptionId: subscription.id,
    subscriptionName: subscription.name,
    rule: subscription,
    matches,
    origin: getRequestAppUrl(request, ""),
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${subscription.id}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
