const JOURNEY_OUTPUTS = [
  {
    number: "01",
    title: "Living resume",
    body: "A polished page at one link you can keep current.",
  },
  {
    number: "02",
    title: "ATS-ready PDF",
    body: "A clean, machine-readable file for formal applications.",
  },
  {
    number: "03",
    title: "Share card + QR",
    body: "A visual card that sends people straight to your page.",
  },
] as const;

export function ProductJourneyPreview() {
  return (
    <div
      data-testid="product-journey-preview"
      className="relative overflow-hidden rounded-[1.75rem] border border-[rgba(147,197,253,0.18)] bg-[rgba(5,13,26,0.72)] p-4 shadow-[0_28px_90px_rgba(2,6,23,0.48)] sm:p-5"
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.24),transparent_68%)]" />
      <div className="relative flex items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.08)] pb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#93C5FD]">
            Your career story
          </p>
          <p className="mt-1 font-heading text-xl font-bold text-[#F0F4FF] sm:text-2xl">
            Enter it once. Use it three ways.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-[rgba(74,222,128,0.22)] bg-[rgba(74,222,128,0.08)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#86EFAC]">
          Private draft
        </span>
      </div>

      <div className="relative mt-4 space-y-3">
        {JOURNEY_OUTPUTS.map((output, index) => (
          <div
            key={output.title}
            className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border px-4 py-3.5 transition-transform duration-300 ease-soft hover:translate-x-1 ${
              index === 0
                ? "border-[rgba(59,130,246,0.28)] bg-[rgba(59,130,246,0.12)]"
                : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.035)]"
            }`}
          >
            <span className="font-mono text-[10px] text-[rgba(147,197,253,0.72)]">
              {output.number}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#F0F4FF]">{output.title}</p>
              <p className="mt-1 text-xs leading-5 text-[rgba(240,244,255,0.58)]">
                {output.body}
              </p>
            </div>
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(147,197,253,0.18)] text-sm text-[#93C5FD]"
            >
              &#10003;
            </span>
          </div>
        ))}
      </div>

      <div className="relative mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.025)] px-4 py-3 text-[11px] text-[rgba(240,244,255,0.5)]">
        <span>No AI required</span>
        <span className="hidden h-1 w-1 rounded-full bg-[rgba(147,197,253,0.5)] sm:block" />
        <span>Nothing publishes until you choose</span>
      </div>
    </div>
  );
}
