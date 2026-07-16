import Link from "next/link";
import {
  getLegalSiteConfig,
  getLegalNavItems,
  type LegalSiteId,
} from "@/lib/legal/site-config";

function BrandMark({ siteId }: { siteId: LegalSiteId }) {
  if (siteId === "mylivingpage") {
    return (
      <span className="font-heading text-xl text-[#F0F4FF]">
        my<span className="text-[#3B82F6]">living</span>page
      </span>
    );
  }

  return <span className="font-heading text-xl text-[#F0F4FF]">{getLegalSiteConfig(siteId).brandName}</span>;
}

export default function SiteLegalFooter({ siteId }: { siteId: LegalSiteId }) {
  const links = getLegalNavItems(siteId);
  const site = getLegalSiteConfig(siteId);
  const copyrightOwner = site.companyNamePlaceholder;

  return (
    <footer className="border-t border-[rgba(147,197,253,0.14)] px-4 py-8 sm:px-6 sm:py-10">
      <div className="profile-window mx-auto w-full max-w-6xl">
        <div className="profile-titlebar">
          <span>Site directory // legal &amp; trust</span>
          <span>Footer</span>
        </div>
        <div className="grid gap-5 p-5 text-center md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:text-left sm:p-6">
          <div>
            <Link href="/" aria-label="Back to home" className="inline-flex">
              <BrandMark siteId={siteId} />
            </Link>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[rgba(240,244,255,0.46)]">
              {siteId === "mylivingpage" ? "Your page. Your link. Your story." : site.brandName}
            </p>
          </div>
          <div className="border border-[rgba(147,197,253,0.15)] bg-[rgba(255,255,255,0.02)] p-4 md:justify-self-stretch">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#60A5FA]">Policies &amp; site details</p>
            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-[rgba(240,244,255,0.7)] md:justify-start">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="profile-link">
                {link.label}
              </Link>
            ))}
            </div>
            <p className="mt-3 text-xs text-[rgba(240,244,255,0.45)]">
              Copyright {new Date().getFullYear()} {copyrightOwner}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
