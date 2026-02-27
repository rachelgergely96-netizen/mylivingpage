import { COMPARISON_FEATURES } from "./demo-data";

export default function ComparisonTable() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)]" style={{ background: "rgba(11,8,20,0.6)" }}>
      {/* Header */}
      <div className="border-b border-[rgba(255,255,255,0.08)] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#D4A654]">
        Feature Comparison
      </div>

      {/* Rows */}
      {COMPARISON_FEATURES.map((item, i) => (
        <div
          key={item.feature}
          className="flex items-center border-b border-[rgba(212,166,84,0.04)] px-5 py-2.5 transition-colors hover:bg-[rgba(139,109,181,0.04)]"
          style={{ background: i % 2 === 1 ? "rgba(139,109,181,0.02)" : "transparent" }}
        >
          <span className="flex-1 text-[12.5px] text-[rgba(245,240,235,0.55)]">{item.feature}</span>
          <span className="w-14 text-center font-mono text-[13px]" style={{ color: item.free ? "#5BD67C" : "rgba(245,240,235,0.15)" }}>
            {item.free ? "\u2713" : "\u2014"}
          </span>
          <span className="w-14 text-center font-mono text-[13px]" style={{ color: item.pro ? "#D4A654" : "rgba(245,240,235,0.15)" }}>
            {item.pro ? "\u2713" : "\u2014"}
          </span>
        </div>
      ))}

      {/* Footer labels */}
      <div className="flex border-t border-[rgba(255,255,255,0.08)] px-5 py-2.5">
        <span className="flex-1" />
        <span className="w-14 text-center font-mono text-[9px] uppercase tracking-[0.1em] text-[rgba(245,240,235,0.3)]">Free</span>
        <span className="w-14 text-center font-mono text-[9px] uppercase tracking-[0.1em] text-[#D4A654]">Pro</span>
      </div>
    </div>
  );
}
