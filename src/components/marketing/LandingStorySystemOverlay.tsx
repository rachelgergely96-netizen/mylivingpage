interface LandingStorySystemOverlayProps {
  active: boolean;
}

const READABLE_FIELDS = [
  ["Name", "Avery Sample"],
  ["Current title", "Senior Full-Stack Engineer"],
  ["Experience", "8 years"],
  ["Skills", "TypeScript · SQL · React"],
  ["Education", "B.S. Computer Science"],
] as const;

export function LandingStorySystemOverlay({ active }: LandingStorySystemOverlayProps) {
  return (
    <div
      aria-hidden={!active}
      data-testid="story-system-preview"
      className={`story-system-layer absolute inset-3 z-30 flex items-center justify-center sm:inset-6 ${
        active ? "is-active" : ""
      }`}
    >
      <div
        role="region"
        aria-label="How software reads this page"
        tabIndex={active ? 0 : -1}
        data-testid="story-system-card"
        className="relative max-h-full w-full max-w-lg overflow-y-auto overscroll-contain rounded-[1.45rem] border border-[rgba(147,197,253,0.24)] bg-[rgba(4,11,23,0.9)] p-3 shadow-[0_28px_80px_rgba(2,6,23,0.6)] sm:p-5"
      >
        <div aria-hidden="true" className="story-scan-line" />
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#93C5FD] sm:text-[10px]">
              What software can read
            </p>
            <p className="mt-1 text-xs font-semibold text-[#F0F4FF] sm:text-sm">
              Clear fields. Searchable details.
            </p>
          </div>
          <span className="rounded-full border border-[rgba(91,214,124,0.26)] bg-[rgba(91,214,124,0.1)] px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-[#86EFAC] sm:text-[9px]">
            Readable
          </span>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-1.5 sm:mt-4 sm:gap-2">
          {READABLE_FIELDS.map(([label, value]) => (
            <div
              key={label}
              className="min-w-0 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.035)] px-2 py-1.5 sm:px-3 sm:py-2"
            >
              <dt className="truncate text-[7px] uppercase tracking-[0.12em] text-[rgba(240,244,255,0.38)] sm:text-[9px] sm:tracking-[0.15em]">
                {label}
              </dt>
              <dd className="mt-0.5 truncate text-[9px] font-medium text-[rgba(240,244,255,0.82)] sm:mt-1 sm:text-xs">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-2 rounded-xl border border-[rgba(229,183,107,0.22)] bg-[rgba(229,183,107,0.07)] p-2 sm:mt-4 sm:p-3">
          <p className="text-[8px] uppercase tracking-[0.16em] text-[#F5D7A2] sm:text-[9px]">Example AI-assisted search</p>
          <p className="mt-1 text-[9px] leading-4 text-[#F0F4FF] sm:mt-1.5 sm:text-xs sm:leading-5">
            “Find a senior engineer with TypeScript, SQL, and large-scale systems experience.”
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1 sm:mt-2 sm:gap-1.5">
            {["Senior engineer", "TypeScript", "SQL", "2M+ requests/day"].map((match) => (
              <span
                key={match}
                className="rounded-full border border-[rgba(91,214,124,0.2)] bg-[rgba(91,214,124,0.08)] px-1.5 py-0.5 text-[7px] text-[#86EFAC] sm:px-2 sm:text-[9px]"
              >
                {match}
              </span>
            ))}
          </div>
        </div>

        <p className="mt-2 text-[8px] leading-4 text-[rgba(240,244,255,0.4)] sm:mt-3 sm:text-[9px]">
          Searchability means giving systems clear information to recognize—not gaming a ranking.
        </p>
      </div>
    </div>
  );
}
