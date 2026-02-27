import Link from "next/link";
import ResumeLayout from "@/components/ResumeLayout";
import ThemeCanvas from "@/components/ThemeCanvas";
import { DEMO_PAGES } from "@/lib/demo-data";
import { THEME_MAP } from "@/themes/registry";
import type { ThemeId } from "@/themes/types";

export const metadata = {
  title: "Examples | MyLivingPage",
  description:
    "See what a living page looks like. Explore example pages across different themes.",
};

export default function ExamplesPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(26,10,46,0.72)] backdrop-blur-xl">
        <nav className="mx-auto flex h-16 sm:h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 md:px-10">
          <Link
            href="/"
            className="font-heading text-xl sm:text-2xl font-bold text-[#F5F0EB]"
          >
            my<span className="text-[#D4A654]">living</span>page
          </Link>
          <Link
            href="/signup"
            className="gold-pill px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_8px_28px_rgba(212,166,84,0.3)]"
          >
            Create Yours
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-16 md:px-10">
        {/* Hero */}
        <div className="mb-10 sm:mb-14 text-center">
          <p className="mb-3 text-xs uppercase tracking-[0.22em] text-[#D4A654]">
            Examples
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-[#F5F0EB]">
            See what a living page looks like
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[rgba(245,240,235,0.6)]">
            Each page pairs structured resume data with a unique algorithmic art
            theme. Hover to interact with the backgrounds.
          </p>
        </div>

        {/* Example cards */}
        <div className="grid gap-6 md:gap-8 lg:grid-cols-3">
          {DEMO_PAGES.map((demo) => {
            const theme = THEME_MAP[demo.themeId as ThemeId];
            return (
              <article
                key={demo.data.name}
                className="group overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)] transition-all duration-300 ease-soft hover:border-[rgba(212,166,84,0.2)]"
              >
                {/* Live theme preview */}
                <div className="relative h-[420px] sm:h-[460px] overflow-hidden">
                  <ThemeCanvas
                    themeId={demo.themeId as ThemeId}
                    height={460}
                    interactive
                  >
                    <div className="h-full bg-[radial-gradient(ellipse_at_30%_20%,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.58)_100%)]">
                      <ResumeLayout data={demo.data} compact />
                    </div>
                  </ThemeCanvas>
                </div>

                {/* Card footer */}
                <div className="border-t border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-3 sm:px-5 sm:py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-heading text-sm font-bold text-[#F5F0EB]">
                        {theme?.name ?? demo.themeId}
                      </p>
                      <p className="text-[11px] text-[rgba(245,240,235,0.45)]">
                        {theme?.vibe}
                      </p>
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

        {/* CTA */}
        <div className="mt-12 sm:mt-16 text-center">
          <p className="mb-4 text-sm text-[rgba(245,240,235,0.5)]">
            Ready to build yours?
          </p>
          <Link
            href="/signup"
            className="gold-pill inline-block px-8 py-4 text-sm font-semibold transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:shadow-[0_14px_42px_rgba(212,166,84,0.38)]"
          >
            Create Your Living Page
          </Link>
        </div>
      </main>
    </div>
  );
}
