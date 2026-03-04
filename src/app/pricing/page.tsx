import Link from "next/link";
import CosmicBackground from "@/components/marketing/CosmicBackground";
import ComparisonTable from "@/components/marketing/demo/ComparisonTable";
import { COMPARISON_FEATURES } from "@/components/marketing/demo/demo-data";

const freeFeatures = COMPARISON_FEATURES.filter((f) => f.free).map((f) => f.feature);
const proOnlyFeatures = COMPARISON_FEATURES.filter((f) => f.pro && !f.free).map((f) => f.feature);

export default function PricingPage() {
  return (
    <div className="relative isolate min-h-screen overflow-x-hidden">
      <CosmicBackground />
      <div className="relative z-10">
        <header className="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.72)] backdrop-blur-xl">
          <nav className="mx-auto flex h-16 sm:h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 md:px-10">
            <Link href="/" className="font-heading text-xl sm:text-2xl font-bold text-[#F0F4FF]">
              my<span className="text-[#3B82F6]">living</span>page
            </Link>
            <div className="hidden items-center gap-8 text-xs uppercase tracking-[0.18em] text-[rgba(240,244,255,0.6)] md:flex">
              <Link href="/#features" className="transition-colors hover:text-[#93C5FD]">
                Features
              </Link>
              <Link href="/#examples" className="transition-colors hover:text-[#93C5FD]">
                Examples
              </Link>
              <Link href="/pricing" className="text-[#93C5FD]">
                Pricing
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

        <main className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-24 md:px-10">
          {/* Header */}
          <div className="mb-12 text-center sm:mb-16">
            <p className="mb-3 text-xs uppercase tracking-[0.22em] text-[#3B82F6]">Pricing</p>
            <h1 className="font-heading text-3xl font-bold text-[#F0F4FF] sm:text-5xl md:text-6xl">
              Simple, transparent pricing
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[rgba(240,244,255,0.6)]">
              Start free. Upgrade when you&apos;re ready for premium themes, analytics, and more.
            </p>
          </div>

          {/* Plan Cards */}
          <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
            {/* Free / Spark */}
            <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.55)] p-6 backdrop-blur-xl sm:p-8">
              <p className="mb-1 text-xs uppercase tracking-[0.18em] text-[rgba(240,244,255,0.5)]">Spark</p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="font-heading text-4xl font-bold text-[#F0F4FF]">Free</span>
                <span className="text-sm text-[rgba(240,244,255,0.4)]">forever</span>
              </div>
              <ul className="mb-8 space-y-3">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-[rgba(240,244,255,0.7)]">
                    <span className="mt-0.5 text-[#5BD67C]">&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block w-full rounded-full border border-[rgba(255,255,255,0.18)] py-3 text-center text-sm font-semibold text-[rgba(240,244,255,0.75)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
              >
                Get Started
              </Link>
            </div>

            {/* Pro */}
            <div className="relative rounded-2xl border border-[rgba(59,130,246,0.3)] bg-[rgba(10,22,40,0.55)] p-6 shadow-[0_0_40px_rgba(59,130,246,0.08)] backdrop-blur-xl sm:p-8">
              <div className="absolute -top-3 right-6 rounded-full bg-[#3B82F6] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                Popular
              </div>
              <p className="mb-1 text-xs uppercase tracking-[0.18em] text-[#3B82F6]">Pro</p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="font-heading text-4xl font-bold text-[#F0F4FF]">$9</span>
                <span className="text-sm text-[rgba(240,244,255,0.4)]">/month</span>
              </div>
              <p className="mb-4 text-xs text-[rgba(240,244,255,0.45)]">Everything in Spark, plus:</p>
              <ul className="mb-8 space-y-3">
                {proOnlyFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-[rgba(240,244,255,0.7)]">
                    <span className="mt-0.5 text-[#3B82F6]">&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="gold-pill block w-full py-3 text-center text-sm font-semibold transition-all duration-300 ease-soft hover:shadow-[0_8px_28px_rgba(59,130,246,0.3)]"
              >
                Upgrade to Pro
              </Link>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20">
            <h2 className="mb-6 text-center font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl">
              Full feature comparison
            </h2>
            <ComparisonTable />
          </div>
        </main>
      </div>
    </div>
  );
}
