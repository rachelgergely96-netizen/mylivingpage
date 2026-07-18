import Link from "next/link";
import {
  getLegalSiteConfig,
  getLegalNavItems,
  type LegalSiteId,
} from "@/lib/legal/site-config";

function BrandMark({ siteId }: { siteId: LegalSiteId }) {
  if (siteId === "mylivingpage") {
    return (
      <span className="site-wordmark text-xl">
        my<span>living</span>page
      </span>
    );
  }

  return (
    <span className="site-wordmark text-xl">
      {getLegalSiteConfig(siteId).brandName}
    </span>
  );
}

export default function SiteLegalFooter({ siteId }: { siteId: LegalSiteId }) {
  const links = getLegalNavItems(siteId);
  const site = getLegalSiteConfig(siteId);
  const copyrightOwner = site.companyNamePlaceholder;

  return (
    <footer
      className="border-t border-site-border bg-site-canvas px-4 py-8 font-site sm:px-6 sm:py-10"
      data-site-ui
    >
      <div className="mx-auto grid w-full max-w-6xl items-center gap-5 text-center md:grid-cols-[auto_minmax(0,1fr)_auto] md:text-left">
        <Link
          href="/"
          aria-label="Back to home"
          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-site-focus"
        >
          <BrandMark siteId={siteId} />
        </Link>
        <nav
          aria-label="Legal and policy links"
          className="w-full border border-site-border bg-site-surface px-4 py-4 sm:px-6"
        >
          <p className="site-eyebrow">Legal</p>
          <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-site-secondary md:justify-start">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-site-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-site-focus"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
        <p className="text-xs text-site-muted md:text-right">
          Copyright {new Date().getFullYear()} {copyrightOwner}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
