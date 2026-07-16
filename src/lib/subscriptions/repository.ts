import { PrismaClient } from "@prisma/client";
import { Subscription } from "../connectors/types";

const prisma = new PrismaClient();

/**
 * 创建订阅
 */
export async function createSubscription(data: {
  name?: string;
  games: string[];
  leagues: string[];
  teams: string[];
  timezone: string;
  reminderMinutes: number;
  includeKeywords: string[];
  excludeKeywords: string[];
}): Promise<Subscription> {
  const dbSubscription = await prisma.subscription.create({
    data: {
      id: generateId(),
      name: data.name || null,
      games: JSON.stringify(data.games),
      leagues: JSON.stringify(data.leagues),
      teams: JSON.stringify(data.teams),
      timezone: data.timezone,
      reminderMinutes: data.reminderMinutes,
      includeKeywords: JSON.stringify(data.includeKeywords),
      excludeKeywords: JSON.stringify(data.excludeKeywords),
    },
  });

  return mapDBSubscription(dbSubscription);
}

/**
 * 根据 ID 查找订阅
 */
export async function findSubscriptionById(id: string): Promise<Subscription | null> {
  const dbSub = await prisma.subscription.findUnique({
    where: { id },
  });
  return dbSub ? mapDBSubscription(dbSub) : null;
}

function generateId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 16; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function mapDBSubscription(db: {
  id: string;
  name: string | null;
  games: string;
  leagues: string;
  teams: string;
  timezone: string;
  reminderMinutes: number;
  includeKeywords: string;
  excludeKeywords: string;
  createdAt: Date;
  updatedAt: Date;
}): Subscription {
  return {
    id: db.id,
    name: db.name || undefined,
    games: safeParseArray(db.games),
    leagues: safeParseArray(db.leagues),
    teams: safeParseArray(db.teams),
    timezone: db.timezone,
    reminderMinutes: db.reminderMinutes,
    includeKeywords: safeParseArray(db.includeKeywords),
    excludeKeywords: safeParseArray(db.excludeKeywords),
    createdAt: db.createdAt.toISOString(),
    updatedAt: db.updatedAt.toISOString(),
  };
}

function safeParseArray(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
