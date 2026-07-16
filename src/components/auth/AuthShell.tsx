import Link from "next/link";

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
    <main className="relative min-h-screen overflow-hidden px-4 py-5 sm:px-6 sm:py-8 lg:flex lg:items-center lg:py-10">
      <div className="pointer-events-none absolute left-[-12rem] top-[-12rem] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.15),transparent_66%)]" />
      <div className="pointer-events-none absolute bottom-[-16rem] right-[-10rem] h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,rgba(147,197,253,0.1),transparent_68%)]" />

      <div className="relative mx-auto w-full max-w-6xl">
        <div className="mb-5 flex items-center justify-between sm:mb-7">
          <Link href="/" className="font-heading text-xl font-bold text-[#F0F4FF] sm:text-2xl">
            my<span className="text-[#60A5FA]">living</span>page
          </Link>
          <Link
            href="/"
            className="rounded-full border border-[rgba(255,255,255,0.12)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(240,244,255,0.62)] transition-colors hover:border-[rgba(96,165,250,0.36)] hover:text-[#BFDBFE]"
          >
            Back home
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.02fr)_minmax(420px,0.98fr)] lg:gap-7">
          <aside className="hidden overflow-hidden rounded-[2rem] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(145deg,rgba(20,39,64,0.72),rgba(7,17,32,0.8))] p-8 shadow-[0_30px_100px_rgba(2,6,23,0.34)] lg:block xl:p-10">
            <p className="inline-flex rounded-full border border-[rgba(96,165,250,0.24)] bg-[rgba(59,130,246,0.1)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#BFDBFE]">
              Free from start to finish
            </p>
            <h2 className="mt-5 max-w-xl font-heading text-4xl font-bold leading-[1.04] tracking-[-0.03em] text-[#F0F4FF] xl:text-5xl">
              From a blank account to a link you can send.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[rgba(240,244,255,0.64)]">
              Your draft stays private while you build. You decide when it is ready to go live.
            </p>

            <ol className="mt-8 space-y-3">
              {ONBOARDING_STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className={`grid grid-cols-[auto_minmax(0,1fr)] gap-4 rounded-2xl border p-4 ${
                    index === 0
                      ? "border-[rgba(59,130,246,0.28)] bg-[rgba(59,130,246,0.11)]"
                      : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.025)]"
                  }`}
                >
                  <span className="font-mono text-[11px] text-[#93C5FD]">{step.number}</span>
                  <div>
                    <p className="text-sm font-semibold text-[#F0F4FF]">{step.title}</p>
                    <p className="mt-1 text-xs leading-5 text-[rgba(240,244,255,0.55)]">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </aside>

          <section className="glass-card rounded-[2rem] p-5 shadow-[0_30px_100px_rgba(2,6,23,0.3)] sm:p-7 lg:p-8">
            <div className="mb-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[rgba(240,244,255,0.5)] lg:hidden">
              <span className="text-[#93C5FD]">Build</span>
              <span aria-hidden="true">&#8594;</span>
              <span>Preview</span>
              <span aria-hidden="true">&#8594;</span>
              <span>Share</span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#60A5FA]">
              {eyebrow}
            </p>
            <h1 className="mt-3 font-heading text-3xl font-bold leading-[1.08] tracking-[-0.02em] text-[#F0F4FF] sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[rgba(240,244,255,0.62)]">
              {description}
            </p>
            <div className="mt-6">{children}</div>
          </section>
        </div>
      </div>
    </main>
  );
}
