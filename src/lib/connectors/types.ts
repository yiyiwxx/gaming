// 标准 Match 类型
export interface Match {
  id: string;
  game: "lol" | "valorant" | "hok";
  gameName: string;
  league: string;
  tournament: string;
  stage?: string;
  teamA: string;
  teamB: string;
  startTime: string; // UTC ISO
  endTime?: string;
  format?: string; // BO1 / BO3 / BO5
  status: "scheduled" | "live" | "finished" | "postponed";
  source: string;
  sourceUrl?: string;
  streamUrl?: string;
  summary?: string;
  lastSyncedAt: string;
}

// 订阅规则
export interface Subscription {
  id: string;
  name?: string;
  games: string[];
  leagues: string[];
  teams: string[];
  timezone: string;
  reminderMinutes: number;
  includeKeywords: string[];
  excludeKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

// 订阅创建请求
export interface CreateSubscriptionInput {
  name?: string;
  games?: string[];
  leagues?: string[];
  teams?: string[];
  timezone?: string;
  reminderMinutes?: number;
  includeKeywords?: string[];
  excludeKeywords?: string[];
  naturalLanguageQuery?: string;
}

// 同步日志
export interface SyncLog {
  id: string;
  source: string;
  status: "success" | "failed" | "partial";
  count: number;
  error?: string;
  createdAt: string;
}

// LoL Esports 原始事件
export interface LoLEvent {
  id: string;
  type: string;
  state: string;
  league?: {
    name: string;
    slug: string;
  };
  match?: {
    id: string;
    teams: Array<{ name: string; code: string; slug?: string }>;
    strategy?: {
      type: string;
      count: number;
    };
    games?: Array<{ id: string; state: string }>;
  };
  startTime: string;
  blockName?: string;
  tournament?: { name: string; slug: string };
  streamChannel?: string;
}

// LoL Esports API 响应
export interface LoLEsportsSchedule {
  data: {
    schedule: {
      events: LoLEvent[];
    };
  };
}

// VLR match 原始数据
export interface VLRMatch {
  id: string;
  teamA: string;
  teamB: string;
  startTime: string;
  tournament: string;
  stage?: string;
  format?: string;
  status: string;
  eta?: string;
}
