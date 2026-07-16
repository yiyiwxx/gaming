import { Subscription, CreateSubscriptionInput } from "../connectors/types";
import { createSubscription, findSubscriptionById } from "./repository";
import { normalizeTeams } from "./rules";
import { findUpcomingMatches } from "../matches/repository";
import { generateICS } from "../calendar/generateIcs";

/**
 * 订阅服务
 */
export const subscriptionService = {
  /**
   * 创建订阅并返回 ICS URL
   */
  async create(input: CreateSubscriptionInput): Promise<{
    subscription: Subscription;
    calendarUrl: string;
  }> {
    const subscription = await createSubscription({
      name: input.name,
      games: input.games || [],
      leagues: input.leagues || [],
      teams: normalizeTeams(input.teams || []),
      timezone: input.timezone || "Asia/Shanghai",
      reminderMinutes: input.reminderMinutes ?? 60,
      includeKeywords: input.includeKeywords || [],
      excludeKeywords: input.excludeKeywords || [],
    });

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const calendarUrl = `${appUrl}${basePath}/api/calendar/${subscription.id}.ics`;

    return { subscription, calendarUrl };
  },

  /**
   * 根据订阅 ID 生成 ICS 文本
   */
  async generateICS(subscriptionId: string): Promise<string | null> {
    const subscription = await findSubscriptionById(subscriptionId);
    if (!subscription) return null;

    const matches = await findUpcomingMatches({
      game: subscription.games?.[0],
      leagues: subscription.leagues,
      teams: subscription.teams,
      includeKeywords: subscription.includeKeywords,
      excludeKeywords: subscription.excludeKeywords,
    });

    return generateICS(matches, subscription);
  },

  /**
   * 获取订阅信息
   */
  async getById(id: string): Promise<Subscription | null> {
    return findSubscriptionById(id);
  },
};
