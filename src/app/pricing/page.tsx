import type { Metadata } from "next";
import Link from "next/link";
import CosmicBackground from "@/components/marketing/CosmicBackground";
import { PRO_PLAN_PRICE, STARTER_PLAN_PRICE } from "@/lib/billing";
import { GUIDES } from "@/lib/guides";
import { PRICING_REASSURANCE } from "@/lib/marketing-samples";
import { getAbsoluteUrl, SITE_NAME } from "@/lib/site";

const canonicalUrl = getAbsoluteUrl("/pricing");

const PLAN_CARDS = [
  {
    name: "Free",
    priceLabel: "$0",
    intervalLabel: "/month",
    eyebrow: "Preview only",
    body:
      "Build, preview, and test the flow with no card. Live hosting starts when you publish on a paid plan.",
    features: PRICING_REASSURANCE.free,
    ctaHref: "/signup?ref=pricing_free_preview",
    ctaLabel: "Start Free Preview",
    featured: false,
  },
  {
    name: "Starter",
    priceLabel: STARTER_PLAN_PRICE.amountLabel,
    intervalLabel: STARTER_PLAN_PRICE.intervalLabel,
    eyebrow: "Best for keeping it live",
    body:
      "Publish one page with dashboard view counts, share cards, the current starter theme set, and one targeted version.",
    features: PRICING_REASSURANCE.starter,
    ctaHref: "/signup?ref=pricing_starter",
    ctaLabel: "Choose Starter",
    featured: false,
  },
  {
    name: "Pro",
    priceLabel: PRO_PLAN_PRICE.amountLabel,
    intervalLabel: PRO_PLAN_PRICE.intervalLabel,
    eyebrow: "Best for active searches",
    body:
      "Full analytics, all themes, and up to three targeted versions for higher-stakes outreach and repeat follow-up.",
    features: PRICING_REASSURANCE.pro,
    ctaHref: "/signup?ref=pricing_pro",
    ctaLabel: "Choose Pro",
    featured: true,
  },
] as const;

export const metadata: Metadata = {
  title: `Pricing | ${SITE_NAME}`,
  description:
    "Build and preview for free, then publish on Starter for $4.99/month or Pro for $9.99/month with a 30-day free trial.",
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title: `Pricing | ${SITE_NAME}`,
    description:
      "Build and preview for free, then publish on Starter for $4.99/month or Pro for $9.99/month with a 30-day free trial.",
    url: canonicalUrl,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Pricing | ${SITE_NAME}`,
    description:
      "Build and preview for free, then publish on Starter for $4.99/month or Pro for $9.99/month with a 30-day free trial.",
  },
};

export default function PricingPage() {
  const seoGuides = GUIDES.slice(0, 3);

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden">
      <CosmicBackground />
      <div className="relative z-10">
        <header className="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.72)] backdrop-blur-xl">
          <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 md:px-10">
            <Link href="/" className="font-heading text-xl font-bold text-[#F0F4FF] sm:text-2xl">
              my<span className="text-[#3B82F6]">living</span>page
            </Link>
            <div className="hidden items-center gap-8 text-xs uppercase tracking-[0.18em] text-[rgba(240,244,255,0.6)] md:flex">
              <Link href="/#examples" className="transition-colors hover:text-[#93C5FD]">
                Examples
              </Link>
              <Link href="/#pricing" className="transition-colors hover:text-[#93C5FD]">
                Pricing
              </Link>
              <Link href="/pricing" className="text-[#93C5FD]">
                Full Plans
              </Link>
            </div>
            <Link
              href="/signup?ref=pricing_nav"
              className="gold-pill px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_8px_28px_rgba(59,130,246,0.3)]"
            >
              Start Free Preview
            </Link>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24 md:px-10">
          <section className="text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-[#3B82F6]">Pricing</p>
            <h1 className="mt-3 font-heading text-3xl font-bold text-[#F0F4FF] sm:text-5xl md:text-6xl">
              Build free. Publish when the page is ready to help you win the next conversation.
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-[rgba(240,244,255,0.62)]">
              Free is for discovery and setup. When your page is ready to go live, add a payment
              method at publish, start a 30-day free trial, and choose the plan that matches how
              much insight you want after the click.
            </p>
          </section>

          <section className="mt-10 grid gap-5 lg:grid-cols-3">
            {PLAN_CARDS.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-3xl border p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-7 ${
                  plan.featured
                    ? "border-[rgba(59,130,246,0.3)] bg-[rgba(59,130,246,0.12)]"
                    : "border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.55)]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#93C5FD]">
                      {plan.eyebrow}
                    </p>
                    <h2 className="mt-2 font-heading text-3xl font-bold text-[#F0F4FF]">
                      {plan.name}
                    </h2>
                  </div>
                  {plan.featured ? (
                    <span className="rounded-full border border-[rgba(59,130,246,0.24)] bg-[rgba(59,130,246,0.18)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#BFDBFE]">
                      Most complete
                    </span>
                  ) : null}
                </div>

                <div className="mt-5 flex items-end gap-1">
                  <span className="font-heading text-5xl font-bold text-[#F0F4FF]">
                    {plan.priceLabel}
                  </span>
                  <span className="pb-1 text-sm text-[rgba(240,244,255,0.42)]">
                    {plan.intervalLabel}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-[rgba(240,244,255,0.64)]">
                  {plan.body}
                </p>

                <ul className="mt-6 space-y-3 text-sm text-[rgba(240,244,255,0.78)]">
                  {plan.features.map((item) => (
                    <li key={`${plan.name}-${item}`} className="flex items-start gap-2.5">
                      <span className="mt-0.5 text-[#93C5FD]">&#10003;</span>
                      {item}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.ctaHref}
                  className={`mt-8 block w-full rounded-full py-3 text-center text-sm font-semibold transition-all duration-300 ${
                    plan.featured
                      ? "gold-pill hover:shadow-[0_8px_28px_rgba(59,130,246,0.3)]"
                      : "border border-[rgba(255,255,255,0.16)] bg-[rgba(255,255,255,0.04)] text-[#F0F4FF] hover:border-[rgba(59,130,246,0.35)] hover:text-[#BFDBFE]"
                  }`}
                >
                  {plan.ctaLabel}
                </Link>
              </article>
            ))}
          </section>

          <section className="mt-8 rounded-3xl border border-[rgba(59,130,246,0.22)] bg-[rgba(59,130,246,0.08)] p-5 text-sm text-[rgba(240,244,255,0.74)] sm:p-6">
            Publishing is the paywall moment. Free accounts can build and preview without a card,
            but live hosting starts only after you pick Starter or Pro and begin the 30-day trial.
          </section>

          <section className="mx-auto mt-16 max-w-5xl sm:mt-20">
            <div className="glass-card rounded-[2rem] border border-[rgba(255,255,255,0.08)] px-6 py-8 sm:px-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-3xl">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#3B82F6]">Guides</p>
                  <h2 className="mt-3 font-heading text-3xl font-bold text-[#F0F4FF] sm:text-4xl">
                    Learn the mechanics before you publish.
                  </h2>
                  <p className="mt-4 text-base leading-7 text-[rgba(240,244,255,0.62)]">
                    Pricing matters after the fundamentals work. These guides help you tighten the
                    Resume PDF, sharpen recruiter search language, and understand when a Living Page
                    adds value beyond an attachment.
                  </p>
                </div>
                <Link
                  href="/guides"
                  className="text-sm font-semibold text-[#93C5FD] transition-colors hover:text-[#BFDBFE]"
                >
                  Browse all guides
                </Link>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                {seoGuides.map((guide) => (
                  <Link
                    key={guide.slug}
                    href={`/guides/${guide.slug}`}
                    className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-5 transition-all hover:-translate-y-0.5 hover:border-[rgba(59,130,246,0.28)]"
                  >
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#3B82F6]">Guide</p>
                    <h3 className="mt-3 font-heading text-2xl font-bold text-[#F0F4FF]">
                      {guide.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[rgba(240,244,255,0.6)]">
                      {guide.hubSummary}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
