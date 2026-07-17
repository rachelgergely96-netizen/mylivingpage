import Link from "next/link";
import {
  getLegalSiteConfig,
  getLegalNavItems,
  type LegalSiteId,
} from "@/lib/legal/site-config";

function BrandMark({ siteId }: { siteId: LegalSiteId }) {
  if (siteId === "mylivingpage") {
    return (
      <span className="font-body text-xl font-bold tracking-[-0.04em] text-[#F4F7FC]">
        my<span className="text-[#3B82F6]">living</span>page
      </span>
    );
  }

  return (
    <span className="font-body text-xl font-bold tracking-[-0.04em] text-[#F4F7FC]">
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
      className="border-t border-[#2D4059] bg-[#060E1C] px-4 py-8 font-body sm:px-6 sm:py-10"
      data-site-ui
    >
      <div className="mx-auto grid w-full max-w-6xl items-center gap-5 text-center md:grid-cols-[auto_minmax(0,1fr)_auto] md:text-left">
        <Link
          href="/"
          aria-label="Back to home"
          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#A9CCFF]"
        >
          <BrandMark siteId={siteId} />
        </Link>
        <nav
          aria-label="Legal and policy links"
          className="w-full border border-[#2D4059] bg-[#0D1B2E] px-4 py-4 sm:px-6"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#78ADFF]">Legal</p>
          <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-[#B8C4D4] md:justify-start">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-[#9AC3FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A9CCFF]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
        <p className="text-xs text-[#8493A8] md:text-right">
          Copyright {new Date().getFullYear()} {copyrightOwner}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
