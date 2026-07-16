import { z } from "zod";

import { parseSubscriptionWithAi } from "@/lib/ai/parseSubscription";
import { createSubscriptionFromRequest } from "@/lib/subscriptions/service";

export const subscriptionTool = {
  name: "subscriptionTool",
  inputSchema: z.object({
    action: z.enum(["createSubscription", "parseSubscriptionRule"]),
    payload: z.unknown(),
  }),
  outputSchema: z.unknown(),
  async call(input: unknown) {
    const parsed = this.inputSchema.parse(input);
    if (parsed.action === "parseSubscriptionRule") {
      return parseSubscriptionWithAi(String(parsed.payload));
    }
    return createSubscriptionFromRequest(parsed.payload);
  },
};
