"use client";

import Link from "next/link";
import { useState } from "react";

const NAV_LINKS = [
  { href: "#examples", label: "Examples", external: false },
  { href: "#comparison", label: "Why It Works", external: false },
  { href: "#how", label: "How It Works", external: false },
  { href: "#pricing", label: "Pricing", external: false },
];

export default function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="mx-auto flex h-16 sm:h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 md:px-10">
      <div className="font-heading text-xl sm:text-2xl font-bold text-[#F0F4FF]">
        my<span className="text-[#3B82F6]">living</span>page
      </div>

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

      <div className="flex items-center gap-3">
        <Link
          href="/signup?ref=landing_nav"
          className="gold-pill px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_8px_28px_rgba(59,130,246,0.3)]"
        >
          Build My Page
        </Link>

        {/* Hamburger — mobile only */}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
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
        <div className="absolute left-0 top-full z-50 w-full border-b border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.95)] px-4 py-4 backdrop-blur-xl md:hidden">
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
              <Link
                href="/signup?ref=landing_nav_mobile"
                onClick={() => setOpen(false)}
                className="gold-pill block w-full py-3 text-center text-sm font-semibold"
              >
                Build My Page
              </Link>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}
