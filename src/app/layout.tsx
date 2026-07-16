import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "电竞赛事 AI 日历订阅助手",
  description: "把关注的电竞赛事自动同步到手机日历，支持英雄联盟和无畏契约。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen flex flex-col">
        <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="/" className="text-lg font-bold text-white hover:text-primary-400 transition-colors">
              赛事日历助手
            </a>
            <nav className="flex items-center gap-4 text-sm">
              <a href="/subscribe" className="text-gray-400 hover:text-white transition-colors">
                创建订阅
              </a>
              <a href="/matches" className="text-gray-400 hover:text-white transition-colors">
                赛程预览
              </a>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-gray-800 bg-gray-900/50 py-6 text-center text-sm text-gray-500">
          电竞赛事 AI 日历订阅助手 - 让每一场精彩比赛都不错过
        </footer>
      </body>
    </html>
  );
}
