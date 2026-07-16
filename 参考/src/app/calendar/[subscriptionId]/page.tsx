import { ArrowLeft, CalendarCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { networkInterfaces } from "node:os";

import { CopyButton } from "@/app/components/CopyButton";
import { buildAppUrl } from "@/lib/http/origin";
import { getSubscription } from "@/lib/subscriptions/repository";

export const dynamic = "force-dynamic";

type CalendarPageProps = {
  params: Promise<{ subscriptionId: string }>;
};

function formatList(values: string[]) {
  return values.length > 0 ? values.join("、") : "全部";
}

async function getRequestOrigin() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol =
    headerList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return `${protocol}://${host}`;
}

function getLanOrigin(port: string) {
  const interfaces = networkInterfaces();

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) {
        return `http://${entry.address}:${port}`;
      }
    }
  }

  return null;
}

export default async function CalendarPage({ params }: CalendarPageProps) {
  const { subscriptionId } = await params;
  const subscription = await getSubscription(subscriptionId);

  if (!subscription) {
    notFound();
  }

  const appOrigin = await getRequestOrigin();
  const calendarUrl = buildAppUrl(appOrigin, `/api/calendar/${subscription.id}.ics`);
  const currentHost = new URL(appOrigin).host;
  const currentPort = currentHost.split(":")[1] ?? "3000";
  const lanOrigin =
    currentHost.startsWith("localhost") || currentHost.startsWith("127.0.0.1")
      ? getLanOrigin(currentPort)
      : null;
  const lanCalendarUrl = lanOrigin ? buildAppUrl(lanOrigin, `/api/calendar/${subscription.id}.ics`) : null;

  return (
    <main className="min-h-screen bg-[#07100d] px-5 py-6 text-white sm:px-8">
      <div className="mx-auto grid max-w-5xl gap-8">
        <Link href="/subscribe" className="inline-flex w-fit items-center gap-2 text-sm text-[#a7c7b6] transition hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          继续配置
        </Link>

        <section className="grid gap-5 rounded-md border border-white/10 bg-[#0b1512] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)] sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="grid gap-3">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#f5ff5c]">Calendar Feed</p>
              <h1 className="text-4xl font-black leading-tight text-white">{subscription.name}</h1>
              <p className="max-w-2xl text-sm leading-6 text-[#a7c7b6]">
                复制下方 ICS 链接并添加到你的日历客户端，后续赛程更新会通过同一链接同步。
              </p>
            </div>
            <CalendarCheck className="h-10 w-10 text-[#f5ff5c]" />
          </div>

          <div className="grid gap-3 rounded-md border border-white/10 bg-[#07100d] p-4">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a7c7b6]">ICS Link</span>
            <code className="break-all rounded bg-black/30 p-3 text-sm leading-6 text-[#f5ff5c]">{calendarUrl}</code>
            <div className="flex flex-col gap-3 sm:flex-row">
              <CopyButton value={calendarUrl} />
              <a
                href={calendarUrl}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/12 px-4 text-sm font-semibold text-[#e8f7ee] transition hover:border-[#f5ff5c]/60"
              >
                <ExternalLink className="h-4 w-4" />
                打开 ICS
              </a>
            </div>
          </div>

          {lanCalendarUrl ? (
            <div className="grid gap-3 rounded-md border border-[#f5ff5c]/25 bg-[#f5ff5c]/8 p-4">
              <p className="text-sm font-semibold text-[#f5ff5c]">小米日历本地调试提示</p>
              <p className="text-sm leading-6 text-[#e8f7ee]">
                手机日历不能订阅电脑上的 localhost。手机和电脑在同一 Wi-Fi 时，可以先试这个局域网链接；如果仍失败，请部署到 Vercel 或用 ngrok / Cloudflare Tunnel 提供 HTTPS 公网链接。
              </p>
              <code className="break-all rounded bg-black/30 p-3 text-sm leading-6 text-[#f5ff5c]">{lanCalendarUrl}</code>
              <CopyButton value={lanCalendarUrl} />
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a7c7b6]">规则</p>
              <dl className="mt-3 grid gap-2 text-sm text-[#e8f7ee]">
                <div className="flex justify-between gap-4"><dt>游戏</dt><dd>{formatList(subscription.games)}</dd></div>
                <div className="flex justify-between gap-4"><dt>赛事</dt><dd>{formatList(subscription.leagues)}</dd></div>
                <div className="flex justify-between gap-4"><dt>战队</dt><dd>{formatList(subscription.teams)}</dd></div>
                <div className="flex justify-between gap-4"><dt>时区</dt><dd>{subscription.timezone}</dd></div>
                <div className="flex justify-between gap-4"><dt>提醒</dt><dd>{subscription.reminderMinutes} 分钟</dd></div>
              </dl>
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a7c7b6]">添加方式</p>
              <ol className="mt-3 grid gap-2 text-sm leading-6 text-[#e8f7ee]">
                <li>1. Apple 日历：文件菜单选择“新建日历订阅”，粘贴链接。</li>
                <li>2. Google Calendar：其他日历中选择“通过网址添加”。</li>
                <li>3. Outlook：添加日历时选择“从 Internet 订阅”。</li>
              </ol>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
