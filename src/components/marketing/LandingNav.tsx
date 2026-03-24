"use client";

import Link from "next/link";
import { useState } from "react";

const NAV_LINKS = [
  { href: "#demo-section", label: "Demo", external: false },
  { href: "#how", label: "How It Works", external: false },
  { href: "/examples", label: "Examples", external: true },
  { href: "#pricing", label: "Pricing", external: false },
];

const LOGIN_HREF = "/login?next=/dashboard";
const SIGNUP_HREF = "/signup?ref=landing_apply_nav&next=/create";
const MOBILE_SIGNUP_HREF = "/signup?ref=landing_apply_nav_mobile&next=/create";

export default function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-6 md:px-10">
      <Link href="/" className="font-heading text-xl font-bold text-[#F0F4FF] sm:text-2xl">
        my<span className="text-[#3B82F6]">living</span>page
      </Link>

      {/* Desktop links */}
      <div className="hidden items-center gap-8 text-xs uppercase tracking-[0.18em] text-[rgba(240,244,255,0.6)] md:flex">
        {NAV_LINKS.map((link) =>
          link.external ? (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-[#93C5FD]">
              {link.label}
            </Link>
          ) : (
            <a key={link.href} href={link.href} className="transition-colors hover:text-[#93C5FD]">
              {link.label}
            </a>
          )
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href={LOGIN_HREF}
          className="hidden rounded-full border border-[rgba(255,255,255,0.16)] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(240,244,255,0.72)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD] sm:inline-flex sm:px-5 sm:text-xs sm:tracking-[0.16em]"
        >
          Log In
        </Link>
        <Link
          href={SIGNUP_HREF}
          className="gold-pill px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all duration-300 ease-soft hover:shadow-[0_8px_28px_rgba(59,130,246,0.3)] sm:px-5 sm:text-xs sm:tracking-[0.16em]"
        >
          <span className="sm:hidden">Create</span>
          <span className="hidden sm:inline">Create Your Page (Free)</span>
        </Link>

        {/* Hamburger - mobile only */}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="landing-mobile-nav"
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 md:hidden"
        >
          {open ? (
            <svg className="h-5 w-5 text-[#F0F4FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <>
              <span className="h-px w-5 bg-[rgba(240,244,255,0.7)]" />
              <span className="h-px w-5 bg-[rgba(240,244,255,0.7)]" />
              <span className="h-px w-5 bg-[rgba(240,244,255,0.7)]" />
            </>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          id="landing-mobile-nav"
          className="absolute left-0 top-full z-50 w-full border-b border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.95)] px-4 py-4 backdrop-blur-xl md:hidden"
        >
          <ul className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                {link.external ? (
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-4 py-3 text-sm uppercase tracking-[0.18em] text-[rgba(240,244,255,0.7)] transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-[#93C5FD]"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-4 py-3 text-sm uppercase tracking-[0.18em] text-[rgba(240,244,255,0.7)] transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-[#93C5FD]"
                  >
                    {link.label}
                  </a>
                )}
              </li>
            ))}
            <li className="mt-2 border-t border-[rgba(255,255,255,0.08)] pt-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <Link
                  href={LOGIN_HREF}
                  onClick={() => setOpen(false)}
                  className="block w-full rounded-full border border-[rgba(255,255,255,0.16)] py-3 text-center text-sm font-semibold text-[rgba(240,244,255,0.8)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
                >
                  Log In
                </Link>
                <Link
                  href={MOBILE_SIGNUP_HREF}
                  onClick={() => setOpen(false)}
                  className="gold-pill block w-full py-3 text-center text-sm font-semibold"
                >
                  Create Your Page (Free)
                </Link>
              </div>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}

