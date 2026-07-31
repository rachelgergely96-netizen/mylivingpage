import Link from "next/link";
import SiteLegalFooter from "@/components/legal/SiteLegalFooter";
import SiteHeader from "@/components/marketing/SiteHeader";
import { LATEST_LEGAL_EFFECTIVE_DATE } from "@/lib/legal/legal-version";
import { getRequestLegalSite } from "@/lib/legal/request-site";
import { getLegalNavItems } from "@/lib/legal/site-config";

export default async function LegalIndexPage() {
  const site = await getRequestLegalSite();
  const links = getLegalNavItems(site.id, false);

  return (
    <div className="site-shell" data-site-ui>
      <SiteHeader
        brandName={site.brandName}
        links={[
          { href: "/", label: "Home" },
          { href: "/legal", label: "Legal center", current: true },
        ]}
      />

      <main id="main-content" className="site-container py-12 sm:py-16">
        <section className="mx-auto max-w-5xl">
          <p className="site-eyebrow">Latest policy update: {LATEST_LEGAL_EFFECTIVE_DATE}</p>
          <h1 className="site-page-title mt-4">Legal and policies</h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-site-secondary">
            These policies apply to {site.brandName}. They cover account use, billing, privacy,
            and how to contact the business about legal or security issues.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-6">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="border border-site-border bg-site-canvas-alt p-5 transition-colors hover:border-site-action"
              >
                <h2 className="site-panel-title">{link.label}</h2>
                <p className="mt-2 text-sm leading-6 text-site-secondary">{link.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <SiteLegalFooter siteId={site.id} />
    </div>
  );
}
