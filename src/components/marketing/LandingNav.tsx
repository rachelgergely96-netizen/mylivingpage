"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const NAV_LINKS = [
  { href: "/#demo-section", label: "Demo" },
  { href: "/#how", label: "How It Works" },
  { href: "/examples", label: "Examples" },
  { href: "/pricing", label: "Free" },
];

const LOGIN_HREF = "/login?next=/dashboard";
const SIGNUP_HREF = "/signup?ref=landing_apply_nav&next=/create";
const MOBILE_SIGNUP_HREF = "/signup?ref=landing_apply_nav_mobile&next=/create";

export default function LandingNav() {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        window.requestAnimationFrame(() => menuButtonRef.current?.focus());
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <nav className="relative mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 md:px-10">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/"
          className="shrink-0 font-heading text-xl font-bold text-[#F0F4FF] sm:text-2xl"
        >
          my<span className="text-[#60A5FA]">living</span>page
        </Link>
        <span className="profile-status !hidden border-l border-[rgba(147,197,253,0.2)] pl-3 lg:!inline-flex">
          free profiles
        </span>
      </div>

      <div className="hidden items-stretch overflow-hidden rounded-md border border-[rgba(147,197,253,0.2)] bg-[rgba(6,18,37,0.68)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgba(240,244,255,0.7)] md:flex">
        {NAV_LINKS.map((link, index) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex min-h-10 items-center px-4 transition-colors hover:bg-[rgba(59,130,246,0.16)] hover:text-[#DBEAFE] ${
              index > 0 ? "border-l border-[rgba(147,197,253,0.16)]" : ""
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={LOGIN_HREF}
          className="profile-action hidden min-h-10 px-4 sm:inline-flex"
        >
          Log In
        </Link>
        <Link
          href={SIGNUP_HREF}
          className="gold-pill px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] sm:px-5"
        >
          <span className="sm:hidden">Create</span>
          <span className="hidden sm:inline">Create Your Page (Free)</span>
        </Link>

        <button
          ref={menuButtonRef}
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="landing-mobile-nav"
          onClick={() => setOpen((current) => !current)}
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-md border border-[rgba(147,197,253,0.24)] bg-[rgba(6,18,37,0.72)] md:hidden"
        >
          {open ? (
            <svg
              className="h-5 w-5 text-[#F0F4FF]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <>
              <span className="h-px w-5 bg-[rgba(240,244,255,0.82)]" />
              <span className="h-px w-5 bg-[rgba(240,244,255,0.82)]" />
              <span className="h-px w-5 bg-[rgba(240,244,255,0.82)]" />
            </>
          )}
        </button>
      </div>

      {open ? (
        <div
          id="landing-mobile-nav"
          className="profile-window absolute left-4 right-4 top-[calc(100%+0.5rem)] z-50 md:hidden"
        >
          <div className="profile-titlebar">
            <span>Browse MyLivingPage</span>
            <span>Menu</span>
          </div>
          <ul className="grid p-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block min-h-11 border-b border-[rgba(147,197,253,0.12)] px-3 py-3 text-sm text-[rgba(240,244,255,0.78)] transition-colors last:border-b-0 hover:bg-[rgba(59,130,246,0.12)] hover:text-[#DBEAFE]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="grid gap-2 px-2 pb-2 pt-4 sm:grid-cols-2">
              <Link
                href={LOGIN_HREF}
                onClick={() => setOpen(false)}
                className="profile-action w-full"
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
            </li>
          </ul>
        </div>
      ) : null}
    </nav>
  );
}
