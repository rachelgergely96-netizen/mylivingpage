import Link from "next/link";
import React, { type ReactNode } from "react";
import SiteLegalFooter from "@/components/legal/SiteLegalFooter";
import type { LegalSiteConfig } from "@/lib/legal/site-config";

interface AuthShellProps {
  children: ReactNode;
  site: LegalSiteConfig;
}

const AUTH_STEPS = [
  { label: "Account", detail: "Sign in or create" },
  { label: "Verify", detail: "Confirm securely" },
  { label: "Return / build", detail: "Continue where intended" },
] as const;

export default function AuthShell({ children, site }: AuthShellProps) {
  const isMyLivingPage = site.id === "mylivingpage";

  return (
    <div className="site-shell flex min-h-screen flex-col" data-site-ui>
      <a href="#main-content" className="site-skip-link">
        Skip to content
      </a>
      <header className="border-b border-site-border bg-site-canvas">
        <div className="site-container flex min-h-16 items-center justify-between gap-4">
          <Link href="/" aria-label={`${site.brandName} home`}>
            {isMyLivingPage ? (
              <span className="site-wordmark">
                my<span>living</span>page
              </span>
            ) : (
              <span className="site-wordmark">{site.brandName}</span>
            )}
          </Link>
          <Link href="/" className="site-nav-link">
            Back to home
          </Link>
        </div>
      </header>
      {isMyLivingPage ? (
        <nav
          aria-label="Account access progress"
          className="border-b border-site-border bg-site-canvas-alt"
          data-auth-progress
        >
          <ol className="site-container grid grid-cols-3 py-3">
            {AUTH_STEPS.map((step, index) => (
              <li
                key={step.label}
                className="min-w-0 border-l border-site-border px-3 first:border-l-0 first:pl-0 sm:px-5 sm:first:pl-0"
              >
                <span className="site-eyebrow block text-site-action">
                  {String(index + 1).padStart(2, "0")} · {step.label}
                </span>
                <span className="mt-1 hidden text-xs text-site-muted sm:block">
                  {step.detail}
                </span>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      {children}
      <SiteLegalFooter siteId={site.id} />
    </div>
  );
}
