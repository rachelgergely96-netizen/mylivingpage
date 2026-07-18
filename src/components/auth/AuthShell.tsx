import Link from "next/link";
import type { ReactNode } from "react";
import SiteLegalFooter from "@/components/legal/SiteLegalFooter";
import type { LegalSiteConfig } from "@/lib/legal/site-config";

interface AuthShellProps {
  children: ReactNode;
  site: LegalSiteConfig;
}

export default function AuthShell({ children, site }: AuthShellProps) {
  const isMyLivingPage = site.id === "mylivingpage";

  return (
    <div className="site-shell flex min-h-screen flex-col" data-site-ui>
      <a
        href="#main-content"
        className="site-skip-link"
      >
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
      {children}
      <SiteLegalFooter siteId={site.id} />
    </div>
  );
}
