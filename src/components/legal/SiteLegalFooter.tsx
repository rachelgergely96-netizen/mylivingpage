import Link from "next/link";
import { getLegalNavItems, type LegalSiteId } from "@/lib/legal/site-config";

function BrandMark({ siteId }: { siteId: LegalSiteId }) {
  if (siteId === "mylivingpage") {
    return (
      <span className="font-heading text-xl text-[#F5F0EB]">
        my<span className="text-[#D4A654]">living</span>page
      </span>
    );
  }

  return <span className="font-heading text-xl text-[#F5F0EB]">[SECOND_SITE_DOMAIN]</span>;
}

export default function SiteLegalFooter({ siteId }: { siteId: LegalSiteId }) {
  const links = getLegalNavItems(siteId);
  const copyrightOwner = siteId === "mylivingpage" ? "{{COMPANY_NAME}}" : "{{SECOND_SITE_COMPANY_NAME}}";

  return (
    <footer className="border-t border-[rgba(255,255,255,0.08)] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 text-center">
        <Link href="/" aria-label="Back to home">
          <BrandMark siteId={siteId} />
        </Link>
        <div className="w-full max-w-4xl rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-4 sm:px-6">
          <p className="text-xs uppercase tracking-[0.2em] text-[#D4A654]">Legal</p>
          <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-[rgba(245,240,235,0.7)]">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="transition-colors hover:text-[#F0D48A]">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <p className="text-xs text-[rgba(245,240,235,0.45)]">
          Copyright {new Date().getFullYear()} {copyrightOwner}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
