import { randomUUID } from "crypto";

import { prisma } from "@/lib/db/prisma";

import {
  normalizeSubscriptionRule,
  subscriptionRuleSchema,
  type SubscriptionRule,
} from "./rules";

type DbSubscription = {
  id: string;
  name: string;
  games: unknown;
  leagues: unknown;
  teams: unknown;
  timezone: string;
  reminderMinutes: number;
  includeKeywords: unknown;
  excludeKeywords: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export type SubscriptionRecord = SubscriptionRule & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

function stringArray(value: unknown) {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return stringArray(parsed);
    } catch {
      return [];
    }
  }

  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function jsonArray(values: string[]) {
  return JSON.stringify(values);
}

export function toSubscriptionRecord(record: DbSubscription): SubscriptionRecord {
  const rule = subscriptionRuleSchema.parse({
    name: record.name,
    games: stringArray(record.games),
    leagues: stringArray(record.leagues),
    teams: stringArray(record.teams),
    timezone: record.timezone,
    reminderMinutes: record.reminderMinutes,
    includeKeywords: stringArray(record.includeKeywords),
    excludeKeywords: stringArray(record.excludeKeywords),
  });

  return {
    id: record.id,
    ...rule,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function createSubscription(rule: SubscriptionRule) {
  const normalized = normalizeSubscriptionRule(rule);
  const record = await prisma.subscription.create({
    data: {
      id: `sub_${randomUUID()}`,
      name: normalized.name,
      games: jsonArray(normalized.games),
      leagues: jsonArray(normalized.leagues),
      teams: jsonArray(normalized.teams),
      timezone: normalized.timezone,
      reminderMinutes: normalized.reminderMinutes,
      includeKeywords: jsonArray(normalized.includeKeywords),
      excludeKeywords: jsonArray(normalized.excludeKeywords),
    },
  });

  return toSubscriptionRecord(record);
}

export async function getSubscription(subscriptionId: string) {
  const record = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });

  return record ? toSubscriptionRecord(record) : null;
}
