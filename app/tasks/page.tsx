"use client";

import { useEffect, useMemo, useState } from "react";
import TopBar from "@/components/top-bar";
import { useGameState } from "@/components/game-state-provider";

type TaskStatus = "in_progress" | "claimable" | "claimed";

type Task = {
  id: string;
  title: string;
  progress: number;
  target: number;
  unit: string;
  reward: {
    type: "coins" | "tickets";
    amount: number;
  };
  claimId: string;
};

function getLocalDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonday(date: Date) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function getWeekKeys(now: Date) {
  const monday = getMonday(now);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return getLocalDateKey(date);
  });
}

export default function TasksPage() {
  const game = useGameState();
  const [todayKey, setTodayKey] = useState<string | null>(null);
  const [weekKeys, setWeekKeys] = useState<string[]>([]);

  useEffect(() => {
    const now = new Date();
    setTodayKey(getLocalDateKey(now));
    setWeekKeys(getWeekKeys(now));
  }, []);

  const today = todayKey
    ? game.activityByDate[todayKey] ?? {
        questionsAnswered: 0,
        mistakesReviewed: 0,
        focusSeconds: 0,
      }
    : { questionsAnswered: 0, mistakesReviewed: 0, focusSeconds: 0 };

  const week = useMemo(() => {
    const activities = weekKeys.map(
      (key) =>
        game.activityByDate[key] ?? {
          questionsAnswered: 0,
          mistakesReviewed: 0,
          focusSeconds: 0,
        },
    );

    return {
      activeDays: activities.filter(
        (item) =>
          item.questionsAnswered > 0 ||
          item.mistakesReviewed > 0 ||
          item.focusSeconds > 0,
      ).length,
      questionsAnswered: activities.reduce(
        (sum, item) => sum + item.questionsAnswered,
        0,
      ),
      mistakesReviewed: activities.reduce(
        (sum, item) => sum + item.mistakesReviewed,
        0,
      ),
      focusMinutes: Math.floor(
        activities.reduce((sum, item) => sum + item.focusSeconds, 0) / 60,
      ),
    };
  }, [game.activityByDate, weekKeys]);

  const weekId = weekKeys[0] ?? "loading";

  const dailyTasks: Task[] = [
    {
      id: "daily-questions",
      title: "完成 5 題",
      progress: today.questionsAnswered,
      target: 5,
      unit: "題",
      reward: { type: "coins", amount: 25 },
      claimId: `daily:${todayKey ?? "loading"}:questions`,
    },
    {
      id: "daily-review",
      title: "訂正 1 題",
      progress: today.mistakesReviewed,
      target: 1,
      unit: "題",
      reward: { type: "coins", amount: 25 },
      claimId: `daily:${todayKey ?? "loading"}:review`,
    },
    {
      id: "daily-focus",
      title: "專注 20 分鐘",
      progress: Math.floor(today.focusSeconds / 60),
      target: 20,
      unit: "分鐘",
      reward: { type: "coins", amount: 25 },
      claimId: `daily:${todayKey ?? "loading"}:focus`,
    },
  ];

  const dailyComplete = dailyTasks.every((task) => task.progress >= task.target);
  const dailyBonusClaimId = `daily:${todayKey ?? "loading"}:all`;
  const dailyBonusClaimed = game.claimedTaskIds.includes(dailyBonusClaimId);

  const weeklyItems = [
    {
      title: "本週使用 5 天",
      progress: week.activeDays,
      target: 5,
      unit: "天",
    },
    {
      title: "作答 200 題",
      progress: week.questionsAnswered,
      target: 200,
      unit: "題",
    },
    {
      title: "複習 20 題錯題",
      progress: week.mistakesReviewed,
      target: 20,
      unit: "題",
    },
    {
      title: "專注 180 分鐘",
      progress: week.focusMinutes,
      target: 180,
      unit: "分鐘",
    },
  ];

  const weeklyComplete = weeklyItems.every((item) => item.progress >= item.target);
  const weeklyClaimId = `weekly:${weekId}:all`;
  const weeklyClaimed = game.claimedTaskIds.includes(weeklyClaimId);

  if (!game.isReady || !todayKey || weekKeys.length === 0) {
    return <main className="min-h-screen bg-[#f8fcf9]" />;
  }

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
        <TopBar showBack backHref="/" backLabel="返回首頁" />

        <div className="mt-8 text-sm font-black tracking-[0.08em] text-[#2ba962]">
          TASKS
        </div>
        <h1 className="mt-2 text-4xl font-black">任務</h1>

        <section className="mt-8">
          <h2 className="text-2xl font-black">每日任務</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {dailyTasks.map((task) => {
              const status: TaskStatus = game.claimedTaskIds.includes(task.claimId)
                ? "claimed"
                : task.progress >= task.target
                  ? "claimable"
                  : "in_progress";

              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  status={status}
                  onClaim={() =>
                    game.claimTaskReward(task.claimId, task.reward)
                  }
                />
              );
            })}
          </div>

          <div className="mt-5 rounded-[26px] border border-[#dceae2] bg-white p-6">
            <div className="text-lg font-black">每日全清獎勵：🎫 ×1</div>
            <div className="mt-2 text-sm font-bold leading-6 text-[#789083]">
              今天的基本份完成了，這張抽卡券可以帶走。
            </div>

            <button
              type="button"
              disabled={!dailyComplete || dailyBonusClaimed}
              onClick={() =>
                game.claimTaskReward(dailyBonusClaimId, {
                  type: "tickets",
                  amount: 1,
                })
              }
              className={[
                "mt-4 rounded-xl px-5 py-3 font-black",
                dailyComplete && !dailyBonusClaimed
                  ? "bg-[#31c978] text-white"
                  : "cursor-not-allowed bg-[#edf2ef] text-[#9aac9f]",
              ].join(" ")}
            >
              {dailyBonusClaimed
                ? "已領取"
                : dailyComplete
                  ? "領取抽卡券"
                  : "完成全部每日任務後領取"}
            </button>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-black">每週任務</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {weeklyItems.map(({ title, progress, target, unit }) => (
              <div
                key={title}
                className="rounded-[24px] border border-[#dfece4] bg-white p-5"
              >
                <div className="text-lg font-black">{title}</div>
                <div className="mt-4 text-sm font-bold text-[#557768]">
                  {Math.min(progress, target)} / {target} {unit}
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
            <div className="text-lg font-black">本週全清獎勵：🎫 ×5</div>
            <div className="mt-2 text-sm font-bold leading-6 text-[#789083]">
              這週有穩定回來學習，5 張抽卡券是你的。
            </div>

            <button
              type="button"
              disabled={!weeklyComplete || weeklyClaimed}
              onClick={() =>
                game.claimTaskReward(weeklyClaimId, {
                  type: "tickets",
                  amount: 5,
                })
              }
              className={[
                "mt-4 rounded-xl px-5 py-3 font-black",
                weeklyComplete && !weeklyClaimed
                  ? "bg-[#31c978] text-white"
                  : "cursor-not-allowed bg-[#edf2ef] text-[#9aac9f]",
              ].join(" ")}
            >
              {weeklyClaimed
                ? "已領取"
                : weeklyComplete
                  ? "領取 5 張抽卡券"
                  : "尚未完成"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function TaskCard({
  task,
  status,
  onClaim,
}: {
  task: Task;
  status: TaskStatus;
  onClaim: () => void;
}) {
  const percent = Math.min(100, (task.progress / task.target) * 100);

  return (
    <div className="rounded-[24px] border border-[#dfece4] bg-white p-5">
      <div className="text-lg font-black">{task.title}</div>
      <div className="mt-4 text-sm font-bold text-[#557768]">
        {Math.min(task.progress, task.target)} / {task.target} {task.unit}
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#e7efe9]">
        <div
          className="h-full rounded-full bg-[#55b97b]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="font-black text-[#2a9d5e]">
          {task.reward.type === "coins"
            ? `🪙 ${task.reward.amount}`
            : `🎫 ${task.reward.amount}`}
        </div>
        <button
          type="button"
          disabled={status !== "claimable"}
          onClick={onClaim}
          className={[
            "rounded-xl px-4 py-2 text-sm font-black",
            status === "claimable"
              ? "bg-[#31c978] text-white"
              : "cursor-not-allowed bg-[#edf2ef] text-[#9aac9f]",
          ].join(" ")}
        >
          {status === "claimed"
            ? "已領取"
            : status === "claimable"
              ? "領取"
              : "尚未完成"}
        </button>
      </div>
    </div>
  );
}
