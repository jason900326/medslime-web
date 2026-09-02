"use client";

import { useState } from "react";
import TopBar from "@/components/top-bar";
import { useGameState } from "@/components/game-state-provider";

type Status = "in_progress" | "claimable" | "claimed";

type Task = {
  id: string;
  title: string;
  progress: number;
  target: number;
  unit: string;
  rewardCoins?: number;
  status: Status;
};

const initialDaily: Task[] = [
  {
    id: "q",
    title: "完成 5 題",
    progress: 5,
    target: 5,
    unit: "題",
    rewardCoins: 10,
    status: "claimable",
  },
  {
    id: "review",
    title: "訂正 1 題",
    progress: 0,
    target: 1,
    unit: "題",
    rewardCoins: 10,
    status: "in_progress",
  },
  {
    id: "focus",
    title: "專注 20 分鐘",
    progress: 0,
    target: 20,
    unit: "分鐘",
    rewardCoins: 10,
    status: "in_progress",
  },
];

export default function TasksPage() {
  const game = useGameState();
  const [daily, setDaily] = useState(initialDaily);
  const [weeklyTicketClaimed, setWeeklyTicketClaimed] = useState(false);

  const weekly = [
    ["本週使用 5 天", 3, 5, "天"],
    ["作答 200 題", 126, 200, "題"],
    ["複習 20 題錯題", 8, 20, "題"],
    ["專注 180 分鐘", 95, 180, "分鐘"],
  ] as const;

  const weeklyComplete = weekly.every((item) => item[1] >= item[2]);

  const claimDaily = (task: Task) => {
    if (task.status !== "claimable") return;
    if (task.rewardCoins) game.addCoins(task.rewardCoins);

    setDaily((current) =>
      current.map((item) =>
        item.id === task.id ? { ...item, status: "claimed" } : item,
      ),
    );
  };

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
        <TopBar showBack />

        <div className="mt-8 text-sm font-black tracking-[0.08em] text-[#2ba962]">
          TASKS
        </div>
        <h1 className="mt-2 text-4xl font-black">任務</h1>

        <section className="mt-8">
          <h2 className="text-2xl font-black">每日任務</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {daily.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClaim={() => claimDaily(task)}
              />
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-black">每週任務</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {weekly.map(([title, progress, target, unit]) => (
              <div
                key={title}
                className="rounded-[24px] border border-[#dfece4] bg-white p-5"
              >
                <div className="text-lg font-black">{title}</div>
                <div className="mt-4 text-sm font-bold text-[#557768]">
                  {progress} / {target} {unit}
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#e7efe9]">
                  <div
                    className="h-full rounded-full bg-[#55b97b]"
                    style={{
                      width: `${Math.min(100, (progress / target) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[26px] border border-[#dceae2] bg-white p-6">
            <div className="text-lg font-black">本週最終獎勵：🎫 ×1</div>

            <button
              disabled={!weeklyComplete || weeklyTicketClaimed}
              onClick={() => {
                game.addTickets(1);
                setWeeklyTicketClaimed(true);
              }}
              className={[
                "mt-4 rounded-xl px-5 py-3 font-black",
                weeklyComplete && !weeklyTicketClaimed
                  ? "bg-[#31c978] text-white"
                  : "cursor-not-allowed bg-[#edf2ef] text-[#9aac9f]",
              ].join(" ")}
            >
              {weeklyTicketClaimed ? "已領取" : "領取抽卡券"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function TaskCard({
  task,
  onClaim,
}: {
  task: Task;
  onClaim: () => void;
}) {
  const percent = Math.min(100, (task.progress / task.target) * 100);

  return (
    <div className="rounded-[24px] border border-[#dfece4] bg-white p-5">
      <div className="text-lg font-black">{task.title}</div>

      <div className="mt-4 text-sm font-bold text-[#557768]">
        {task.progress} / {task.target} {task.unit}
      </div>

      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#e7efe9]">
        <div
          className="h-full rounded-full bg-[#55b97b]"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="font-black text-[#2a9d5e]">
          🪙 {task.rewardCoins}
        </div>

        <button
          disabled={task.status !== "claimable"}
          onClick={onClaim}
          className={[
            "rounded-xl px-4 py-2 text-sm font-black",
            task.status === "claimable"
              ? "bg-[#31c978] text-white"
              : "cursor-not-allowed bg-[#edf2ef] text-[#9aac9f]",
          ].join(" ")}
        >
          {task.status === "claimed"
            ? "已領取"
            : task.status === "claimable"
              ? "領取"
              : "尚未完成"}
        </button>
      </div>
    </div>
  );
}
