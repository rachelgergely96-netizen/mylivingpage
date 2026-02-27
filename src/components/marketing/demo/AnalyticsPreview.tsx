import { MOCK_ANALYTICS } from "./demo-data";
import { useAnimatedCounter } from "./useAnimatedCounter";

interface AnalyticsPreviewProps {
  isPro: boolean;
}

export default function AnalyticsPreview({ isPro }: AnalyticsPreviewProps) {
  const views = useAnimatedCounter(MOCK_ANALYTICS.views, 1200, isPro);
  const unique = useAnimatedCounter(MOCK_ANALYTICS.unique, 1200, isPro);
  const maxBar = Math.max(...MOCK_ANALYTICS.chartBars);

  return (
    <div className="relative overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(26,10,46,0.85)] p-4">
      {/* Lock overlay */}
      <div
        className={`absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-[rgba(11,8,20,0.72)] backdrop-blur-[4px] transition-opacity duration-500 ${isPro ? "pointer-events-none opacity-0" : "opacity-100"}`}
      >
        <span className="text-lg">&#x1F512;</span>
        <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#D4A654]">Pro &mdash; Page Analytics</span>
      </div>

      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#D4A654]">&#x1F4CA; This Week</span>
        <span className="font-mono text-[10px] text-[#5BD67C]">+23% &#x2191;</span>
      </div>

      {/* Stats */}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <p className="font-mono text-[9px] text-[rgba(245,240,235,0.3)]">Views</p>
          <p className="font-mono text-sm text-[#F5F0EB]">{isPro ? views.toLocaleString() : "???"}</p>
        </div>
        <div>
          <p className="font-mono text-[9px] text-[rgba(245,240,235,0.3)]">Unique</p>
          <p className="font-mono text-sm text-[#F5F0EB]">{isPro ? unique.toLocaleString() : "???"}</p>
        </div>
        <div>
          <p className="font-mono text-[9px] text-[rgba(245,240,235,0.3)]">Avg. Time</p>
          <p className="font-mono text-sm text-[#F5F0EB]">{isPro ? MOCK_ANALYTICS.avgTime : "???"}</p>
        </div>
        <div>
          <p className="font-mono text-[9px] text-[rgba(245,240,235,0.3)]">Top Section</p>
          <p className="font-mono text-sm text-[#F5F0EB]">{isPro ? MOCK_ANALYTICS.topSection : "—"}</p>
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-[3px]" style={{ height: 42 }}>
        {MOCK_ANALYTICS.chartBars.map((val, i) => (
          <div key={i} className="relative flex-1" style={{ height: "100%" }}>
            <div
              className="absolute bottom-0 w-full rounded-t-sm bg-[#D4A654] opacity-70 transition-all duration-700 ease-soft"
              style={{ height: isPro ? `${(val / maxBar) * 100}%` : "4%" }}
            />
          </div>
        ))}
      </div>

      {/* Referrals */}
      <div
        className={`flex gap-2 overflow-hidden border-t border-[rgba(255,255,255,0.04)] transition-all duration-500 ${isPro ? "mt-3 max-h-10 pt-3 opacity-100" : "mt-0 max-h-0 pt-0 opacity-0 border-0"}`}
      >
        {MOCK_ANALYTICS.referrals.map((r) => (
          <span key={r.label} className="rounded-md bg-[rgba(212,166,84,0.1)] px-2 py-0.5 font-mono text-[9px] text-[rgba(212,166,84,0.7)]">
            {r.label} {r.pct}
          </span>
        ))}
      </div>
    </div>
  );
}
