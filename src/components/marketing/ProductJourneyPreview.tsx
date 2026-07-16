import { ProfilePanel, ProfileWindow } from "@/components/ui/ProfilePanel";

const JOURNEY_OUTPUTS = [
  { number: "01", title: "Living resume", detail: "One link that stays current" },
  { number: "02", title: "ATS-ready PDF", detail: "Built for formal applications" },
  { number: "03", title: "Share card + QR", detail: "Made for introductions" },
] as const;

export function ProductJourneyPreview() {
  return (
    <ProfileWindow
      title="Sample profile // private draft"
      status={<span className="profile-status text-[#86EFAC]">ready</span>}
      contentClassName="p-3 sm:p-4"
    >
      <div data-testid="product-journey-preview" className="grid gap-3 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
        <div>
          <div className="profile-avatar-frame aspect-square bg-[radial-gradient(circle_at_32%_22%,#F9A8D4_0%,#818CF8_38%,#172554_100%)] p-3">
            <div className="flex h-full items-end rounded-sm border border-white/20 bg-[linear-gradient(155deg,rgba(255,255,255,0.2),rgba(2,6,23,0.28))] p-3">
              <span className="font-heading text-4xl font-bold text-white drop-shadow-lg">MC</span>
            </div>
          </div>
          <p className="mt-3 break-all font-mono text-[11px] text-[#93C5FD]">@maya-chen</p>
          <p className="mt-1 text-xs leading-5 text-[rgba(240,244,255,0.62)]">
            Product designer<br />Brooklyn, NY
          </p>
        </div>

        <div className="min-w-0 space-y-3">
          <ProfilePanel title="About me" contentClassName="p-3">
            <p className="font-heading text-xl font-bold text-[#F0F4FF]">
              Enter it once. Use it three ways.
            </p>
            <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.67)]">
              A personal corner of the internet for the work, proof, and contact details a resume
              cannot show on its own.
            </p>
          </ProfilePanel>

          <ProfilePanel title="From one profile" meta="3 outputs" contentClassName="divide-y divide-[rgba(147,197,253,0.12)]">
            {JOURNEY_OUTPUTS.map((output) => (
              <div key={output.title} className="grid grid-cols-[1.8rem_minmax(0,1fr)] gap-2 px-3 py-2.5">
                <span className="font-mono text-[10px] text-[#60A5FA]">{output.number}</span>
                <div>
                  <p className="text-xs font-semibold text-[#F0F4FF]">{output.title}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-[rgba(240,244,255,0.52)]">
                    {output.detail}
                  </p>
                </div>
              </div>
            ))}
          </ProfilePanel>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[rgba(147,197,253,0.14)] pt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-[rgba(240,244,255,0.58)]">
        <span>No AI required</span>
        <span>Private until you choose Publish.</span>
      </div>
    </ProfileWindow>
  );
}
