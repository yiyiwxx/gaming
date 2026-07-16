"use client";

import { Bot, CalendarPlus, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { withBasePath } from "@/lib/http/origin";

const gameOptions = [
  { value: "lol", label: "英雄联盟" },
  { value: "valorant", label: "无畏契约" },
];

const leagueOptions = [
  "LPL",
  "LCK",
  "MSI",
  "Worlds",
  "VCT CN",
  "VCT Pacific",
  "VCT Masters",
  "Valorant Champions",
];

export function SubscribeForm() {
  const router = useRouter();
  const [games, setGames] = useState(["lol"]);
  const [leagues, setLeagues] = useState(["LPL"]);
  const [teams, setTeams] = useState("BLG, TES, EDG");
  const [timezone, setTimezone] = useState("Asia/Shanghai");
  const [reminderMinutes, setReminderMinutes] = useState("60");
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState(
    "我只想看 BLG、TES、T1 和 VCT CN 的比赛，提前一天提醒我。",
  );
  const [mode, setMode] = useState<"manual" | "ai">("manual");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedTeams = useMemo(
    () =>
      teams
        .split(/[,，、\s]+/)
        .map((team) => team.trim())
        .filter(Boolean),
    [teams],
  );

  function toggleValue(value: string, values: string[], setValues: (next: string[]) => void) {
    setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const payload =
      mode === "ai"
        ? { name: "AI 生成的电竞订阅", naturalLanguageQuery }
        : {
            name: "我的电竞赛事订阅",
            games,
            leagues,
            teams: selectedTeams,
            timezone,
            reminderMinutes: Number(reminderMinutes),
            includeKeywords: [],
            excludeKeywords: [],
          };

    const response = await fetch(withBasePath("/api/subscriptions"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setError("生成失败，请先确认数据库已迁移并同步 mock 数据。");
      setIsSubmitting(false);
      return;
    }

    const data = (await response.json()) as { subscription: { id: string } };
    router.push(withBasePath(`/calendar/${data.subscription.id}`));
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <div className="inline-grid grid-cols-2 rounded-md bg-[#0e1714] p-1 text-sm text-[#d8f6e8]">
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`rounded px-3 py-2 font-medium transition ${mode === "manual" ? "bg-[#f5ff5c] text-[#11140f]" : "hover:bg-white/8"}`}
        >
          手动配置
        </button>
        <button
          type="button"
          onClick={() => setMode("ai")}
          className={`rounded px-3 py-2 font-medium transition ${mode === "ai" ? "bg-[#f5ff5c] text-[#11140f]" : "hover:bg-white/8"}`}
        >
          AI 解析
        </button>
      </div>

      {mode === "manual" ? (
        <div className="grid gap-5">
          <fieldset className="grid gap-3">
            <legend className="text-sm font-semibold text-[#d8f6e8]">游戏选择</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {gameOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white"
                >
                  <span>{option.label}</span>
                  <input
                    type="checkbox"
                    checked={games.includes(option.value)}
                    onChange={() => toggleValue(option.value, games, setGames)}
                    className="h-4 w-4 accent-[#f5ff5c]"
                  />
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-3">
            <legend className="text-sm font-semibold text-[#d8f6e8]">赛事选择</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {leagueOptions.map((league) => (
                <label
                  key={league}
                  className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
                >
                  <span>{league}</span>
                  <input
                    type="checkbox"
                    checked={leagues.includes(league)}
                    onChange={() => toggleValue(league, leagues, setLeagues)}
                    className="h-4 w-4 accent-[#f5ff5c]"
                  />
                </label>
              ))}
            </div>
          </fieldset>

          <label className="grid gap-2 text-sm font-semibold text-[#d8f6e8]">
            战队
            <input
              value={teams}
              onChange={(event) => setTeams(event.target.value)}
              placeholder="BLG, TES, EDG, T1, GEN, DRX, PRX"
              className="h-12 rounded-md border border-white/10 bg-[#07100d] px-4 text-base font-normal text-white outline-none ring-[#f5ff5c]/50 transition placeholder:text-white/35 focus:ring-2"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-[#d8f6e8]">
              时区
              <select
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                className="h-12 rounded-md border border-white/10 bg-[#07100d] px-4 text-base font-normal text-white outline-none ring-[#f5ff5c]/50 focus:ring-2"
              >
                <option value="Asia/Shanghai">Asia/Shanghai</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[#d8f6e8]">
              提醒时间
              <select
                value={reminderMinutes}
                onChange={(event) => setReminderMinutes(event.target.value)}
                className="h-12 rounded-md border border-white/10 bg-[#07100d] px-4 text-base font-normal text-white outline-none ring-[#f5ff5c]/50 focus:ring-2"
              >
                <option value="60">赛前 60 分钟</option>
                <option value="1440">赛前 1 天</option>
              </select>
            </label>
          </div>
        </div>
      ) : (
        <label className="grid gap-2 text-sm font-semibold text-[#d8f6e8]">
          自然语言订阅规则
          <textarea
            value={naturalLanguageQuery}
            onChange={(event) => setNaturalLanguageQuery(event.target.value)}
            rows={6}
            className="resize-none rounded-md border border-white/10 bg-[#07100d] p-4 text-base font-normal leading-7 text-white outline-none ring-[#f5ff5c]/50 transition placeholder:text-white/35 focus:ring-2"
          />
        </label>
      )}

      {error ? <p className="rounded-md bg-red-500/12 px-4 py-3 text-sm text-red-100">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#f5ff5c] px-5 font-semibold text-[#11140f] shadow-[0_12px_30px_rgba(245,255,92,0.24)] transition hover:bg-[#ecff2e] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "ai" ? <Bot className="h-4 w-4" /> : <CalendarPlus className="h-4 w-4" />}
        生成订阅链接
      </button>

      <div className="flex items-start gap-3 rounded-md border border-[#f5ff5c]/25 bg-[#f5ff5c]/8 p-4 text-sm leading-6 text-[#e8f7ee]">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#f5ff5c]" />
        <p>自然语言模式会优先调用 OpenAI；没有密钥时使用本地规则兜底，仍可完整演示订阅流程。</p>
      </div>
    </form>
  );
}
