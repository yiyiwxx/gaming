"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { KNOWN_GAMES, KNOWN_LEAGUES } from "@/lib/matches/mockData";

export default function SubscribePage() {
  const router = useRouter();

  const [naturalLanguage, setNaturalLanguage] = useState("");
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>([]);
  const [teamsInput, setTeamsInput] = useState("");
  const [reminderMinutes, setReminderMinutes] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleGame = (gameId: string) => {
    setSelectedGames((prev) =>
      prev.includes(gameId) ? prev.filter((g) => g !== gameId) : [...prev, gameId]
    );
  };

  const toggleLeague = (leagueId: string) => {
    setSelectedLeagues((prev) =>
      prev.includes(leagueId) ? prev.filter((l) => l !== leagueId) : [...prev, leagueId]
    );
  };

  const filteredLeagues = KNOWN_LEAGUES.filter(
    (l) => selectedGames.length === 0 || selectedGames.includes(l.game)
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const teams = teamsInput
        .split(/[,，、\s]+/)
        .map((t) => t.trim())
        .filter(Boolean);

      const body: Record<string, unknown> = {
        games: selectedGames,
        leagues: selectedLeagues,
        teams,
        reminderMinutes,
        timezone: "Asia/Shanghai",
      };

      if (naturalLanguage.trim()) {
        body.naturalLanguageQuery = naturalLanguage.trim();
      }

      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "创建订阅失败");
      }

      const data = await res.json();
      router.push(`/calendar/${data.subscription.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">创建日历订阅</h1>
      <p className="text-gray-400 mb-8">选择你关注的赛事，生成 ICS 日历订阅链接。</p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 自然语言输入 */}
        <div className="card">
          <label className="block text-sm font-semibold mb-2">
            AI 自然语言输入 <span className="text-gray-500 font-normal">（可选）</span>
          </label>
          <textarea
            value={naturalLanguage}
            onChange={(e) => setNaturalLanguage(e.target.value)}
            placeholder="例如：我只想看 BLG、TES、T1 和 VCT CN 的比赛，提前一天提醒我。"
            className="input-field min-h-[80px] resize-y"
            rows={3}
          />
          <p className="text-xs text-gray-500 mt-1">
            描述你想看的比赛，AI 会自动解析你的偏好。
          </p>
        </div>

        {/* 游戏选择 */}
        <div className="card">
          <label className="block text-sm font-semibold mb-3">游戏</label>
          <div className="flex flex-wrap gap-2">
            {KNOWN_GAMES.map((game) => (
              <button
                key={game.id}
                type="button"
                onClick={() => toggleGame(game.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedGames.includes(game.id)
                    ? "bg-primary-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {game.name}
              </button>
            ))}
          </div>
        </div>

        {/* 赛事选择 */}
        <div className="card">
          <label className="block text-sm font-semibold mb-3">赛事</label>
          <div className="flex flex-wrap gap-2">
            {filteredLeagues.map((league) => (
              <button
                key={league.id}
                type="button"
                onClick={() => toggleLeague(league.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedLeagues.includes(league.id)
                    ? "bg-primary-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {league.id}
              </button>
            ))}
          </div>
        </div>

        {/* 战队输入 */}
        <div className="card">
          <label className="block text-sm font-semibold mb-2">战队</label>
          <input
            type="text"
            value={teamsInput}
            onChange={(e) => setTeamsInput(e.target.value)}
            placeholder="例如：BLG, TES, T1, GEN（用逗号或空格分隔）"
            className="input-field"
          />
          <p className="text-xs text-gray-500 mt-1">
            支持简称和全称，如 BLG / Bilibili Gaming
          </p>
        </div>

        {/* 提醒时间 */}
        <div className="card">
          <label className="block text-sm font-semibold mb-3">提醒时间</label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 15, label: "赛前15分钟" },
              { value: 30, label: "赛前30分钟" },
              { value: 60, label: "赛前1小时" },
              { value: 1440, label: "赛前1天" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setReminderMinutes(opt.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  reminderMinutes === opt.value
                    ? "bg-primary-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full text-lg">
          {loading ? "生成中..." : "生成订阅链接"}
        </button>
      </form>
    </div>
  );
}
