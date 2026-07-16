import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { SubscribeForm } from "@/app/components/SubscribeForm";

export default function SubscribePage() {
  return (
    <main className="min-h-screen bg-[#07100d] px-5 py-6 text-white sm:px-8">
      <div className="mx-auto grid max-w-5xl gap-8">
        <Link href="/" className="inline-flex w-fit items-center gap-2 text-sm text-[#a7c7b6] transition hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </Link>

        <section className="grid gap-4">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#f5ff5c]">Subscription Console</p>
          <h1 className="max-w-3xl text-4xl font-black leading-tight text-white sm:text-5xl">
            配置你的电竞赛事日历订阅
          </h1>
          <p className="max-w-2xl text-base leading-7 text-[#a7c7b6]">
            选择游戏、赛事和战队，或直接输入一句自然语言，让系统生成可添加到 Apple 日历、Google Calendar、Outlook 的 ICS 链接。
          </p>
        </section>

        <section className="rounded-md border border-white/10 bg-[#0b1512] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)] sm:p-7">
          <SubscribeForm />
        </section>
      </div>
    </main>
  );
}
