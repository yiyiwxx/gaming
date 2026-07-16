"use client";

import { useEffect, useState, useCallback } from "react";
import { KNOWN_GAMES, KNOWN_LEAGUES } from "@/lib/matches/mockData";

interface Match {
  id: string;
  game: string;
  gameName: string;
  league: string;
  tournament: string;
  stage?: string;
  teamA: string;
  teamB: string;
  startTime: string;
  endTime?: string;
  format?: string;
  status: string;
  source: string;
  sourceUrl?: string;
  streamUrl?: string;
  summary?: string;
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: "未开始",
  live: "直播中",
  finished: "已结束",
  postponed: "延期",
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-900/50 text-blue-400",
  live: "bg-red-900/50 text-red-400",
  finished: "bg-gray-800 text-gray-500",
  postponed: "bg-yellow-900/50 text-yellow-400",
};

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameFilter, setGameFilter] = useState("");
  const [leagueFilter, setLeagueFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (gameFilter) params.set("game", gameFilter);
      if (leagueFilter) params.set("league", leagueFilter);
      if (showHistory && statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/matches?${params.toString()}`);
      const data = await res.json();
      setMatches(data.matches || []);
    } catch (err) {
      console.error("Failed to fetch matches:", err);
    } finally {
      setLoading(false);
    }
  }, [gameFilter, leagueFilter, statusFilter, showHistory]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Get today start in Asia/Shanghai (use sv-SE locale for ISO yyyy-MM-dd format)
  const todayStart = new Date(
    new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" }) + "T00:00:00+08:00"
  );

  // Default: only scheduled + live from today onwards
  let displayMatches = matches.filter((m) => {
    if (!showHistory) {
      if (m.status !== "scheduled" && m.status !== "live") return false;
      return new Date(m.startTime) >= todayStart;
    }
    return true;
  });

  // Team filter (client-side)
  if (teamFilter) {
    displayMatches = displayMatches.filter(
      (m) =>
        m.teamA.toLowerCase().includes(teamFilter.toLowerCase()) ||
        m.teamB.toLowerCase().includes(teamFilter.toLowerCase())
    );
  }

  // Sort: live first, then scheduled, then finished; within each group: ASC by startTime
  displayMatches = [...displayMatches].sort((a, b) => {
    const statusOrder: Record<string, number> = { live: 0, scheduled: 1, finished: 2, postponed: 3 };
    const aStatus = getDisplayStatus(a);
    const bStatus = getDisplayStatus(b);
    const orderDiff = (statusOrder[aStatus] ?? 9) - (statusOrder[bStatus] ?? 9);
    if (orderDiff !== 0) return orderDiff;
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  /** Infer display status from startTime when DB status is stale */
  function getDisplayStatus(match: Match): string {
    if (match.status === "finished" || match.status === "postponed") return match.status;
    const now = Date.now();
    const start = new Date(match.startTime).getTime();
    // Match hasn't started yet
    if (now < start) return "scheduled";
    // Assume BO5/BO7 lasts ~3 hours; within that window = live, past = finished
    const matchEnd = start + 3 * 60 * 60 * 1000;
    if (now < matchEnd) return "live";
    return "finished";
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Shanghai",
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">赛程预览</h1>
      <p className="text-gray-400 mb-8">查看当前所有赛程数据。</p>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">游戏</label>
            <select
              value={gameFilter}
              onChange={(e) => setGameFilter(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">全部</option>
              {KNOWN_GAMES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">赛事</label>
            <select
              value={leagueFilter}
              onChange={(e) => setLeagueFilter(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">全部</option>
              {KNOWN_LEAGUES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">战队搜索</label>
            <input
              type="text"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              placeholder="BLG, T1..."
              className="input-field text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">范围</label>
            <button
              onClick={() => {
                setShowHistory(!showHistory);
                if (!showHistory) setStatusFilter("");
              }}
              className={`w-full text-sm px-3 py-2 rounded border transition-colors ${
                showHistory
                  ? "bg-gray-800 border-gray-600 text-gray-300"
                  : "bg-primary-900/30 border-primary-600 text-primary-400"
              }`}
            >
              {showHistory ? "全部赛程" : "仅今天起"}
            </button>
          </div>
        </div>

        {showHistory && (
          <div className="mt-3 pt-3 border-t border-gray-800 flex items-center gap-3">
            <label className="text-xs text-gray-500">状态筛选</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field text-sm w-auto"
            >
              <option value="">全部</option>
              <option value="scheduled">未开始</option>
              <option value="live">直播中</option>
              <option value="finished">已结束</option>
            </select>
          </div>
        )}
      </div>

      {/* Match list */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">加载中...</div>
      ) : displayMatches.length === 0 ? (
        <div className="card text-center text-gray-400 py-12">
          {showHistory
            ? "暂无赛程数据，请先运行 'npm run sync:schedules' 同步赛程。"
            : "今天没有更多赛程了，点击「全部赛程」查看历史记录。"}
        </div>
      ) : (
        <div className="space-y-3">
          {displayMatches.map((match) => (
            <div
              key={match.id}
              className="card hover:border-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-800 px-2 py-0.5 rounded">
                    {match.gameName}
                  </span>
                  <span className="text-xs text-gray-500">{match.league}</span>
                  {match.stage && (
                    <span className="text-xs text-gray-600">| {match.stage}</span>
                  )}
                  {match.format && (
                    <span className="text-xs text-gray-600">{match.format}</span>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[getDisplayStatus(match)] || ""}`}
                >
                  {STATUS_LABELS[getDisplayStatus(match)] || getDisplayStatus(match)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold">{match.teamA}</span>
                  <span className="text-gray-600 text-sm">vs</span>
                  <span className="text-lg font-bold">{match.teamB}</span>
                </div>
                <span className="text-sm text-gray-400">
                  {formatTime(match.startTime)}
                </span>
              </div>

              {match.summary && (
                <p className="text-sm text-gray-500 mt-2">{match.summary}</p>
              )}

              <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                {match.sourceUrl && (
                  <a
                    href={match.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary-400 transition-colors"
                  >
                    详情
                  </a>
                )}
                {match.streamUrl && (
                  <a
                    href={match.streamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary-400 transition-colors"
                  >
                    直播
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
