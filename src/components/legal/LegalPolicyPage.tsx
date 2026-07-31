import Link from "next/link";
import { notFound } from "next/navigation";
import SiteLegalFooter from "@/components/legal/SiteLegalFooter";
import SiteHeader from "@/components/marketing/SiteHeader";
import { getPolicyDocument, type LegalBlock } from "@/lib/legal/policy-content";
import { getRequestLegalSite } from "@/lib/legal/request-site";
import {
  getLegalNavItems,
  isPolicyAvailableOnSite,
  type LegalPolicyId,
} from "@/lib/legal/site-config";

function renderBlock(block: LegalBlock, key: string) {
  if (block.type === "paragraph") {
    return (
      <p key={key} className="mt-3 text-base leading-relaxed text-site-secondary">
        {block.text}
      </p>
    );
  }

  const ListTag = block.ordered ? "ol" : "ul";
  return (
    <ListTag
      key={key}
      className={`mt-3 space-y-2 pl-5 text-base leading-relaxed text-site-secondary ${
        block.ordered ? "list-decimal" : "list-disc"
      }`}
    >
      {block.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ListTag>
  );
}

export default async function LegalPolicyPage({ policyId }: { policyId: LegalPolicyId }) {
  const site = await getRequestLegalSite();
  if (!isPolicyAvailableOnSite(site.id, policyId)) {
    notFound();
  }

  const policy = getPolicyDocument(site, policyId);
  const policyLinks = getLegalNavItems(site.id, false);

  return (
    <div className="site-shell" data-site-ui>
      <SiteHeader
        brandName={site.brandName}
        links={[
          { href: "/", label: "Home" },
          { href: "/legal", label: "Legal center" },
        ]}
      />

      <main id="main-content" className="site-container py-12 sm:py-16">
        <nav aria-label="Legal and policy pages" className="mx-auto mb-6 flex max-w-[44rem] flex-wrap gap-2">
          {policyLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={link.href === `/${policyId}` ? "page" : undefined}
              className="site-nav-link"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <article className="site-panel mx-auto max-w-[44rem] px-5 py-8 sm:px-8 sm:py-10">
          <p className="site-eyebrow">Last updated: {policy.lastUpdated}</p>
          <h1 className="site-page-title mt-4">{policy.title}</h1>
          <p className="mt-4 text-base leading-relaxed text-site-secondary">{policy.summary}</p>

          {policyId === "delete-account" ? (
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
              <Link href="/dashboard/settings" className="site-button site-button-secondary">
                Open account settings
              </Link>
              <p className="text-sm leading-6 text-site-secondary">
                Fastest path if you can sign in.
              </p>
            </div>
          ) : null}

          <nav aria-label="On this page" className="mt-7 border-y border-site-border py-4">
            <p className="site-eyebrow">On this page</p>
            <div className="-mx-3 mt-3 grid gap-1 sm:grid-cols-2">
              {policy.sections.map((section) => (
                <a key={section.id} href={`#${section.id}`} className="site-nav-link w-full">
                  {section.heading}
                </a>
              ))}
            </div>
          </nav>

          <div className="mt-10 space-y-12">
            {policy.sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="site-section-title text-[1.75rem]">{section.heading}</h2>
                {section.blocks.map((block, index) => renderBlock(block, `${section.id}-${index}`))}
              </section>
            ))}
          </div>
        </article>
      </main>

      <SiteLegalFooter siteId={site.id} />
    </div>
  );
}
