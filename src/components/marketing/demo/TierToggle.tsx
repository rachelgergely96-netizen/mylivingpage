interface TierToggleProps {
  isPro: boolean;
  onToggle: () => void;
}

export default function TierToggle({ isPro, onToggle }: TierToggleProps) {
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      <button
        type="button"
        onClick={() => !isPro || onToggle()}
        className={`font-mono text-[11px] uppercase tracking-[0.1em] transition-all duration-300 ${isPro ? "text-[rgba(240,244,255,0.5)]" : "text-[#3B82F6]"}`}
      >
        Free
      </button>

      <button
        type="button"
        onClick={onToggle}
        className={`relative h-7 w-14 rounded-full border transition-all duration-500 ${isPro ? "border-[rgba(59,130,246,0.4)] bg-[rgba(59,130,246,0.15)]" : "border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)]"}`}
      >
        <span
          className={`absolute top-[2px] h-[22px] w-[22px] rounded-full transition-all duration-500 ${isPro ? "left-[30px] bg-[#3B82F6] shadow-[0_0_14px_rgba(59,130,246,0.5)]" : "left-[2px] bg-[rgba(240,244,255,0.35)]"}`}
          style={{ transitionTimingFunction: "cubic-bezier(0.68, -0.55, 0.27, 1.55)" }}
        />
      </button>

      <button
        type="button"
        onClick={() => isPro || onToggle()}
        className={`font-mono text-[11px] uppercase tracking-[0.1em] transition-all duration-300 ${isPro ? "text-[#3B82F6]" : "text-[rgba(240,244,255,0.5)]"}`}
      >
        Pro &mdash; $9/mo
      </button>
    </div>
  );
}
