import { CalendarDays, DatabaseZap, RadioTower, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const featureItems = [
  {
    icon: DatabaseZap,
    title: "聚合赛程",
    body: "LoL 与 VALORANT 统一 Match Schema，MVP 用 mock 数据跑通。",
  },
  {
    icon: Sparkles,
    title: "AI 订阅规则",
    body: "一句话解析战队、赛事、时区和提醒时间，无密钥也有规则兜底。",
  },
  {
    icon: CalendarDays,
    title: "稳定 ICS",
    body: "每场比赛生成 UTC VEVENT，可添加到 Apple、Google、Outlook。",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07100d] text-white">
      <section className="relative min-h-screen px-5 py-6 sm:px-8">
        <div className="arena-grid absolute inset-0 opacity-70" />
        <div className="absolute inset-x-0 top-0 h-56 bg-[linear-gradient(180deg,rgba(245,255,92,0.14),transparent)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10">
          <nav className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-[#f5ff5c] font-black text-[#11140f]">
                EC
              </span>
              <span className="text-sm font-semibold text-[#d8f6e8]">Esports Calendar</span>
            </Link>
            <div className="flex items-center gap-3 text-sm">
              <Link href="/matches" className="hidden text-[#a7c7b6] transition hover:text-white sm:inline">
                赛程预览
              </Link>
              <Link
                href="/subscribe"
                className="inline-flex h-10 items-center rounded-md bg-[#f5ff5c] px-4 font-semibold text-[#11140f] transition hover:bg-[#ecff2e]"
              >
                开始订阅
              </Link>
            </div>
          </nav>

          <div className="grid items-center gap-10 pt-8 lg:grid-cols-[1fr_0.82fr] lg:pt-16">
            <div className="grid gap-8">
              <div className="grid gap-5">
                <p className="font-mono text-xs uppercase tracking-[0.32em] text-[#f5ff5c]">
                  LoL / VALORANT / ICS
                </p>
                <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-normal text-white sm:text-7xl">
                  电竞赛事 AI 日历订阅助手
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-[#b7d8c6]">
                  把英雄联盟和无畏契约比赛同步到手机日历。选择游戏、赛事、战队，或用一句自然语言生成专属 iCalendar 订阅链接。
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/subscribe"
                  className="inline-flex h-12 items-center justify-center rounded-md bg-[#f5ff5c] px-5 font-semibold text-[#11140f] shadow-[0_16px_40px_rgba(245,255,92,0.2)] transition hover:bg-[#ecff2e]"
                >
                  生成订阅链接
                </Link>
                <Link
                  href="/matches"
                  className="inline-flex h-12 items-center justify-center rounded-md border border-white/12 px-5 font-semibold text-[#e8f7ee] transition hover:border-[#f5ff5c]/60 hover:text-white"
                >
                  查看赛程预览
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {featureItems.map((item) => (
                  <article key={item.title} className="rounded-md border border-white/10 bg-white/[0.04] p-4">
                    <item.icon className="h-5 w-5 text-[#f5ff5c]" />
                    <h2 className="mt-3 text-sm font-bold text-white">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[#a7c7b6]">{item.body}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="relative min-h-[420px] overflow-hidden rounded-md border border-white/10 bg-[#0b1512] shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
              <Image
                src="/arena-calendar.svg"
                alt="电竞日历控制台视觉资产"
                fill
                priority
                className="object-cover"
              />
              <div className="absolute inset-x-5 bottom-5 grid gap-3 rounded-md border border-white/12 bg-[#07100d]/86 p-4 backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-[0.24em] text-[#f5ff5c]">Next Match</span>
                  <RadioTower className="h-4 w-4 text-[#f5ff5c]" />
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="rounded-md bg-white/[0.06] p-3 text-center">
                    <p className="text-xl font-black">BLG</p>
                    <p className="text-xs text-[#a7c7b6]">LoL</p>
                  </div>
                  <span className="font-mono text-xs text-[#f5ff5c]">VS</span>
                  <div className="rounded-md bg-white/[0.06] p-3 text-center">
                    <p className="text-xl font-black">TES</p>
                    <p className="text-xs text-[#a7c7b6]">LPL</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
