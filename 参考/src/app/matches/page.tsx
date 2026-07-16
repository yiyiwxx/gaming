import { CalendarClock, Search } from "lucide-react";
import Link from "next/link";

import { listMatches } from "@/lib/matches/repository";
import { matchesQuerySchema, type Match } from "@/lib/matches/schema";

export const dynamic = "force-dynamic";

type MatchesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function MatchRow({ match }: { match: Match }) {
  return (
    <article className="grid gap-3 rounded-md border border-white/10 bg-white/[0.04] p-4 sm:grid-cols-[150px_1fr_auto] sm:items-center">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#f5ff5c]">{match.game}</p>
        <p className="mt-1 text-sm text-[#a7c7b6]">{formatTime(match.startTime)} CST</p>
      </div>
      <div>
        <p className="text-sm text-[#a7c7b6]">{match.league} / {match.stage ?? match.tournament}</p>
        <h2 className="mt-1 text-xl font-black text-white">{match.teamA} vs {match.teamB}</h2>
        <p className="mt-2 text-sm leading-6 text-[#d8f6e8]">{match.summary ?? "暂无摘要"}</p>
      </div>
      <div className="flex items-center gap-2 text-sm text-[#e8f7ee]">
        <span className="rounded bg-[#f5ff5c] px-2 py-1 font-bold text-[#11140f]">{match.format ?? "TBD"}</span>
        <span className="rounded border border-white/12 px-2 py-1">{match.status}</span>
      </div>
    </article>
  );
}

export default async function MatchesPage({ searchParams }: MatchesPageProps) {
  const params = await searchParams;
  const query = matchesQuerySchema.parse({
    game: param(params.game) || undefined,
    league: param(params.league) || undefined,
    team: param(params.team) || undefined,
    from: param(params.from) || undefined,
    to: param(params.to) || undefined,
  });

  let matches: Match[] = [];
  let error = "";
  try {
    matches = await listMatches(query);
  } catch {
    error = "数据库尚未准备好，请先运行迁移和 mock 同步。";
  }

  return (
    <main className="min-h-screen bg-[#07100d] px-5 py-6 text-white sm:px-8">
      <div className="mx-auto grid max-w-6xl gap-8">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-[#a7c7b6] transition hover:text-white">
            Esports Calendar
          </Link>
          <Link
            href="/subscribe"
            className="inline-flex h-10 items-center rounded-md bg-[#f5ff5c] px-4 text-sm font-semibold text-[#11140f]"
          >
            生成订阅
          </Link>
        </nav>

        <section className="grid gap-4">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#f5ff5c]">Match Preview</p>
          <h1 className="text-4xl font-black text-white sm:text-5xl">赛程预览</h1>
          <p className="max-w-2xl text-base leading-7 text-[#a7c7b6]">
            查看当前数据库中的比赛列表，支持按游戏、赛事和战队筛选。
          </p>
        </section>

        <form className="grid gap-3 rounded-md border border-white/10 bg-[#0b1512] p-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <select name="game" defaultValue={query.game ?? ""} className="h-11 rounded-md border border-white/10 bg-[#07100d] px-3 text-sm text-white">
            <option value="">全部游戏</option>
            <option value="lol">英雄联盟</option>
            <option value="valorant">无畏契约</option>
          </select>
          <input name="league" defaultValue={query.league ?? ""} placeholder="赛事：LPL / VCT CN" className="h-11 rounded-md border border-white/10 bg-[#07100d] px-3 text-sm text-white placeholder:text-white/35" />
          <input name="team" defaultValue={query.team ?? ""} placeholder="战队：BLG / T1 / PRX" className="h-11 rounded-md border border-white/10 bg-[#07100d] px-3 text-sm text-white placeholder:text-white/35" />
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#f5ff5c] px-4 text-sm font-semibold text-[#11140f]">
            <Search className="h-4 w-4" />
            筛选
          </button>
        </form>

        {error ? (
          <div className="rounded-md border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>
        ) : matches.length === 0 ? (
          <div className="grid place-items-center gap-3 rounded-md border border-white/10 bg-white/[0.04] p-10 text-center">
            <CalendarClock className="h-8 w-8 text-[#f5ff5c]" />
            <p className="text-[#d8f6e8]">暂无匹配赛程。</p>
          </div>
        ) : (
          <section className="grid gap-3">
            {matches.map((match) => (
              <MatchRow key={match.id} match={match} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
