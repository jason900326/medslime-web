import Link from "next/link";

const mockUser = {
  streak: 3,
  coins: 520,
  tickets: 0,
  slimeName: "Pink",
  slimeType: "粉色史萊姆",
  slimeImage: "/slimes/strawberry.PNG",
};

const tasks = [
  {
    icon: "🧠",
    title: "完成 5 題",
    progress: "5 / 5 題",
    reward: "✓ 已完成",
  },
  {
    icon: "🔍",
    title: "訂正 1 題",
    progress: "0 / 1 題",
    reward: "🪙 10",
  },
  {
    icon: "⏱️",
    title: "專注 20 分鐘",
    progress: "0 / 20 分鐘",
    reward: "🪙 10",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
        <header className="flex items-center justify-between gap-4">
          <div className="text-3xl font-black tracking-[-0.04em]">
            MedSlime.
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <ResourcePill label={`🔥 ${mockUser.streak} 天`} />
            <ResourcePill label={`🪙 ${mockUser.coins}`} />
            <ResourcePill label={`🎫 ${mockUser.tickets}`} />
          </div>
        </header>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[30px] border border-[#d8e9df] bg-gradient-to-br from-[#e7f9ee] via-white to-[#ebf8fc] p-7 shadow-[0_18px_44px_rgba(40,106,69,0.08)]">
            <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
              TODAY&apos;S STUDY
            </div>

            <h1 className="mt-2 max-w-xl text-4xl font-black leading-tight tracking-[-0.05em] md:text-5xl">
              把今天的知識
              <br />
              餵給你的史萊姆。
            </h1>

            <p className="mt-4 max-w-xl text-base leading-8 text-[#6f887b]">
              做題、訂正與專注學習都會讓 MedSlime 的收藏系統慢慢前進。
            </p>

            <Link
              href="/study"
              className="mt-7 block w-full rounded-2xl bg-[#31c978] px-5 py-4 text-center text-base font-black text-white transition hover:-translate-y-[1px] hover:bg-[#2dbc70] active:translate-y-0"
            >
              🧠 開始學習
            </Link>

            <Link
              href="/slimes"
              className="mt-3 block w-full rounded-2xl border border-[#d7e7de] bg-white px-5 py-4 text-center text-base font-black text-[#244c39] transition hover:bg-[#f5faf7]"
            >
              🐾 我的史萊姆
            </Link>
          </div>

          <div className="rounded-[30px] border border-[#d8e9df] bg-white p-6 shadow-[0_14px_36px_rgba(40,106,69,0.06)]">
            <div className="flex h-full flex-col items-center justify-center text-center">
              <img
                src={mockUser.slimeImage}
                alt={mockUser.slimeType}
                className="h-auto w-full max-w-[280px] object-contain"
              />

              <div className="mt-4 text-2xl font-black">
                {mockUser.slimeName}
              </div>

              <div className="mt-1 text-sm font-bold text-[#789083]">
                陪伴中
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4 text-2xl font-black tracking-[-0.03em]">
            今日任務
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {tasks.map((task) => (
              <TaskCard key={task.title} {...task} />
            ))}
          </div>

          <button className="mt-4 w-full rounded-2xl border border-[#d7e7de] bg-white px-5 py-3 font-bold text-[#315b45] transition hover:bg-[#f5faf7]">
            查看每日／每週任務
          </button>
        </section>
      </div>
    </main>
  );
}

function ResourcePill({ label }: { label: string }) {
  return (
    <div className="rounded-full border border-[#dfece4] bg-white px-4 py-2 text-sm font-black shadow-sm">
      {label}
    </div>
  );
}

function TaskCard({
  icon,
  title,
  progress,
  reward,
}: {
  icon: string;
  title: string;
  progress: string;
  reward: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#dfece4] bg-white p-5 shadow-[0_10px_26px_rgba(31,83,53,0.05)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eefaf2] text-2xl">
        {icon}
      </div>

      <div className="mt-4 text-lg font-black">{title}</div>

      <div className="mt-1 text-sm font-medium text-[#789083]">
        {progress}
      </div>

      <div className="mt-4 font-black text-[#2a9d5e]">
        {reward}
      </div>
    </div>
  );
}
