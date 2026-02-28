import dynamic from "next/dynamic";
import Link from "next/link";
import SiteLegalFooter from "@/components/legal/SiteLegalFooter";
import { getRequestLegalSite } from "@/lib/legal/request-site";
import CosmicBackground from "@/components/marketing/CosmicBackground";
import WaitlistForm from "@/components/marketing/WaitlistForm";

const FreeProDemo = dynamic(() => import("@/components/marketing/demo/FreeProDemo"), {
  ssr: false,
  loading: () => <div className="h-[600px]" />,
});

const features = [
  { icon: "✦", title: "Living Backgrounds", copy: "Procedural art systems that move and breathe behind your story." },
  { icon: "◈", title: "AI Resume Structuring", copy: "Paste raw resume text and get polished, structured profile sections instantly." },
  { icon: "⬡", title: "Instant Hosting", copy: "Publish at mylivingpage.com/{username} without manual deployment work." },
  { icon: "◉", title: "Theme Engine", copy: "Choose from cosmic, fluid, monolith, aurora, and more live algorithmic styles." },
  { icon: "△", title: "Built to Share", copy: "Drop your page in applications, outreach, networking, and social bios." },
  { icon: "☉", title: "ATS Companion", copy: "Keep your static resume and a premium living page in one workflow." },
];

export default function LandingPage() {
  const site = getRequestLegalSite();

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden">
      <CosmicBackground />
      <div className="relative z-10">
        <header className="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.72)] backdrop-blur-xl">
          <nav className="mx-auto flex h-16 sm:h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 md:px-10">
            <div className="font-heading text-xl sm:text-2xl font-bold text-[#F0F4FF]">
              my<span className="text-[#3B82F6]">living</span>page
            </div>
            <div className="hidden items-center gap-8 text-xs uppercase tracking-[0.18em] text-[rgba(240,244,255,0.6)] md:flex">
              <a href="#features" className="transition-colors hover:text-[#93C5FD]">
                Features
              </a>
              <a href="#how" className="transition-colors hover:text-[#93C5FD]">
                How
              </a>
              <a href="#demo" className="transition-colors hover:text-[#93C5FD]">
                Demo
              </a>
              <a href="#waitlist" className="transition-colors hover:text-[#93C5FD]">
                Waitlist
              </a>
              <Link href="/examples" className="transition-colors hover:text-[#93C5FD]">
                Examples
              </Link>
            </div>
            <Link
              href="/signup"
              className="gold-pill px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_8px_28px_rgba(59,130,246,0.3)]"
            >
              Start
            </Link>
          </nav>
        </header>

        <main>
          <section className="relative mx-auto flex min-h-[88vh] w-full max-w-7xl flex-col items-center justify-center px-4 py-16 sm:px-6 sm:py-24 text-center md:px-10">
            <div className="relative rounded-3xl border border-[rgba(255,255,255,0.06)] bg-[rgba(10,22,40,0.55)] px-6 py-12 backdrop-blur-xl sm:px-10 sm:py-16">
              <p className="mb-8 inline-block rounded-full border border-[rgba(59,130,246,0.25)] bg-[rgba(59,130,246,0.1)] px-5 py-2 text-xs uppercase tracking-[0.22em] text-[#93C5FD]">
                &#10023; Pre-Launch Access
              </p>
              <h1 className="max-w-5xl font-heading text-3xl sm:text-5xl font-bold leading-[1.06] tracking-[-0.03em] text-[#F0F4FF] md:text-7xl">
                Your resume, <span className="text-[#3B82F6] italic">alive</span>.
              </h1>
              <p className="mx-auto mt-6 sm:mt-8 max-w-2xl text-base sm:text-lg font-light leading-7 sm:leading-8 text-[rgba(240,244,255,0.78)]">
                MyLivingPage turns static resumes into living digital identity pages with algorithmic art themes and AI-structured storytelling.
              </p>
              <div className="mt-8 sm:mt-11 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/signup"
                  className="gold-pill px-6 py-3 sm:px-8 sm:py-4 text-sm font-semibold transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:shadow-[0_14px_42px_rgba(59,130,246,0.38)]"
                >
                  Create My Page
                </Link>
                <Link
                  href="/examples"
                  className="rounded-full border border-[rgba(255,255,255,0.18)] px-6 py-3 sm:px-8 sm:py-4 text-sm text-[rgba(240,244,255,0.75)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
                >
                  See Examples
                </Link>
              </div>
            </div>
          </section>

          <section id="features" className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 md:px-10">
            <div className="mb-8 sm:mb-12 mx-auto w-fit rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(10,22,40,0.55)] px-8 py-5 text-center backdrop-blur-xl">
              <p className="mb-3 text-xs uppercase tracking-[0.22em] text-[#3B82F6]">Core Features</p>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#F0F4FF] md:text-5xl">A page that breathes</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.5)] p-6 backdrop-blur-xl transition-all duration-300 ease-soft hover:-translate-y-1 hover:border-[rgba(59,130,246,0.25)]"
                >
                  <p className="mb-4 text-2xl text-[#3B82F6]">{feature.icon}</p>
                  <h3 className="mb-2 font-heading text-2xl text-[#F0F4FF]">{feature.title}</h3>
                  <p className="text-sm leading-7 text-[rgba(240,244,255,0.58)]">{feature.copy}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="how" className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 md:px-10">
            <div className="rounded-2xl sm:rounded-3xl border border-[rgba(255,255,255,0.06)] bg-[rgba(10,22,40,0.55)] p-5 sm:p-8 md:p-12 backdrop-blur-xl">
              <p className="mb-4 text-center text-xs uppercase tracking-[0.22em] text-[#3B82F6]">How It Works</p>
              <h2 className="text-center font-heading text-3xl sm:text-4xl font-bold text-[#F0F4FF] drop-shadow-[0_2px_16px_rgba(0,0,0,0.6)] md:text-5xl">Three steps to live</h2>
              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {[
                  ["01", "Paste your resume", "Drop your resume text. AI extracts structure, skills, and highlights."],
                  ["02", "Pick a living theme", "Choose from curated algorithmic art themes with live previews."],
                  ["03", "Publish your page", "Go live at mylivingpage.com/{username} and share instantly."],
                ].map(([num, title, body]) => (
                  <article key={num} className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-6">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#3B82F6] font-mono text-lg text-[#3B82F6]">
                      {num}
                    </div>
                    <h3 className="mb-2 font-heading text-2xl text-[#F0F4FF]">{title}</h3>
                    <p className="text-sm leading-7 text-[rgba(240,244,255,0.55)]">{body}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <FreeProDemo />

          <section id="waitlist" className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 sm:py-20 text-center md:px-10">
            <div className="rounded-3xl border border-[rgba(255,255,255,0.06)] bg-[rgba(10,22,40,0.55)] px-6 py-10 backdrop-blur-xl sm:px-10 sm:py-14">
              <p className="mb-4 text-xs uppercase tracking-[0.22em] text-[#3B82F6]">Early Access</p>
              <h2 className="font-heading text-3xl sm:text-5xl font-bold leading-tight text-[#F0F4FF] md:text-6xl">
                Make them <span className="text-[#3B82F6] italic">remember</span> you
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-[rgba(240,244,255,0.58)]">
                Join the waitlist for launch access and priority onboarding into the MyLivingPage MVP.
              </p>
              <WaitlistForm />
            </div>
          </section>
        </main>

        <SiteLegalFooter siteId={site.id} />
      </div>
    </div>
  );
}


