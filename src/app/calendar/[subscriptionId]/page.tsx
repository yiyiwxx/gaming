"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface SubscriptionInfo {
  id: string;
  name?: string;
  games: string[];
  leagues: string[];
  teams: string[];
  reminderMinutes: number;
  timezone: string;
}

export default function CalendarResultPage() {
  const params = useParams();
  const subscriptionId = params?.subscriptionId as string;

  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const calendarUrl = `${appUrl}${basePath}/api/calendar/${subscriptionId}.ics`;

  useEffect(() => {
    if (!subscriptionId) return;

    fetch(`/api/subscriptions?id=${subscriptionId}`)
      .then((res) => {
        if (!res.ok) throw new Error("订阅不存在");
        return res.json();
      })
      .then((data) => {
        setSubscription(data.subscription || data);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [subscriptionId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(calendarUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textArea = document.createElement("textarea");
      textArea.value = calendarUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center text-gray-400">
        加载中...
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">订阅不存在</h1>
        <p className="text-gray-400 mb-6">{error || "找不到该订阅，可能已被删除。"}</p>
        <a href="/subscribe" className="btn-primary inline-block">
          创建新订阅
        </a>
      </div>
    );
  }

  const reminderLabel =
    subscription.reminderMinutes >= 1440
      ? `赛前 ${subscription.reminderMinutes / 1440} 天`
      : subscription.reminderMinutes >= 60
        ? `赛前 ${subscription.reminderMinutes / 60} 小时`
        : `赛前 ${subscription.reminderMinutes} 分钟`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">订阅已生成</h1>
      <p className="text-gray-400 mb-8">复制以下 ICS 链接到你的手机日历即可订阅。</p>

      {/* 订阅规则 */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-3">订阅规则</h2>
        <div className="space-y-2 text-sm">
          {subscription.name && (
            <div className="flex gap-2">
              <span className="text-gray-500">名称：</span>
              <span>{subscription.name}</span>
            </div>
          )}
          <div className="flex gap-2">
            <span className="text-gray-500">时间：</span>
            <span>{subscription.timezone}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500">提醒：</span>
            <span>{reminderLabel}</span>
          </div>
          {subscription.games.length > 0 && (
            <div className="flex gap-2">
              <span className="text-gray-500">游戏：</span>
              <span>{subscription.games.join(", ")}</span>
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
