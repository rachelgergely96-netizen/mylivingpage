import { MOCK_ANALYTICS } from "./demo-data";
import { useAnimatedCounter } from "./useAnimatedCounter";

interface AnalyticsPreviewProps {
  isPro: boolean;
}

export default function AnalyticsPreview({ isPro }: AnalyticsPreviewProps) {
  const views = useAnimatedCounter(MOCK_ANALYTICS.views, 1200, true);
  const unique = useAnimatedCounter(MOCK_ANALYTICS.unique, 1200, true);
  const maxBar = Math.max(...MOCK_ANALYTICS.chartBars);

  return (
    <div className="relative overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.85)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.1em] ${
            isPro ? "text-[#3B82F6]" : "text-[#93C5FD]"
          }`}
        >
          &#x1F4CA; This Week
        </span>
        <span className="font-mono text-[10px] text-[#5BD67C]">+23% &#x2191;</span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <p className="font-mono text-[9px] text-[rgba(240,244,255,0.3)]">
            People looked
          </p>
          <p className="font-mono text-sm text-[#F0F4FF]">
            {views.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="font-mono text-[9px] text-[rgba(240,244,255,0.3)]">
            Opened your page
          </p>
          <p className="font-mono text-sm text-[#F0F4FF]">
            {unique.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="font-mono text-[9px] text-[rgba(240,244,255,0.3)]">
            Average reading
          </p>
          <p className="font-mono text-sm text-[#F0F4FF]">
            {MOCK_ANALYTICS.avgTime}
          </p>
        </div>
        <div>
          <p className="font-mono text-[9px] text-[rgba(240,244,255,0.3)]">
            Most looked at
          </p>
          <p className="font-mono text-sm text-[#F0F4FF]">
            {MOCK_ANALYTICS.topSection}
          </p>
        </div>
      </div>

      <div className="flex items-end gap-[3px]" style={{ height: 42 }}>
        {MOCK_ANALYTICS.chartBars.map((value, index) => (
          <div key={index} className="relative flex-1" style={{ height: "100%" }}>
            <div
              className="absolute bottom-0 w-full rounded-t-sm bg-[#3B82F6] opacity-70 transition-all duration-700 ease-soft"
              style={{ height: `${(value / maxBar) * 100}%` }}
            />
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2 overflow-hidden border-t border-[rgba(255,255,255,0.04)] pt-3">
        {MOCK_ANALYTICS.referrals.map((referral) => (
          <span
            key={referral.label}
            className="rounded-md bg-[rgba(59,130,246,0.1)] px-2 py-0.5 font-mono text-[9px] text-[rgba(59,130,246,0.7)]"
          >
            {referral.label} {referral.pct}
          </span>
        ))}
      </div>
    </div>
  );
}
