interface ShareCardPreviewProps {
  isPro: boolean;
}

export default function ShareCardPreview({ isPro }: ShareCardPreviewProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(26,10,46,0.85)] p-4">
      {/* Lock overlay */}
      <div
        className={`absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-[rgba(11,8,20,0.72)] backdrop-blur-[4px] transition-opacity duration-500 ${isPro ? "pointer-events-none opacity-0" : "opacity-100"}`}
      >
        <span className="text-lg">&#x1F512;</span>
        <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#D4A654]">Pro &mdash; Share &amp; Export</span>
      </div>

      <p className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#D4A654]">
        <span className="inline-block h-px w-3 bg-[#D4A654]" />
        Auto-Generated Share Card
      </p>

      {/* Preview card */}
      <div className="relative overflow-hidden rounded-lg border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(30,23,48,1)] to-[rgba(11,8,20,1)] p-5">
        <div className="pointer-events-none absolute -right-[30%] -top-[50%] h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(212,168,83,0.08),transparent)]" />
        <p className="relative mb-1.5 font-heading text-xl font-light text-[#F5F0EB]">Ray Smith</p>
        <p className="relative mb-3 text-xs text-[rgba(245,240,235,0.5)]">Attorney &middot; Founder &middot; Designer &middot; Builder</p>
        <div className="relative mb-3 flex flex-wrap gap-1.5">
          {["LiveCardStudio", "BarPrepPlay", "Legal × Tech"].map((tag) => (
            <span key={tag} className="rounded-full border border-[rgba(255,255,255,0.08)] px-2.5 py-0.5 font-mono text-[9px] text-[rgba(212,166,84,0.7)]">
              {tag}
            </span>
          ))}
        </div>
        <p className="relative font-mono text-[10px] text-[rgba(212,166,84,0.6)]">raysmith.page</p>
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="rounded-md border border-[rgba(212,166,84,0.4)] bg-[rgba(212,166,84,0.1)] px-3 py-1.5 font-mono text-[10px] text-[#D4A654]">
          Copy Link
        </button>
        <button type="button" className="rounded-md border border-[rgba(255,255,255,0.08)] px-3 py-1.5 font-mono text-[10px] text-[rgba(245,240,235,0.3)]">
          Share on LinkedIn
        </button>
        <button type="button" className="rounded-md border border-[rgba(255,255,255,0.08)] px-3 py-1.5 font-mono text-[10px] text-[rgba(245,240,235,0.3)]">
          Download PNG
        </button>
      </div>
    </div>
  );
}
