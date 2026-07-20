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
        links={[{ href: "/legal", label: "Legal center", current: true }]}
      />

      <main id="main-content" className="site-container py-10 sm:py-14">
        <section className="site-panel mx-auto max-w-5xl px-5 py-9 sm:px-8 sm:py-12">
          <p className="site-eyebrow">Latest policy update: {LATEST_LEGAL_EFFECTIVE_DATE}</p>
          <h1 className="site-page-title mt-4">Legal and Policies</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-site-secondary">
            These policies apply to {site.brandName}. They cover account use, billing, privacy,
            and how to contact the business about legal or security issues.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
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
