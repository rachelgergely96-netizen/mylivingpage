"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

export interface SiteHeaderLink {
  href: string;
  label: string;
  current?: boolean;
  mobileLabel?: string;
}

interface SiteHeaderProps {
  brandName?: string;
  cta?: SiteHeaderLink;
  links?: SiteHeaderLink[];
}

function Wordmark({ brandName }: { brandName: string }) {
  if (brandName === "MyLivingPage" || brandName === "MyLivingPage.com") {
    return (
      <span className="site-wordmark">
        my<span>living</span>page
      </span>
    );
  }

  return <span className="site-wordmark">{brandName}</span>;
}

export default function SiteHeader({
  brandName = "MyLivingPage",
  cta,
  links = [],
}: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        navRef.current &&
        !navRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
    };
  }, [menuOpen]);

  return (
    <>
      <a
        href="#main-content"
        className="site-skip-link"
      >
        Skip to content
      </a>
      <header className="site-header" data-site-ui>
        <nav
          ref={navRef}
          aria-label="Primary navigation"
          className="site-container relative flex min-h-16 items-center justify-between gap-4"
        >
          <Link href="/" aria-label={`${brandName} home`}>
            <Wordmark brandName={brandName} />
          </Link>

          {links.length ? (
            <div className="hidden items-center gap-1 md:flex">
              {links.map((link) => (
                <Link
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  aria-current={link.current ? "page" : undefined}
                  className="site-nav-link"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            {cta ? (
              <Link href={cta.href} className="site-button site-button-primary whitespace-nowrap">
                <span className="sm:hidden">{cta.mobileLabel ?? cta.label}</span>
                <span className="hidden sm:inline">{cta.label}</span>
              </Link>
            ) : null}
            {links.length ? (
              <button
                type="button"
                aria-label={menuOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={menuOpen}
                aria-controls={menuId}
                onClick={() => setMenuOpen((current) => !current)}
                className="site-icon-button md:hidden"
              >
                {menuOpen ? (
                  <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                )}
              </button>
            ) : null}
          </div>

          {menuOpen && links.length ? (
            <div
              id={menuId}
              className="absolute inset-x-0 top-full border border-site-border bg-site-surface p-3 shadow-[var(--site-shadow-overlay)] md:hidden"
            >
              <div className="grid gap-1">
                {links.map((link) => (
                  <Link
                    key={`mobile-${link.href}-${link.label}`}
                    href={link.href}
                    aria-current={link.current ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                    className="site-nav-link w-full"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </nav>
      </header>
    </>
  );
}
