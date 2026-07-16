import { z } from "zod";

import { generateCalendarIcs } from "@/lib/calendar/generateIcs";
import { matchSchema } from "@/lib/matches/schema";
import { subscriptionRuleSchema } from "@/lib/subscriptions/rules";

export const calendarTool = {
  name: "calendarTool",
  inputSchema: z.object({
    subscriptionId: z.string(),
    subscriptionName: z.string(),
    rule: subscriptionRuleSchema,
    matches: z.array(matchSchema),
    origin: z.string().url(),
  }),
  outputSchema: z.object({
    ics: z.string(),
  }),
  async call(input: unknown) {
    const parsed = this.inputSchema.parse(input);
    return { ics: generateCalendarIcs(parsed) };
  },
};
