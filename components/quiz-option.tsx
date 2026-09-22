"use client";

export default function QuizOption({ label, text, selected, excluded, onSelect, onExclude }: {
  label: string; text: string; selected: boolean; excluded: boolean;
  onSelect: () => void; onExclude: () => void;
}) {
  return (
    <div className={`flex overflow-hidden rounded-xl border ${selected ? "border-[#247451] bg-[#edf8f1]" : "border-[#dfe8e2] bg-white"}`}>
      <button type="button" aria-pressed={selected} onClick={onSelect}
        className="flex min-w-0 flex-1 items-start gap-3 p-4 text-left text-sm leading-6 text-[#315b45] hover:bg-[#f1f8f3] sm:text-base">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${selected ? "border-[#247451] bg-[#247451] text-white" : "border-[#b8c9bf]"}`}>{label}</span>
        <span className={excluded ? "line-through opacity-60" : ""}>{text}</span>
      </button>
      <button type="button" onClick={onExclude} aria-pressed={excluded}
        aria-label={`${excluded ? "取消排除" : "排除"}選項 ${label}`}
        className="min-w-12 shrink-0 border-l border-[#dfe8e2] px-2 text-xs font-medium text-[#60786c] hover:bg-[#edf3ef]">
        {excluded ? "取消排除" : "排除"}
      </button>
    </div>
  );
}
