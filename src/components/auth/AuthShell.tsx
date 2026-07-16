import Link from "next/link";
import { ProfilePanel, ProfileWindow } from "@/components/ui/ProfilePanel";

const ONBOARDING_STEPS = [
  {
    number: "01",
    title: "Add your details",
    body: "Follow six short, skippable sections. No AI reads your resume.",
  },
  {
    number: "02",
    title: "Preview and check",
    body: "Choose a look and review practical ATS-readiness guidance.",
  },
  {
    number: "03",
    title: "Publish and share",
    body: "Use your link, PDF, and share card whenever you need them.",
  },
] as const;

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function AuthShell({ eyebrow, title, description, children }: AuthShellProps) {
  return (
    <main className="profile-shell relative min-h-screen overflow-hidden px-4 py-5 sm:px-6 sm:py-8 lg:flex lg:items-center lg:py-10">
      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <div className="mb-5 flex items-center justify-between sm:mb-7">
          <Link href="/" className="font-heading text-xl font-bold text-[#F0F4FF] sm:text-2xl">
            my<span className="text-[#60A5FA]">living</span>page
          </Link>
          <Link
            href="/"
            className="profile-action text-[11px] uppercase tracking-[0.14em]"
          >
            Back home
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.02fr)_minmax(420px,0.98fr)] lg:gap-7">
          <ProfileWindow
            as="aside"
            title="New member profile"
            status={<span className="profile-status">Ready to build</span>}
            className="hidden lg:block"
            contentClassName="p-6 xl:p-7"
          >
            <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-start gap-5">
              <div className="profile-avatar-frame flex aspect-square items-center justify-center bg-[linear-gradient(145deg,#1d4ed8,#071427)]">
                <span className="font-heading text-3xl font-bold text-[#EFF6FF]">MLP</span>
              </div>
              <div className="min-w-0">
                <p className="profile-status">Profile waiting for you</p>
                <h2 className="mt-3 font-heading text-3xl font-bold leading-[1.05] text-[#F0F4FF] xl:text-4xl">
                  Your corner of the professional web.
                </h2>
                <p className="mt-3 text-sm leading-6 text-[rgba(240,244,255,0.62)]">
                  Build one living profile, keep it current, and share the same link wherever your work takes you.
                </p>
              </div>
            </div>

            <div className="profile-meta-grid mt-6 rounded-lg border border-[rgba(255,255,255,0.07)] bg-[rgba(3,10,23,0.34)]">
              <span className="profile-meta-label">Profile URL</span>
              <span className="profile-meta-value">mylivingpage.com/your-name</span>
              <span className="profile-meta-label">Visibility</span>
              <span className="profile-meta-value">Private until you publish</span>
              <span className="profile-meta-label">AI processing</span>
              <span className="profile-meta-value">None</span>
              <span className="profile-meta-label">Cost</span>
              <span className="profile-meta-value">Free from start to finish</span>
            </div>

            <ProfilePanel
              title="Set up your profile"
              meta="3 quick steps"
              className="mt-6"
              contentClassName="p-0"
            >
              <ol className="divide-y divide-[rgba(255,255,255,0.07)]">
                {ONBOARDING_STEPS.map((step) => (
                  <li key={step.title} className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 px-4 py-3.5">
                    <span className="font-mono text-[11px] text-[#93C5FD]">{step.number}</span>
                    <div>
                      <p className="text-sm font-semibold text-[#F0F4FF]">{step.title}</p>
                      <p className="mt-1 text-xs leading-5 text-[rgba(240,244,255,0.55)]">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </ProfilePanel>
          </ProfileWindow>

          <ProfileWindow
            title={eyebrow}
            status={<span className="profile-status">Private workspace</span>}
            contentClassName="p-5 sm:p-7 lg:p-8"
          >
            <div className="mb-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[rgba(240,244,255,0.5)] lg:hidden">
              <span className="text-[#93C5FD]">Build</span>
              <span aria-hidden="true">&#8594;</span>
              <span>Preview</span>
              <span aria-hidden="true">&#8594;</span>
              <span>Share</span>
            </div>
            <h1 className="font-heading text-3xl font-bold leading-[1.08] tracking-[-0.02em] text-[#F0F4FF] sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[rgba(240,244,255,0.62)]">
              {description}
            </p>
            <div className="mt-6">{children}</div>
          </ProfileWindow>
        </div>
      </div>
    </main>
  );
}
