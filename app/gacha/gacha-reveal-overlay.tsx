"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Sparkles, X } from "lucide-react";
import { SLIME_BY_ID, type SlimeRarity } from "@/lib/slime-data";

type GachaResult = {
  slimeId: string;
  isNew: boolean;
  duplicateReward: null | {
    type: string;
    amount: number;
  };
};

type Props = {
  open: boolean;
  loading: boolean;
  results: GachaResult[];
  pullCount: 1 | 10;
  onClose: () => void;
};

const RARITY_THEME: Record<
  SlimeRarity,
  {
    glow: string;
    border: string;
    badge: string;
    soft: string;
    text: string;
  }
> = {
  N: {
    glow: "shadow-[0_0_48px_rgba(148,163,184,0.48)]",
    border: "border-slate-300",
    badge: "bg-slate-100 text-slate-600",
    soft: "from-slate-50 via-white to-slate-100",
    text: "text-slate-500",
  },
  R: {
    glow: "shadow-[0_0_58px_rgba(34,211,238,0.48)]",
    border: "border-cyan-300",
    badge: "bg-cyan-100 text-cyan-700",
    soft: "from-cyan-50 via-white to-sky-100",
    text: "text-cyan-600",
  },
  SR: {
    glow: "shadow-[0_0_70px_rgba(168,85,247,0.58)]",
    border: "border-violet-400",
    badge: "bg-violet-100 text-violet-700",
    soft: "from-violet-100 via-white to-fuchsia-100",
    text: "text-violet-600",
  },
  SSR: {
    glow: "shadow-[0_0_82px_rgba(251,191,36,0.68)]",
    border: "border-amber-400",
    badge: "bg-amber-100 text-amber-800",
    soft: "from-amber-100 via-white to-rose-100",
    text: "text-amber-600",
  },
};

export default function GachaRevealOverlay({
  open,
  loading,
  results,
  pullCount,
  onClose,
}: Props) {
  const [singleRevealed, setSingleRevealed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragX, setDragX] = useState(0);

  useEffect(() => {
    if (!open) return;

    setSingleRevealed(false);
    setCurrentIndex(0);
    setShowSummary(false);
    setDragStartX(null);
    setDragX(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const currentResult = results[currentIndex];
  const currentSlime = currentResult
    ? SLIME_BY_ID[currentResult.slimeId]
    : null;

  const remaining = useMemo(
    () => Math.max(results.length - currentIndex, 0),
    [currentIndex, results.length],
  );

  if (!open) return null;

  const close = () => {
    if (loading) return;
    onClose();
  };

  const revealNext = () => {
    if (!currentResult) return;

    if (currentIndex >= results.length - 1) {
      setShowSummary(true);
      setDragX(0);
      return;
    }

    setCurrentIndex((index) => index + 1);
    setDragX(0);
    setDragStartX(null);
  };

  const handlePointerUp = () => {
    if (Math.abs(dragX) >= 70) {
      revealNext();
      return;
    }

    setDragX(0);
    setDragStartX(null);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#102019]/80 px-4 py-5 backdrop-blur-md sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-label="抽卡結果"
    >
      <div className="relative flex min-h-[calc(100dvh-2.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] border border-white/20 bg-[radial-gradient(circle_at_top,#f4fff8_0%,#eef8f1_28%,#dceee3_100%)] shadow-2xl sm:min-h-0 sm:h-[min(820px,calc(100dvh-3rem))]">
        <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-white/80 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-[#89dfaf]/30 blur-3xl" />

        <header className="relative z-20 flex items-center justify-between px-5 py-4 sm:px-7">
          <div>
            <div className="text-[11px] font-black tracking-[0.22em] text-[#55a777]">
              MEDSLIME GACHA
            </div>
            <div className="mt-1 text-lg font-black text-[#17372a] sm:text-xl">
              {pullCount === 1 ? "召喚結果" : "十連召喚"}
            </div>
          </div>

          <button
            type="button"
            onClick={close}
            disabled={loading}
            aria-label="關閉抽卡結果"
            className="grid h-10 w-10 place-items-center rounded-full border border-[#d4e6da] bg-white/85 text-[#466454] shadow-sm transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={19} strokeWidth={2.5} />
          </button>
        </header>

        <div className="relative z-10 flex flex-1 items-center justify-center px-4 pb-5 sm:px-8 sm:pb-8">
          {loading || results.length === 0 ? (
            <LoadingStage />
          ) : pullCount === 1 ? (
            <SingleReveal
              result={results[0]}
              revealed={singleRevealed}
              onReveal={() => setSingleRevealed(true)}
            />
          ) : showSummary ? (
            <TenPullSummary results={results} onClose={close} />
          ) : (
            <TenPullStack
              results={results}
              currentIndex={currentIndex}
              dragX={dragX}
              dragStartX={dragStartX}
              remaining={remaining}
              onPointerDown={(x) => {
                setDragStartX(x);
                setDragX(0);
              }}
              onPointerMove={(x) => {
                if (dragStartX === null) return;
                setDragX(x - dragStartX);
              }}
              onPointerUp={handlePointerUp}
              onNext={revealNext}
              onShowAll={() => setShowSummary(true)}
            />
          )}
        </div>

        {!loading && pullCount === 1 && results.length > 0 && (
          <footer className="relative z-20 flex justify-center px-5 pb-5 sm:pb-7">
            <button
              type="button"
              onClick={close}
              className="rounded-2xl bg-[#17372a] px-7 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5"
            >
              收下史萊姆
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}

function LoadingStage() {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative grid h-32 w-32 place-items-center rounded-full bg-white/65 shadow-[0_0_70px_rgba(49,201,120,0.28)]">
        <div className="absolute inset-3 animate-ping rounded-full border border-[#7edca6]/40" />
        <div className="absolute inset-6 animate-pulse rounded-full bg-[#a9e9c4]/45" />
        <Sparkles className="relative text-[#31c978]" size={40} strokeWidth={1.7} />
      </div>
      <div className="mt-6 text-xl font-black text-[#17372a]">史萊姆生成中...</div>
      <div className="mt-2 text-sm font-bold text-[#789083]">正在決定這次會遇見誰</div>
    </div>
  );
}

function SingleReveal({
  result,
  revealed,
  onReveal,
}: {
  result: GachaResult;
  revealed: boolean;
  onReveal: () => void;
}) {
  const slime = SLIME_BY_ID[result.slimeId];
  const theme = RARITY_THEME[slime.rarity];

  return (
    <div className="flex w-full flex-col items-center text-center">
      <div className={`relative rounded-[34px] ${theme.glow}`}>
        <div className="h-[430px] w-[278px] [perspective:1200px] sm:h-[500px] sm:w-[322px]">
          <button
            type="button"
            onClick={() => !revealed && onReveal()}
            aria-label={revealed ? `${slime.defaultName}，${slime.rarity}` : "翻開卡片"}
            className={[
              "relative h-full w-full rounded-[30px] transition-transform duration-700 [transform-style:preserve-3d]",
              revealed ? "[transform:rotateY(180deg)]" : "hover:-translate-y-1",
            ].join(" ")}
          >
            <CardBack rarity={slime.rarity} />
            <CardFront result={result} showReward className="[transform:rotateY(180deg)]" />
          </button>
        </div>
      </div>

      <div className="mt-6 min-h-12">
        {revealed ? (
          <div className="text-sm font-black text-[#4a6a59]">已加入這次抽卡結果</div>
        ) : (
          <>
            <div className={`text-sm font-black ${theme.text}`}>
              {slime.rarity === "SSR"
                ? "這張卡的氣息不太一樣..."
                : slime.rarity === "SR"
                  ? "卡片周圍泛著強烈的光"
                  : "點擊卡片翻開"}
            </div>
            <div className="mt-1 text-xs font-bold text-[#8aa095]">點一下看看是誰</div>
          </>
        )}
      </div>
    </div>
  );
}

function TenPullStack({
  results,
  currentIndex,
  dragX,
  dragStartX,
  remaining,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onNext,
  onShowAll,
}: {
  results: GachaResult[];
  currentIndex: number;
  dragX: number;
  dragStartX: number | null;
  remaining: number;
  onPointerDown: (x: number) => void;
  onPointerMove: (x: number) => void;
  onPointerUp: () => void;
  onNext: () => void;
  onShowAll: () => void;
}) {
  const current = results[currentIndex];
  const slime = SLIME_BY_ID[current.slimeId];
  const theme = RARITY_THEME[slime.rarity];

  return (
    <div className="flex w-full flex-col items-center">
      <div className="mb-4 flex w-full max-w-md items-center justify-between px-1 text-xs font-black text-[#668173] sm:text-sm">
        <span>{currentIndex + 1} / {results.length}</span>
        <span>剩下 {remaining} 張</span>
      </div>

      <div className={`relative h-[430px] w-[278px] rounded-[32px] sm:h-[500px] sm:w-[322px] ${theme.glow}`}>
        {results
          .slice(currentIndex)
          .map((result, offset) => {
            const stackSlime = SLIME_BY_ID[result.slimeId];
            const isTop = offset === 0;
            const visibleOffset = Math.min(offset, 5);
            const stackTransform = `translateY(${visibleOffset * 4}px) scale(${1 - visibleOffset * 0.012})`;
            const topTransform = `translateX(${dragX}px) rotate(${dragX / 24}deg)`;

            return (
              <div
                key={`${result.slimeId}-${currentIndex + offset}`}
                className={[
                  "absolute inset-0 select-none rounded-[30px] transition-transform",
                  isTop && dragStartX !== null ? "duration-75" : "duration-300",
                  isTop ? "cursor-grab active:cursor-grabbing" : "pointer-events-none",
                ].join(" ")}
                style={{
                  zIndex: results.length - offset,
                  transform: isTop ? topTransform : stackTransform,
                  transformOrigin: "center bottom",
                }}
                onPointerDown={(event) => {
                  if (!isTop) return;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  onPointerDown(event.clientX);
                }}
                onPointerMove={(event) => {
                  if (!isTop) return;
                  onPointerMove(event.clientX);
                }}
                onPointerUp={() => isTop && onPointerUp()}
                onPointerCancel={() => isTop && onPointerUp()}
              >
                <CardFront result={result} />
              </div>
            );
          })}
      </div>

      <div className="mt-7 text-center">
        <div className={`text-sm font-black ${theme.text}`}>
          {slime.rarity === "SSR"
            ? "SSR · 這張值得停一下"
            : `${slime.rarity} · ${slime.defaultName}`}
        </div>
        <div className="mt-1 text-xs font-bold text-[#84988d]">左右滑開卡片，看看下一張</div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onShowAll}
          className="rounded-xl border border-[#cfe1d6] bg-white/80 px-4 py-2.5 text-xs font-black text-[#4b6859] transition hover:bg-white"
        >
          全部揭曉
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-1 rounded-xl bg-[#17372a] px-4 py-2.5 text-xs font-black text-white shadow-md transition hover:-translate-y-0.5"
        >
          {currentIndex === results.length - 1 ? "查看總覽" : "下一張"}
          <ChevronRight size={15} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}

function TenPullSummary({
  results,
  onClose,
}: {
  results: GachaResult[];
  onClose: () => void;
}) {
  const highRarity = results.filter((result) => {
    const rarity = SLIME_BY_ID[result.slimeId].rarity;
    return rarity === "SR" || rarity === "SSR";
  }).length;

  return (
    <div className="w-full max-w-4xl">
      <div className="text-center">
        <div className="text-2xl font-black text-[#17372a] sm:text-3xl">十連結果</div>
        <div className="mt-2 text-sm font-bold text-[#789083]">
          {highRarity > 0 ? `這次有 ${highRarity} 張 SR 以上` : "這次的史萊姆都收進圖鑑紀錄了"}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-5 sm:gap-3">
        {results.map((result, index) => {
          const slime = SLIME_BY_ID[result.slimeId];
          const theme = RARITY_THEME[slime.rarity];

          return (
            <article
              key={`${result.slimeId}-${index}`}
              className={`relative overflow-hidden rounded-[20px] border-2 bg-gradient-to-br p-2.5 shadow-sm ${theme.border} ${theme.soft}`}
            >
              {result.isNew && (
                <div className="absolute left-2 top-2 z-10 rounded-full bg-[#17372a] px-2 py-1 text-[9px] font-black tracking-wide text-white">
                  NEW
                </div>
              )}

              <div className="flex min-h-[106px] items-center justify-center sm:min-h-[120px]">
                <img
                  src={slime.image}
                  alt={slime.defaultName}
                  className="h-auto max-h-[112px] w-full object-contain sm:max-h-[130px]"
                />
              </div>

              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="min-w-0 truncate text-[11px] font-black text-[#294b39] sm:text-xs">
                  {slime.defaultName}
                </div>
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-black ${theme.badge}`}>
                  {slime.rarity}
                </span>
              </div>

              <RewardBadge result={result} compact />
            </article>
          );
        })}
      </div>

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={onClose}
          className="rounded-2xl bg-[#17372a] px-7 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5"
        >
          收下全部史萊姆
        </button>
      </div>
    </div>
  );
}

function CardBack({ rarity }: { rarity: SlimeRarity }) {
  const theme = RARITY_THEME[rarity];

  return (
    <div
      className={[
        "absolute inset-0 overflow-hidden rounded-[30px] border-2 bg-[#17372a] p-3 [backface-visibility:hidden]",
        theme.border,
      ].join(" ")}
    >
      <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,white_0_1px,transparent_1.5px),radial-gradient(circle_at_80%_30%,white_0_1px,transparent_1.5px),radial-gradient(circle_at_50%_75%,white_0_1px,transparent_1.5px)] [background-size:44px_44px,52px_52px,60px_60px]" />
      <div className="relative flex h-full flex-col items-center justify-center rounded-[24px] border border-white/30 bg-[radial-gradient(circle_at_center,rgba(91,224,149,0.25),transparent_55%)]">
        <div className="grid h-28 w-28 place-items-center rounded-[38%_42%_40%_35%] border-2 border-white/70 bg-[#6ee19e]/20 shadow-[inset_0_0_30px_rgba(255,255,255,0.18)]">
          <div className="h-3 w-12 rounded-full bg-white/85" />
        </div>
        <div className="mt-7 text-lg font-black tracking-[0.2em] text-white">MEDSLIME</div>
        <div className="mt-2 text-[10px] font-bold tracking-[0.28em] text-white/55">COLLECTION CARD</div>
        <div className={`mt-5 rounded-full px-3 py-1 text-[10px] font-black ${theme.badge}`}>
          {rarity} AURA
        </div>
      </div>
    </div>
  );
}

function CardFront({
  result,
  showReward = false,
  className = "",
}: {
  result: GachaResult;
  showReward?: boolean;
  className?: string;
}) {
  const slime = SLIME_BY_ID[result.slimeId];
  const theme = RARITY_THEME[slime.rarity];

  return (
    <div
      className={[
        "absolute inset-0 overflow-hidden rounded-[30px] border-2 bg-gradient-to-br p-3 shadow-xl [backface-visibility:hidden]",
        theme.border,
        theme.soft,
        className,
      ].join(" ")}
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-[24px] border border-white/80 bg-white/65 p-4">
        <div className="absolute inset-x-8 top-12 h-32 rounded-full bg-white/80 blur-2xl" />

        <div className="relative z-10 flex items-center justify-between">
          <span className={`rounded-full px-3 py-1 text-[11px] font-black ${theme.badge}`}>
            {slime.rarity}
          </span>
          {result.isNew && (
            <span className="rounded-full bg-[#17372a] px-3 py-1 text-[10px] font-black tracking-wide text-white">
              NEW
            </span>
          )}
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center py-3">
          <img
            src={slime.image}
            alt={slime.defaultName}
            draggable={false}
            className="h-auto max-h-[280px] w-full object-contain sm:max-h-[325px]"
          />
        </div>

        <div className="relative z-10 text-center">
          <div className={`text-[11px] font-black tracking-[0.16em] ${theme.text}`}>
            {slime.rarity} SLIME
          </div>
          <div className="mt-1 text-xl font-black text-[#17372a] sm:text-2xl">
            {slime.defaultName}
          </div>
          {showReward && <RewardBadge result={result} />}
        </div>
      </div>
    </div>
  );
}

function RewardBadge({
  result,
  compact = false,
}: {
  result: GachaResult;
  compact?: boolean;
}) {
  const base = compact
    ? "mt-1.5 truncate rounded-lg px-2 py-1 text-[9px] font-black"
    : "mx-auto mt-3 max-w-[220px] rounded-xl px-3 py-2 text-xs font-black";

  if (result.isNew) {
    return <div className={`${base} bg-[#eaf9f0] text-[#28754b]`}>NEW · 已加入圖鑑</div>;
  }

  if (!result.duplicateReward) return null;

  if (result.duplicateReward.type === "coins") {
    return (
      <div className={`${base} bg-[#fff4d8] text-[#996719]`}>
        重複 · +{result.duplicateReward.amount} 金幣
      </div>
    );
  }

  if (result.duplicateReward.type === "fragments_full") {
    return <div className={`${base} bg-[#eef3f0] text-[#557768]`}>碎片已滿 · 可解鎖飾品</div>;
  }

  return (
    <div className={`${base} bg-[#eef3f0] text-[#557768]`}>
      重複 · +{result.duplicateReward.amount} 碎片
    </div>
  );
}
