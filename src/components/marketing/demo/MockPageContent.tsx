import { MOCK_PERSON, VIEW_BIOS, type ViewMode } from "./demo-data";

interface MockPageContentProps {
  isPro: boolean;
  viewMode: ViewMode;
}

export default function MockPageContent({ isPro, viewMode }: MockPageContentProps) {
  const isRecruiter = isPro && viewMode === "recruiter";

  return (
    <div className="relative z-10 px-4 py-5 sm:p-6">
      {/* Page header */}
      <div className="mb-4 flex items-center justify-between">
        <span className={`font-mono text-[10px] uppercase tracking-[0.16em] transition-colors duration-500 ${isPro ? "text-[#D4A654]" : "text-[rgba(245,240,235,0.3)]"}`}>
          {isPro ? "RAYSMITH.PAGE" : "MYLIVINGPAGE"}
        </span>
        <span className={`font-mono text-[10px] text-[rgba(245,240,235,0.3)] transition-all duration-500 ${isPro ? "opacity-100" : "opacity-0"}`}>
          Updated 14x &middot; 2,847 views
        </span>
      </div>

      {/* Badges */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {MOCK_PERSON.badges.map((badge) => (
          <span
            key={badge}
            className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] text-[rgba(212,166,84,0.8)] transition-all duration-500 ${isPro ? "border-[rgba(212,166,84,0.3)] shadow-[0_0_8px_rgba(212,166,84,0.12)]" : "border-[rgba(212,166,84,0.12)]"}`}
          >
            {badge}
          </span>
        ))}
      </div>

      {/* Name */}
      <h3
        className="mb-2 font-heading font-light text-[#F5F0EB] transition-all duration-400"
        style={{ fontSize: isRecruiter ? 24 : 28 }}
      >
        {MOCK_PERSON.name}
      </h3>

      {/* Bio */}
      <p className="mb-4 max-w-md text-sm font-light leading-relaxed text-[rgba(245,240,235,0.78)] transition-all duration-500">
        {VIEW_BIOS[isPro ? viewMode : "story"]}
      </p>

      {/* Open To (recruiter mode only) */}
      <div
        className={`mb-4 overflow-hidden rounded-lg border border-[rgba(91,214,124,0.15)] bg-[rgba(91,214,124,0.08)] font-mono text-[11px] text-[#5BD67C] transition-all duration-500 ${isRecruiter ? "max-h-12 px-3 py-2.5 opacity-100" : "max-h-0 px-3 py-0 opacity-0 border-0"}`}
      >
        &#x2713; {MOCK_PERSON.openTo}
      </div>

      {/* Divider */}
      <div className="mb-4 h-px bg-gradient-to-r from-transparent via-[#D4A654] to-transparent" />

      {/* What I'm Focused On */}
      <div className="mb-4">
        <p className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#D4A654]">
          <span className="inline-block h-px w-3 bg-[#D4A654]" />
          What I&apos;m Focused On Now
        </p>
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(255,255,255,0.03)] to-[rgba(45,27,78,0.3)] p-4">
          {MOCK_PERSON.focus.map((item) => (
            <div key={item} className="mb-2 flex gap-2.5 last:mb-0">
              <span className="shrink-0 font-mono text-sm text-[#D4A654]">&rarr;</span>
              <span className="text-[13px] leading-relaxed text-[#F5F0EB]">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Projects */}
      <div className="mb-4">
        <p className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#D4A654]">
          <span className="inline-block h-px w-3 bg-[#D4A654]" />
          Currently Building
        </p>
        {MOCK_PERSON.projects.map((proj) => (
          <div key={proj.name} className="mb-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-3.5">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-[#F5F0EB]">{proj.name}</span>
              <span className="rounded-lg bg-[rgba(91,214,124,0.08)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-[#5BD67C]">
                {proj.status}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[rgba(245,240,235,0.5)]">{proj.desc}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-[rgba(255,255,255,0.08)] pt-4 text-center">
        {isPro ? (
          <p className="font-mono text-[10px] text-[rgba(245,240,235,0.3)]">raysmith.page</p>
        ) : (
          <>
            <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[rgba(245,240,235,0.3)]">
              This is a MyLivingPage
            </p>
            <p className="mb-2 text-xs text-[rgba(245,240,235,0.4)]">Your story deserves more than a resume.</p>
            <span className="inline-block rounded-full border border-[rgba(212,166,84,0.4)] px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#D4A654]">
              Create Your Own &rarr;
            </span>
          </>
        )}
      </div>
    </div>
  );
}
