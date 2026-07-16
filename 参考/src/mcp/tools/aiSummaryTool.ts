import { z } from "zod";

import { summarizeMatchWithAi } from "@/lib/ai/summarizeMatch";
import { matchSchema } from "@/lib/matches/schema";

export const aiSummaryTool = {
  name: "aiSummaryTool",
  inputSchema: matchSchema,
  outputSchema: z.object({
    summary: z.string(),
  }),
  async call(input: unknown) {
    const match = this.inputSchema.parse(input);
    return { summary: await summarizeMatchWithAi(match) };
  },
};
