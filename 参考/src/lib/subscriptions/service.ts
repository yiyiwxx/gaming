import { z } from "zod";

import { buildSubscriptionRuleFromNaturalLanguage } from "@/lib/ai/parseSubscription";

import { createSubscription } from "./repository";
import { normalizeSubscriptionRule, subscriptionRuleInputSchema } from "./rules";

export const createSubscriptionRequestSchema = subscriptionRuleInputSchema.extend({
  naturalLanguageQuery: z.string().trim().optional(),
});

export type CreateSubscriptionRequest = z.infer<typeof createSubscriptionRequestSchema>;

export async function createSubscriptionFromRequest(input: unknown) {
  const request = createSubscriptionRequestSchema.parse(input);
  const rule = request.naturalLanguageQuery
    ? await buildSubscriptionRuleFromNaturalLanguage(request.naturalLanguageQuery, request.name)
    : normalizeSubscriptionRule(request);

  return createSubscription(rule);
}
