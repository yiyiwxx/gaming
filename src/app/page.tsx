import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      {/* Hero */}
      <section className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
          电竞赛事 AI 日历订阅助手
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
          选择你关注的游戏、赛事和战队，一键生成 ICS 日历订阅链接，
          自动同步到 iPhone、小米、华为、OPPO、vivo 等手机日历中，
          赛前准时收到提醒。
        </p>
        <Link href="/subscribe" className="btn-primary inline-block text-lg px-8 py-4">
          立即创建订阅
        </Link>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-6 mb-16">
        <div className="card text-center">
          <div className="text-3xl mb-3">AI 智能解析</div>
          <h3 className="text-lg font-semibold mb-2">自然语言输入</h3>
          <p className="text-gray-400 text-sm">
            直接说「只看 BLG 和 VCT CN，提前一天提醒」，AI 自动解析你的订阅需求。
          </p>
        </div>
        <div className="card text-center">
          <div className="text-3xl mb-3">多平台支持</div>
          <h3 className="text-lg font-semibold mb-2">实时赛程数据</h3>
          <p className="text-gray-400 text-sm">
            聚合英雄联盟、无畏契约和王者荣耀赛程，支持 LPL、LCK、KPL、VCT CN 等主流赛事。
          </p>
        </div>
        <div className="card text-center">
          <div className="text-3xl mb-3">系统日历集成</div>
          <h3 className="text-lg font-semibold mb-2">ICS 标准日历</h3>
          <p className="text-gray-400 text-sm">
            生成标准 ICS 订阅链接，支持 iOS、Android 全平台，赛前自动推送提醒。
          </p>
        </div>
      </section>

      {/* Supported */}
      <section className="card mb-8">
        <h2 className="text-xl font-bold mb-4">支持的游戏与赛事</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-semibold text-primary-400 mb-2">英雄联盟</h3>
            <p className="text-gray-400 text-sm">
              LPL / LCK / LEC / LCS / MSI / Worlds 等全部赛区
            </p>
            <p className="text-gray-500 text-xs mt-1">
              数据来源：LoL Esports 官方
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-accent-400 mb-2">无畏契约</h3>
            <p className="text-gray-400 text-sm">
              VCT CN / VCT Pacific / VCT Americas / VCT EMEA / Masters / Champions
            </p>
            <p className="text-gray-500 text-xs mt-1">
              数据来源：VLR.gg
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-yellow-400 mb-2">王者荣耀</h3>
            <p className="text-gray-400 text-sm">
              KPL 春季赛 / KPL 夏季赛 / 挑战者杯
            </p>
            <p className="text-gray-500 text-xs mt-1">
              数据来源：KPL 官方
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">使用步骤</h2>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { step: "1", title: "选择偏好", desc: "选择游戏、赛事和战队" },
            { step: "2", title: "设置提醒", desc: "设置提前多久提醒你" },
            { step: "3", title: "生成链接", desc: "一键生成 ICS 订阅链接" },
            { step: "4", title: "订阅日历", desc: "复制链接到手机日历" },
          ].map((item) => (
            <div key={item.step} className="card text-center">
              <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                {item.step}
              </div>
              <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
              <p className="text-gray-400 text-xs">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
