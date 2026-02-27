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
        <header className="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(26,10,46,0.72)] backdrop-blur-xl">
          <nav className="mx-auto flex h-16 sm:h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 md:px-10">
            <div className="font-heading text-xl sm:text-2xl font-bold text-[#F5F0EB]">
              my<span className="text-[#D4A654]">living</span>page
            </div>
            <div className="hidden items-center gap-8 text-xs uppercase tracking-[0.18em] text-[rgba(245,240,235,0.6)] md:flex">
              <a href="#features" className="transition-colors hover:text-[#F0D48A]">
                Features
              </a>
              <a href="#how" className="transition-colors hover:text-[#F0D48A]">
                How
              </a>
              <a href="#demo" className="transition-colors hover:text-[#F0D48A]">
                Demo
              </a>
              <a href="#waitlist" className="transition-colors hover:text-[#F0D48A]">
                Waitlist
              </a>
              <Link href="/examples" className="transition-colors hover:text-[#F0D48A]">
                Examples
              </Link>
            </div>
            <Link
              href="/signup"
              className="gold-pill px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_8px_28px_rgba(212,166,84,0.3)]"
            >
              Start
            </Link>
          </nav>
        </header>

        <main>
          <section className="relative mx-auto flex min-h-[88vh] w-full max-w-7xl flex-col items-center justify-center px-4 py-16 sm:px-6 sm:py-24 text-center md:px-10">
            {/* Dark vignette behind hero text for contrast */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(26,10,46,0.7)_0%,rgba(26,10,46,0.4)_45%,transparent_75%)]" />
            <div className="relative">
              <p className="mb-8 rounded-full border border-[rgba(212,166,84,0.25)] bg-[rgba(212,166,84,0.1)] px-5 py-2 text-xs uppercase tracking-[0.22em] text-[#F0D48A]">
                ✧ Pre-Launch Access
              </p>
            </div>
            <h1 className="relative max-w-5xl font-heading text-3xl sm:text-5xl font-bold leading-[1.06] tracking-[-0.03em] text-[#F5F0EB] drop-shadow-[0_4px_32px_rgba(0,0,0,0.85)] md:text-7xl">
              Your resume, <span className="text-[#D4A654] italic">alive</span>.
            </h1>
            <p className="relative mt-6 sm:mt-8 max-w-2xl text-base sm:text-lg font-light leading-7 sm:leading-8 text-[rgba(245,240,235,0.78)]">
              MyLivingPage turns static resumes into living digital identity pages with algorithmic art themes and AI-structured storytelling.
            </p>
            <div className="relative mt-8 sm:mt-11 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup"
                className="gold-pill px-6 py-3 sm:px-8 sm:py-4 text-sm font-semibold transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:shadow-[0_14px_42px_rgba(212,166,84,0.38)]"
              >
                Create My Page
              </Link>
              <Link
                href="/examples"
                className="rounded-full border border-[rgba(255,255,255,0.18)] px-6 py-3 sm:px-8 sm:py-4 text-sm text-[rgba(245,240,235,0.75)] transition-colors hover:border-[rgba(212,166,84,0.35)] hover:text-[#F0D48A]"
              >
                See Examples
              </Link>
            </div>
          </section>

          <section id="features" className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 md:px-10">
            <div className="mb-8 sm:mb-12 text-center">
              <p className="mb-3 text-xs uppercase tracking-[0.22em] text-[#D4A654]">Core Features</p>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#F5F0EB] drop-shadow-[0_2px_16px_rgba(0,0,0,0.6)] md:text-5xl">A page that breathes</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="glass-card rounded-2xl p-6 transition-all duration-300 ease-soft hover:-translate-y-1 hover:border-[rgba(212,166,84,0.25)]"
                >
                  <p className="mb-4 text-2xl text-[#D4A654]">{feature.icon}</p>
                  <h3 className="mb-2 font-heading text-2xl text-[#F5F0EB]">{feature.title}</h3>
                  <p className="text-sm leading-7 text-[rgba(245,240,235,0.58)]">{feature.copy}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="how" className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 md:px-10">
            <div className="glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-12">
              <p className="mb-4 text-center text-xs uppercase tracking-[0.22em] text-[#D4A654]">How It Works</p>
              <h2 className="text-center font-heading text-3xl sm:text-4xl font-bold text-[#F5F0EB] drop-shadow-[0_2px_16px_rgba(0,0,0,0.6)] md:text-5xl">Three steps to live</h2>
              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {[
                  ["01", "Paste your resume", "Drop your resume text. AI extracts structure, skills, and highlights."],
                  ["02", "Pick a living theme", "Choose from curated algorithmic art themes with live previews."],
                  ["03", "Publish your page", "Go live at mylivingpage.com/{username} and share instantly."],
                ].map(([num, title, body]) => (
                  <article key={num} className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-6">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#D4A654] font-mono text-lg text-[#D4A654]">
                      {num}
                    </div>
                    <h3 className="mb-2 font-heading text-2xl text-[#F5F0EB]">{title}</h3>
                    <p className="text-sm leading-7 text-[rgba(245,240,235,0.55)]">{body}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <FreeProDemo />

          <section id="waitlist" className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 sm:py-20 text-center md:px-10">
            <p className="mb-4 text-xs uppercase tracking-[0.22em] text-[#D4A654]">Early Access</p>
            <h2 className="font-heading text-3xl sm:text-5xl font-bold leading-tight text-[#F5F0EB] drop-shadow-[0_2px_16px_rgba(0,0,0,0.6)] md:text-6xl">
              Make them <span className="text-[#D4A654] italic">remember</span> you
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-[rgba(245,240,235,0.58)]">
              Join the waitlist for launch access and priority onboarding into the MyLivingPage MVP.
            </p>
            <WaitlistForm />
          </section>
        </main>

        <SiteLegalFooter siteId={site.id} />
      </div>
    </div>
  );
}


