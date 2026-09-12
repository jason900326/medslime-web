"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Sparkles, X } from "lucide-react";
import { SLIME_BY_ID, type SlimeRarity } from "@/lib/slime-data";

type GachaResult = {
  slimeId: string;
  isNew: boolean;
  duplicateReward: null | {
    type: "coins";
    amount: number;
  };
};

type Props = {
  open: boolean;
  loading: boolean;
  results: GachaResult[];
  pullCount: 1 | 10;
  showGestureHint?: boolean;
  onClose: () => void;
};

const RARITY_THEME: Record<
  SlimeRarity,
  {
    glow: string;
    border: string;
    badge: string;
    soft: string;
  }
> = {
  N: {
    glow: "shadow-[0_0_48px_rgba(148,163,184,0.48)]",
    border: "border-slate-300",
    badge: "bg-slate-100 text-slate-600",
    soft: "from-slate-50 via-white to-slate-100",
  },
  R: {
    glow: "shadow-[0_0_58px_rgba(34,211,238,0.48)]",
    border: "border-cyan-300",
    badge: "bg-cyan-100 text-cyan-700",
    soft: "from-cyan-50 via-white to-sky-100",
  },
  SR: {
    glow: "shadow-[0_0_70px_rgba(168,85,247,0.58)]",
    border: "border-violet-400",
    badge: "bg-violet-100 text-violet-700",
    soft: "from-violet-100 via-white to-fuchsia-100",
  },
  SSR: {
    glow: "shadow-[0_0_82px_rgba(251,191,36,0.68)]",
    border: "border-amber-400",
    badge: "bg-amber-100 text-amber-800",
    soft: "from-amber-100 via-white to-rose-100",
  },
};

export default function GachaRevealOverlay({
  open,
  loading,
  results,
  pullCount,
  showGestureHint = false,
  onClose,
}: Props) {
  const [singleRevealed, setSingleRevealed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tenCardRevealed, setTenCardRevealed] = useState(false);
  const [tenCardExiting, setTenCardExiting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [interactionLocked, setInteractionLocked] = useState(false);
  const revealTimer = useRef<number | null>(null);
  const advanceTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setSingleRevealed(false);
    setCurrentIndex(0);
    setTenCardRevealed(false);
    setTenCardExiting(false);
    setShowSummary(false);
    setInteractionLocked(false);
    if (revealTimer.current !== null) window.clearTimeout(revealTimer.current);
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(
    () => () => {
      if (revealTimer.current !== null) window.clearTimeout(revealTimer.current);
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    },
    [],
  );

  const currentResult = results[currentIndex];
  const remaining = useMemo(
    () => Math.max(results.length - currentIndex - 1, 0),
    [currentIndex, results.length],
  );

  if (!open) return null;

  const close = () => {
    if (loading) return;
    onClose();
  };

  const revealTenCard = () => {
    if (!currentResult || interactionLocked || tenCardRevealed) return;

    setTenCardRevealed(true);
    setInteractionLocked(true);

    revealTimer.current = window.setTimeout(() => {
      setTenCardExiting(true);
      revealTimer.current = null;

      advanceTimer.current = window.setTimeout(() => {
        if (currentIndex >= results.length - 1) {
          setShowSummary(true);
        } else {
          setCurrentIndex((index) => index + 1);
        }
        setTenCardRevealed(false);
        setTenCardExiting(false);
        setInteractionLocked(false);
        advanceTimer.current = null;
      }, 320);
    }, 620);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#102019]/80 px-3 py-3 backdrop-blur-md sm:px-6 sm:py-5"
      role="dialog"
      aria-modal="true"
      aria-label="抽卡結果"
    >
      <div className="relative flex h-[calc(100dvh-1.5rem)] min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-[30px] border border-white/20 bg-[radial-gradient(circle_at_top,#f4fff8_0%,#eef8f1_28%,#dceee3_100%)] shadow-2xl sm:h-[min(820px,calc(100dvh-3rem))]">
        <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-white/80 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-[#89dfaf]/30 blur-3xl" />

        <header className="relative z-20 flex shrink-0 items-center justify-between px-5 py-3.5 sm:px-7 sm:py-4">
          <div className="text-lg font-black text-[#17372a] sm:text-xl">
            {pullCount === 1 ? "召喚結果" : "十連召喚"}
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

        <div
          className={[
            "relative z-10 flex min-h-0 flex-1 justify-center px-4 pb-3 sm:px-8 sm:pb-8",
            showSummary
              ? "items-start overflow-y-auto overscroll-contain"
              : "items-center overflow-hidden",
          ].join(" ")}
        >
          {loading || results.length === 0 ? (
            <LoadingStage />
          ) : pullCount === 1 ? (
            <SingleReveal
              result={results[0]}
              revealed={singleRevealed}
              showHint={showGestureHint && !singleRevealed}
              onReveal={() => setSingleRevealed(true)}
            />
          ) : showSummary ? (
            <TenPullSummary results={results} onClose={close} />
          ) : (
            <TenPullStack
              results={results}
              currentIndex={currentIndex}
              revealed={tenCardRevealed}
              exiting={tenCardExiting}
              remaining={remaining}
              locked={interactionLocked}
              showHint={showGestureHint && currentIndex === 0 && !tenCardRevealed}
              onReveal={revealTenCard}
            />
          )}
        </div>

        {!loading && pullCount === 1 && results.length > 0 && singleRevealed && (
          <footer className="relative z-20 flex shrink-0 justify-center px-5 pb-5 sm:pb-7">
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
    </div>
  );
}

function SingleReveal({
  result,
  revealed,
  showHint,
  onReveal,
}: {
  result: GachaResult;
  revealed: boolean;
  showHint: boolean;
  onReveal: () => void;
}) {
  const slime = SLIME_BY_ID[result.slimeId];
  const theme = RARITY_THEME[slime.rarity];

  return (
    <div className="flex w-full min-h-0 flex-col items-center justify-center text-center">
      <div className={`relative rounded-[30px] ${theme.glow}`}>
        <GestureSurface
          disabled={revealed}
          onReveal={onReveal}
          ariaLabel={revealed ? `${slime.defaultName}，${slime.rarity}` : "揭開卡片"}
          className="relative aspect-[278/430] h-[min(49dvh,400px)] rounded-[28px] sm:h-[min(60dvh,480px)]"
        >
          {revealed ? <CardFront result={result} showReward /> : <CardBack rarity={slime.rarity} />}
          {showHint && <TapHint />}
        </GestureSurface>
      </div>
    </div>
  );
}

function TenPullStack({
  results,
  currentIndex,
  revealed,
  exiting,
  remaining,
  locked,
  showHint,
  onReveal,
}: {
  results: GachaResult[];
  currentIndex: number;
  revealed: boolean;
  exiting: boolean;
  remaining: number;
  locked: boolean;
  showHint: boolean;
  onReveal: () => void;
}) {
  const current = results[currentIndex];
  const slime = SLIME_BY_ID[current.slimeId];
  const theme = RARITY_THEME[slime.rarity];
  const visibleStack = results.slice(currentIndex, currentIndex + 6);

  return (
    <div className="flex w-full min-h-0 flex-col items-center justify-center">
      <div className="mb-2.5 flex w-full max-w-[330px] items-center justify-between px-1 text-xs font-black text-[#668173] sm:mb-4 sm:max-w-md sm:text-sm">
        <span>{currentIndex + 1} / {results.length}</span>
        <span>剩下 {remaining} 張</span>
      </div>

      <div
        className={`relative aspect-[278/430] h-[min(48dvh,400px)] rounded-[28px] sm:h-[min(60dvh,480px)] ${theme.glow}`}
      >
        {visibleStack
          .slice(1)
          .reverse()
          .map((result, reverseIndex) => {
            const originalOffset = visibleStack.length - 1 - reverseIndex;
            const stackSlime = SLIME_BY_ID[result.slimeId];
            const visibleOffset = Math.min(originalOffset, 5);
            return (
              <div
                key={`${result.slimeId}-${currentIndex + originalOffset}`}
                className="pointer-events-none absolute inset-0 rounded-[28px] transition-transform duration-300"
                style={{
                  zIndex: visibleStack.length - originalOffset,
                  transform: `translateY(${visibleOffset * 4}px) scale(${1 - visibleOffset * 0.009})`,
                  transformOrigin: "center bottom",
                }}
              >
                <CardBack rarity={stackSlime.rarity} />
              </div>
            );
          })}

        <GestureSurface
          disabled={locked || revealed}
          onReveal={onReveal}
          ariaLabel={`揭開第 ${currentIndex + 1} 張卡片`}
          className={[
            "absolute inset-0 z-20 rounded-[28px] transition-[opacity,transform] duration-300",
            exiting
              ? "translate-y-12 scale-[0.94] opacity-20"
              : "translate-y-0 scale-100 opacity-100",
          ].join(" ")}
        >
          {revealed ? <CardFront result={current} /> : <CardBack rarity={slime.rarity} />}
          {showHint && <TapHint />}
        </GestureSurface>
      </div>
    </div>
  );
}

function GestureSurface({
  disabled,
  onReveal,
  ariaLabel,
  className,
  children,
}: {
  disabled: boolean;
  onReveal: () => void;
  ariaLabel: string;
  className: string;
  children: ReactNode;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    start.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || !start.current) return;
    const dx = event.clientX - start.current.x;
    const dy = event.clientY - start.current.y;
    start.current = null;

    const distance = Math.hypot(dx, dy);
    const swipe = Math.max(Math.abs(dx), Math.abs(dy)) >= 34;
    const tap = distance <= 14;
    if (tap || swipe) onReveal();
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        start.current = null;
      }}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onReveal();
        }
      }}
      className={`${className} touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-[#65d795] focus-visible:ring-offset-2`}
    >
      {children}
    </div>
  );
}

function TapHint() {
  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
      <div className="flex flex-col items-center gap-2 opacity-25">
        <div className="relative grid h-14 w-14 place-items-center">
          <span className="absolute inset-1 animate-ping rounded-full border-2 border-white/80" />
          <span className="relative text-3xl drop-shadow-sm">👆</span>
        </div>
        <span className="rounded-full bg-[#17372a]/70 px-3 py-1 text-[11px] font-black text-white">
          點一下或滑動
        </span>
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
    <div className="w-full max-w-4xl pb-4 pt-1">
      <div className="text-center">
        <div className="text-xl font-black text-[#17372a] sm:text-3xl">十連結果</div>
        <div className="mt-1 text-xs font-bold text-[#789083] sm:mt-2 sm:text-sm">
          {highRarity > 0
            ? `這次有 ${highRarity} 張 SR 以上`
            : "這次的史萊姆都收進圖鑑紀錄了"}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-5 sm:gap-3">
        {results.map((result, index) => {
          const slime = SLIME_BY_ID[result.slimeId];
          const theme = RARITY_THEME[slime.rarity];
          return (
            <article
              key={`${result.slimeId}-${index}`}
              className={`relative overflow-hidden rounded-[18px] border-2 bg-gradient-to-br p-2 shadow-sm sm:rounded-[20px] sm:p-2.5 ${theme.border} ${theme.soft}`}
            >
              {result.isNew && (
                <div className="absolute left-2 top-2 z-10 rounded-full bg-[#17372a] px-2 py-1 text-[9px] font-black text-white">
                  新角色
                </div>
              )}
              <div className="flex min-h-[82px] items-center justify-center sm:min-h-[120px]">
                <img
                  src={slime.image}
                  alt={slime.defaultName}
                  className="h-auto max-h-[88px] w-full object-contain sm:max-h-[130px]"
                />
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="min-w-0 truncate text-[10px] font-black text-[#294b39] sm:text-xs">
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

      <div className="mt-4 flex justify-center sm:mt-6">
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
        "absolute inset-0 overflow-hidden rounded-[28px] border-2 bg-[#17372a]",
        theme.border,
      ].join(" ")}
    >
      <img
        src="/gacha/card-back.png"
        alt="MedSlime 卡背"
        draggable={false}
        className="h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 rounded-[26px] ring-1 ring-inset ring-white/20" />
    </div>
  );
}

function CardFront({
  result,
  showReward = false,
}: {
  result: GachaResult;
  showReward?: boolean;
}) {
  const slime = SLIME_BY_ID[result.slimeId];
  const theme = RARITY_THEME[slime.rarity];

  return (
    <div
      className={[
        "absolute inset-0 overflow-hidden rounded-[28px] border-2 bg-gradient-to-br p-2.5 shadow-xl sm:p-3",
        theme.border,
        theme.soft,
      ].join(" ")}
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-[22px] border border-white/80 bg-white/65 p-3 sm:rounded-[24px] sm:p-4">
        <div className="absolute inset-x-8 top-12 h-28 rounded-full bg-white/80 blur-2xl sm:h-32" />
        <div className="relative z-10 flex items-center justify-between">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black sm:px-3 sm:text-[11px] ${theme.badge}`}>
            {slime.rarity}
          </span>
          {result.isNew && (
            <span className="rounded-full bg-[#17372a] px-2.5 py-1 text-[9px] font-black text-white sm:px-3 sm:text-[10px]">
              新角色
            </span>
          )}
        </div>
        <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center py-2 sm:py-3">
          <img
            src={slime.image}
            alt={slime.defaultName}
            draggable={false}
            className="h-auto max-h-[190px] w-full object-contain sm:max-h-[285px]"
          />
        </div>
        <div className="relative z-10 text-center">
          <div className="text-lg font-black text-[#17372a] sm:text-2xl">
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
    : "mx-auto mt-2 max-w-[220px] rounded-xl px-3 py-1.5 text-[11px] font-black sm:mt-3 sm:py-2 sm:text-xs";

  if (result.isNew) {
    return <div className={`${base} bg-[#eaf9f0] text-[#28754b]`}>新角色 · 已加入圖鑑</div>;
  }

  if (!result.duplicateReward) return null;

  return (
    <div className={`${base} bg-[#fff4d8] text-[#996719]`}>
      重複 · +{result.duplicateReward.amount} 金幣
    </div>
  );
}
