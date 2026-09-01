"use client";

import Link from "next/link";
import { useState } from "react";

type Slime = {
  name: string;
  rarity: "N" | "R" | "SR" | "SSR";
  image: string;
  owned: boolean;
  companion: boolean;
  description: string;
  fragments: number;
  accessory: string;
  accessoryUnlocked: boolean;
};

const initialSlimes: Slime[] = [
  {
    name: "Pink",
    rarity: "N",
    image: "/slimes/strawberry.PNG",
    owned: true,
    companion: true,
    description: "軟綿綿又親人的陪伴型史萊姆。",
    fragments: 20,
    accessory: "愛心髮夾",
    accessoryUnlocked: false,
  },
  {
    name: "綠色史萊姆",
    rarity: "N",
    image: "/slimes/apple.PNG",
    owned: true,
    companion: false,
    description: "最經典的 MedSlime 夥伴。",
    fragments: 30,
    accessory: "嫩芽髮夾",
    accessoryUnlocked: true,
  },
  {
    name: "藍色史萊姆",
    rarity: "N",
    image: "/slimes/ocean.PNG",
    owned: true,
    companion: false,
    description: "安靜又可靠的讀書夥伴。",
    fragments: 0,
    accessory: "水滴小帽",
    accessoryUnlocked: false,
  },
  {
    name: "Chill",
    rarity: "SSR",
    image: "/slimes/cloud.PNG",
    owned: true,
    companion: false,
    description: "不用急，該讀的還是會讀完。",
    fragments: 0,
    accessory: "Chill 墨鏡",
    accessoryUnlocked: false,
  },
];

export default function SlimesPage() {
  const [expandedName, setExpandedName] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="rounded-xl border border-[#d7e7de] bg-white px-4 py-2 font-bold text-[#315b45] transition hover:bg-[#f5faf7]"
          >
            ← 返回首頁
          </Link>

          <Link
            href="/gacha"
            className="rounded-xl bg-[#31c978] px-5 py-3 font-black text-white transition hover:bg-[#2dbc70]"
          >
            🎰 去抽卡
          </Link>
        </div>

        <section className="mt-8">
          <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
            COLLECTION
          </div>

          <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">
            史萊姆圖鑑
          </h1>

          <p className="mt-3 text-[#70877a]">
            點「查看詳情」後，同一張卡片會直接展開。
          </p>
        </section>

        <section className="mt-8 grid grid-cols-2 items-start gap-4 md:grid-cols-3 lg:grid-cols-4">
          {initialSlimes.map((slime) => {
            const expanded = expandedName === slime.name;
            const fragmentPercent = Math.min(
              100,
              Math.max(0, (slime.fragments / 30) * 100),
            );

            return (
              <article
                key={slime.name}
                className={[
                  "overflow-hidden rounded-[24px] border border-[#dbe9e1] bg-white p-5 text-center shadow-[0_8px_22px_rgba(32,85,54,0.05)]",
                  "transition-all duration-300 ease-out",
                  expanded
                    ? "scale-[1.02] shadow-[0_18px_40px_rgba(32,85,54,0.12)]"
                    : "scale-100",
                ].join(" ")}
              >
                <div className="flex min-h-[150px] items-center justify-center">
                  <img
                    src={slime.image}
                    alt={slime.name}
                    className={[
                      "h-auto w-full object-contain transition-all duration-300",
                      expanded ? "max-w-[190px]" : "max-w-[160px]",
                    ].join(" ")}
                  />
                </div>

                <div className="mt-3 text-lg font-black">
                  {slime.name}
                </div>

                <div className="mt-1 text-sm font-bold text-[#789083]">
                  {slime.rarity} · {slime.owned ? "已擁有" : "尚未取得"}
                </div>

                {slime.companion && (
                  <div className="mx-auto mt-3 inline-flex rounded-full border border-[#cfe9da] bg-[#e9f8ef] px-3 py-1 text-sm font-black text-[#28754b]">
                    ✓ 陪伴中
                  </div>
                )}

                <div
                  className={[
                    "grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out",
                    expanded
                      ? "mt-4 grid-rows-[1fr] opacity-100"
                      : "mt-0 grid-rows-[0fr] opacity-0",
                  ].join(" ")}
                >
                  <div className="overflow-hidden">
                    <div className="border-t border-[#e3ede7] pt-4 text-left">
                      <p className="text-sm leading-6 text-[#6f887b]">
                        {slime.description}
                      </p>

                      <div className="mt-4 flex items-center justify-between text-sm font-bold text-[#557768]">
                        <span>專屬碎片</span>
                        <span>
                          {slime.fragments} / 30
                        </span>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e7efe9]">
                        <div
                          className="h-full rounded-full bg-[#55b97b] transition-all duration-300"
                          style={{ width: `${fragmentPercent}%` }}
                        />
                      </div>

                      <div className="mt-2 text-xs font-bold text-[#789083]">
                        {slime.accessoryUnlocked
                          ? "專屬飾品已解鎖"
                          : `專屬飾品還差 ${Math.max(0, 30 - slime.fragments)} 碎片`}
                      </div>

                      <div className="mt-4 rounded-xl bg-[#f3f8f5] px-3 py-3 text-sm font-black text-[#315b45]">
                        ✨ 專屬飾品：{slime.accessory}
                      </div>

                      {!slime.companion && slime.owned && (
                        <button className="mt-3 w-full rounded-xl bg-[#31c978] py-2.5 font-black text-white transition hover:bg-[#2dbc70]">
                          設為陪伴
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() =>
                    setExpandedName((current) =>
                      current === slime.name ? null : slime.name,
                    )
                  }
                  className="mt-4 w-full rounded-xl border border-[#d7e7de] bg-white py-2.5 font-bold transition hover:bg-[#f5faf7]"
                >
                  {expanded ? "收起詳情" : "查看詳情"}
                </button>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
