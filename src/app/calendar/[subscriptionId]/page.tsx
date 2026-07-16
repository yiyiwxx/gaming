"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";

interface SubscriptionInfo {
  games: string[];
  leagues: string[];
  teams: string[];
  reminderMinutes: number;
}

export default function CalendarResultPage() {
  const params = useParams();
  const rawId = (params?.subscriptionId as string) || "";

  const [copied, setCopied] = useState(false);

  // 从 URL 中解码订阅参数
  const subscription = useMemo<SubscriptionInfo>(() => {
    try {
      // base64url → base64
      const base64 = rawId.replace(/-/g, "+").replace(/_/g, "/");
      const json = atob(base64);
      const obj = JSON.parse(json);
      return {
        games: obj.g || [],
        leagues: obj.l || [],
        teams: obj.t || [],
        reminderMinutes: obj.r ?? 60,
      };
    } catch {
      return { games: [], leagues: [], teams: [], reminderMinutes: 60 };
    }
  }, [rawId]);

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  // 生成完整的 ICS 链接
  const calendarUrl = appUrl
    ? `${appUrl}${basePath}/api/calendar/${rawId}.ics`
    : `${basePath}/api/calendar/${rawId}.ics`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(calendarUrl);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = calendarUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reminderLabel =
    subscription.reminderMinutes >= 1440
      ? `赛前 ${subscription.reminderMinutes / 1440} 天`
      : subscription.reminderMinutes >= 60
        ? `赛前 ${subscription.reminderMinutes / 60} 小时`
        : `赛前 ${subscription.reminderMinutes} 分钟`;

  const isEmpty =
    subscription.games.length === 0 &&
    subscription.leagues.length === 0 &&
    subscription.teams.length === 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">订阅已生成</h1>
      <p className="text-gray-400 mb-8">复制以下 ICS 链接到你的手机日历即可订阅。</p>

      {/* 订阅规则 */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-3">订阅规则</h2>
        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="text-gray-500">提醒：</span>
            <span>{reminderLabel}</span>
          </div>
          {subscription.games.length > 0 && (
            <div className="flex gap-2">
              <span className="text-gray-500">游戏：</span>
              <span>
                {subscription.games
                  .map((g) => ({ lol: "英雄联盟", valorant: "无畏契约", hok: "王者荣耀" }[g] || g))
                  .join(", ")}
              </span>
            </div>
          )}
          {subscription.leagues.length > 0 && (
            <div className="flex gap-2">
              <span className="text-gray-500">赛事：</span>
              <span>{subscription.leagues.join(", ")}</span>
            </div>
          )}
          {subscription.teams.length > 0 && (
            <div className="flex gap-2">
              <span className="text-gray-500">战队：</span>
              <span>{subscription.teams.join(", ")}</span>
            </div>
          )}
          {isEmpty && (
            <div className="text-gray-500">未设置筛选条件，显示全部比赛。</div>
          )}
        </div>
      </div>

      {/* ICS 链接 */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-3">ICS 日历链接</h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={calendarUrl}
            className="input-field text-sm flex-1"
          />
          <button
            onClick={handleCopy}
            className="btn-primary text-sm py-2 px-4 whitespace-nowrap"
          >
            {copied ? "已复制" : "复制链接"}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          将链接粘贴到手机日历的「添加订阅日历」中即可。
        </p>
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-4">
        <a
          href={calendarUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary inline-block"
        >
          打开 ICS 文件
        </a>
        <a href="/subscribe" className="btn-secondary inline-block">
          创建新订阅
        </a>
        <a href="/matches" className="btn-secondary inline-block">
          预览赛程
        </a>
      </div>

      {/* 订阅说明 */}
      <div className="card mt-8">
        <h2 className="text-lg font-semibold mb-3">如何订阅到手机</h2>
        <div className="space-y-3 text-sm text-gray-400">
          <div>
            <strong className="text-white">iPhone（iOS 日历）：</strong>
            <br />
            设置 → 日历 → 账户 → 添加账户 → 其他 → 添加订阅日历 → 粘贴链接
          </div>
          <div>
            <strong className="text-white">小米 / 华为 / OPPO / vivo（Android）：</strong>
            <br />
            日历 App → 设置 → 添加订阅日历 → 粘贴链接
          </div>
        </div>
      </div>
    </div>
  );
}
