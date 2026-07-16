/**
 * URL 自编码订阅 —— 将订阅参数编码到 URL 中，无需数据库存储。
 *
 * 格式: base64url(JSON) → 拼接到 /api/calendar/{encoded}.ics
 */

// 订阅参数的精简格式（用于 URL 编码）
export interface EncodedSubscription {
  n?: string;   // name
  g?: string[]; // games
  l?: string[]; // leagues
  t?: string[]; // teams
  r?: number;   // reminderMinutes
  tz?: string;  // timezone
  ik?: string[]; // includeKeywords
  ek?: string[]; // excludeKeywords
}

/**
 * 将订阅参数编码为 URL-safe 字符串
 */
export function encodeSubscription(params: EncodedSubscription): string {
  // 去掉空数组和默认值，减少 URL 长度
  const cleaned: EncodedSubscription = {};
  if (params.n) cleaned.n = params.n;
  if (params.g?.length) cleaned.g = params.g;
  if (params.l?.length) cleaned.l = params.l;
  if (params.t?.length) cleaned.t = params.t;
  if (params.r && params.r !== 60) cleaned.r = params.r;
  if (params.tz && params.tz !== "Asia/Shanghai") cleaned.tz = params.tz;
  if (params.ik?.length) cleaned.ik = params.ik;
  if (params.ek?.length) cleaned.ek = params.ek;

  const json = JSON.stringify(cleaned);
  // 使用 base64url 编码（Node.js Buffer）
  return Buffer.from(json).toString("base64url");
}

/**
 * 解码 URL-safe 字符串为订阅参数
 */
export function decodeSubscription(encoded: string): EncodedSubscription {
  try {
    const json = Buffer.from(encoded, "base64url").toString();
    return JSON.parse(json);
  } catch {
    return {};
  }
}

/**
 * 将编码后的参数展开为完整订阅对象格式
 */
export function expandSubscription(encoded: EncodedSubscription) {
  return {
    name: encoded.n || `订阅 - ${new Date().toLocaleDateString("zh-CN")}`,
    games: encoded.g || [],
    leagues: encoded.l || [],
    teams: encoded.t || [],
    timezone: encoded.tz || "Asia/Shanghai",
    reminderMinutes: encoded.r ?? 60,
    includeKeywords: encoded.ik || [],
    excludeKeywords: encoded.ek || [],
  };
}
