import type { Metadata } from "next";
import Link from "next/link";
import SiteLegalFooter from "@/components/legal/SiteLegalFooter";
import { getRequestLegalSite } from "@/lib/legal/request-site";
import CosmicBackground from "@/components/marketing/CosmicBackground";
import LandingNav from "@/components/marketing/LandingNav";
import ResumeLayout from "@/components/ResumeLayout";
import ThemeCanvas from "@/components/ThemeCanvas";
import { DEMO_PAGES } from "@/lib/demo-data";
import { THEME_MAP } from "@/themes/registry";
import type { ThemeId } from "@/themes/types";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mylivingpage.com";
const ogDescription = "Turn your resume into a living digital page with algorithmic art themes and AI-structured storytelling.";

export const metadata: Metadata = {
  title: "MyLivingPage | Your Resume, Alive",
  description: ogDescription,
  alternates: { canonical: appUrl },
  openGraph: {
    title: "MyLivingPage | Your Resume, Alive",
    description: ogDescription,
    url: appUrl,
    siteName: "MyLivingPage",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MyLivingPage | Your Resume, Alive",
    description: ogDescription,
  },
};

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
          <LandingNav />
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
                <a
                  href="#examples"
                  className="rounded-full border border-[rgba(255,255,255,0.18)] px-6 py-3 sm:px-8 sm:py-4 text-sm text-[rgba(240,244,255,0.75)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
                >
                  See Examples
                </a>
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

          <section id="examples" className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 md:px-10">
            <div className="mb-8 sm:mb-12 text-center">
              <p className="mb-3 text-xs uppercase tracking-[0.22em] text-[#3B82F6]">Examples</p>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#F0F4FF] md:text-5xl">
                See what a living page looks like
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[rgba(240,244,255,0.6)]">
                Each page pairs structured resume data with a unique algorithmic art theme. Hover to interact with the backgrounds.
              </p>
            </div>
            <div className="grid gap-6 md:gap-8 lg:grid-cols-3">
              {DEMO_PAGES.map((demo) => {
                const theme = THEME_MAP[demo.themeId as ThemeId];
                return (
                  <article
                    key={demo.data.name}
                    className="group overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)] transition-all duration-300 ease-soft hover:border-[rgba(59,130,246,0.2)]"
                  >
                    <div className="relative h-[300px] sm:h-[330px] lg:h-[360px] overflow-hidden">
                      <ThemeCanvas themeId={demo.themeId as ThemeId} height="100%" interactive>
                        <div className="h-full bg-[radial-gradient(ellipse_at_30%_20%,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.58)_100%)]">
                          <ResumeLayout data={demo.data} compact headingLevel="h2" />
                        </div>
                      </ThemeCanvas>
                    </div>
                    <div className="border-t border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-3 sm:px-5 sm:py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-heading text-sm font-bold text-[#F0F4FF]">{theme?.name ?? demo.themeId}</p>
                          <p className="text-[11px] text-[rgba(240,244,255,0.45)]">{theme?.vibe}</p>
                        </div>
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor: theme?.background ?? "#06061A",
                            boxShadow: `0 0 8px ${theme?.background ?? "#06061A"}`,
                          }}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* ── Pricing summary ──────────────────────────────────── */}
          <section id="pricing" className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16 md:px-10">
            <div className="mb-8 text-center">
              <p className="mb-3 text-xs uppercase tracking-[0.22em] text-[#3B82F6]">Pricing</p>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#F0F4FF]">Simple, transparent pricing</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Spark — free */}
              <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.5)] p-6 backdrop-blur-xl">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-[rgba(240,244,255,0.5)]">Spark</p>
                <p className="font-heading text-4xl font-bold text-[#F0F4FF]">Free</p>
                <p className="mt-1 text-sm text-[rgba(240,244,255,0.45)]">forever</p>
                <ul className="mt-5 space-y-2.5 text-sm text-[rgba(240,244,255,0.65)]">
                  {["1 living page", "5 free themes", "AI resume structuring", "Public profile URL", "View analytics"].map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <span className="text-[#3B82F6]">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="mt-6 block w-full rounded-full border border-[rgba(255,255,255,0.18)] py-2.5 text-center text-sm text-[rgba(240,244,255,0.75)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
                >
                  Get started free
                </Link>
              </div>
              {/* Pro */}
              <div className="rounded-2xl border border-[rgba(59,130,246,0.35)] bg-[rgba(10,22,40,0.6)] p-6 backdrop-blur-xl ring-1 ring-[rgba(59,130,246,0.15)]">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Pro</p>
                <p className="font-heading text-4xl font-bold text-[#F0F4FF]">$9<span className="text-xl font-normal text-[rgba(240,244,255,0.5)]">/mo</span></p>
                <p className="mt-1 text-sm text-[rgba(240,244,255,0.45)]">billed monthly</p>
                <ul className="mt-5 space-y-2.5 text-sm text-[rgba(240,244,255,0.65)]">
                  {[
                    "Everything in Spark",
                    "Unlimited pages",
                    "20+ premium themes",
                    "PDF resume export",
                    "Share card PNG download",
                    "Remove 'Made with' badge",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <span className="text-[#3B82F6]">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="gold-pill mt-6 block w-full py-2.5 text-center text-sm font-semibold"
                >
                  Start Pro
                </Link>
              </div>
            </div>
            <p className="mt-6 text-center text-sm text-[rgba(240,244,255,0.45)]">
              <Link href="/pricing" className="text-[#93C5FD] underline underline-offset-2 hover:text-[#BFDBFE]">
                See full feature comparison →
              </Link>
            </p>
          </section>

          {/* ── CTA ─────────────────────────────────────────────────── */}
          <section className="mx-auto w-full max-w-3xl px-4 pb-16 sm:pb-24 text-center">
            <div className="rounded-2xl border border-[rgba(59,130,246,0.2)] bg-[rgba(10,22,40,0.55)] px-8 py-12 backdrop-blur-xl">
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#F0F4FF]">Ready to build yours?</h2>
              <p className="mx-auto mt-4 max-w-sm text-base text-[rgba(240,244,255,0.6)]">Takes 2 minutes. No credit card required.</p>
              <Link
                href="/signup"
                className="gold-pill mt-8 inline-block px-8 py-4 text-sm font-semibold transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:shadow-[0_14px_42px_rgba(59,130,246,0.38)]"
              >
                Create My Page
              </Link>
            </div>
          </section>

        </main>

        <SiteLegalFooter siteId={site.id} />
      </div>
    </div>
  );
}

