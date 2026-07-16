import Link from "next/link";
import SiteLegalFooter from "@/components/legal/SiteLegalFooter";
import { LEGAL_EFFECTIVE_DATE } from "@/lib/legal/legal-version";
import { getRequestLegalSite } from "@/lib/legal/request-site";
import { getLegalNavItems } from "@/lib/legal/site-config";
import { ProfileWindow } from "@/components/ui/ProfilePanel";

export default async function LegalIndexPage() {
  const site = await getRequestLegalSite();
  const links = getLegalNavItems(site.id, false);

  return (
    <div className="profile-shell min-h-screen">
      <header className="relative z-10 border-b border-[rgba(147,197,253,0.18)] bg-[rgba(5,16,34,0.9)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="font-heading text-xl text-[#F0F4FF]">
            {site.id === "mylivingpage" ? (
              <>
                my<span className="text-[#3B82F6]">living</span>page
              </>
            ) : (
              site.brandName
            )}
          </Link>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.58)]">Site policies</p>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <ProfileWindow title="Legal directory // policies & trust" status={`Updated ${LEGAL_EFFECTIVE_DATE}`} contentClassName="p-6 sm:p-10">
          <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Last updated: {LEGAL_EFFECTIVE_DATE}</p>
          <h1 className="mt-3 font-heading text-3xl font-bold text-[#F0F4FF] sm:text-5xl">Legal and Policies</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[rgba(240,244,255,0.68)] sm:text-base">
            These policies apply to {site.brandName}. They cover account use, billing, privacy, and how to contact the
            business about legal or security issues.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="profile-panel group block p-4 transition-colors hover:border-[rgba(96,165,250,0.5)] hover:bg-[rgba(59,130,246,0.08)]"
              >
                <p className="font-heading text-2xl text-[#F0F4FF]">{link.label}</p>
                <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.58)]">{link.description}</p>
              </Link>
            ))}
          </div>
        </ProfileWindow>
      </main>

      <SiteLegalFooter siteId={site.id} />
    </div>
  );
}
