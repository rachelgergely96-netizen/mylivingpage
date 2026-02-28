import Link from "next/link";
import SiteLegalFooter from "@/components/legal/SiteLegalFooter";
import { getRequestLegalSite } from "@/lib/legal/request-site";
import { getLegalNavItems } from "@/lib/legal/site-config";

export default function LegalIndexPage() {
  const site = getRequestLegalSite();
  const links = getLegalNavItems(site.id, false);

  return (
    <div className="min-h-screen">
      <header className="border-b border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.72)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:h-20 sm:px-6">
          <Link href="/" className="font-heading text-xl text-[#F0F4FF]">
            {site.id === "mylivingpage" ? (
              <>
                my<span className="text-[#3B82F6]">living</span>page
              </>
            ) : (
              site.brandName
            )}
          </Link>
          <p className="text-xs uppercase tracking-[0.2em] text-[rgba(240,244,255,0.55)]">Legal Center</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <section className="glass-card rounded-3xl p-6 sm:p-10">
          <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Last updated: {"{{EFFECTIVE_DATE}}"}</p>
          <h1 className="mt-3 font-heading text-3xl font-bold text-[#F0F4FF] sm:text-5xl">Legal and Policies</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[rgba(240,244,255,0.68)] sm:text-base">
            These policies apply to {site.brandName}. Replace placeholders before launch, including contact channels,
            company details, jurisdiction, and designated agent information.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.02)] p-4 transition-all hover:-translate-y-0.5 hover:border-[rgba(59,130,246,0.32)]"
              >
                <p className="font-heading text-2xl text-[#F0F4FF]">{link.label}</p>
                <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.58)]">{link.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <SiteLegalFooter siteId={site.id} />
    </div>
  );
}
