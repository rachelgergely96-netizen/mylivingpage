import Link from "next/link";
import { notFound } from "next/navigation";
import SiteLegalFooter from "@/components/legal/SiteLegalFooter";
import { getPolicyDocument, type LegalBlock } from "@/lib/legal/policy-content";
import { getRequestLegalSite } from "@/lib/legal/request-site";
import { getLegalNavItems, isPolicyAvailableOnSite, type LegalPolicyId } from "@/lib/legal/site-config";

function renderBlock(block: LegalBlock, key: string) {
  if (block.type === "paragraph") {
    return (
      <p key={key} className="mt-3 text-sm leading-7 text-[rgba(240,244,255,0.72)] sm:text-base">
        {block.text}
      </p>
    );
  }

  const ListTag = block.ordered ? "ol" : "ul";
  return (
    <ListTag
      key={key}
      className={`mt-3 space-y-2 pl-5 text-sm leading-7 text-[rgba(240,244,255,0.72)] sm:text-base ${
        block.ordered ? "list-decimal" : "list-disc"
      }`}
    >
      {block.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ListTag>
  );
}

export default function LegalPolicyPage({ policyId }: { policyId: LegalPolicyId }) {
  const site = getRequestLegalSite();
  if (!isPolicyAvailableOnSite(site.id, policyId)) {
    notFound();
  }

  const policy = getPolicyDocument(site, policyId);
  const policyLinks = getLegalNavItems(site.id, false);

  return (
    <div className="min-h-screen">
      <header className="border-b border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.72)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="font-heading text-xl text-[#F0F4FF]">
              {site.id === "mylivingpage" ? (
                <>
                  my<span className="text-[#3B82F6]">living</span>page
                </>
              ) : (
                site.brandName
              )}
            </Link>
            <Link href="/legal" className="text-xs uppercase tracking-[0.18em] text-[rgba(240,244,255,0.55)] hover:text-[#93C5FD]">
              Legal Index
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {policyLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  link.href === `/${policyId}`
                    ? "border-[rgba(59,130,246,0.45)] text-[#93C5FD]"
                    : "border-[rgba(255,255,255,0.16)] text-[rgba(240,244,255,0.58)] hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <article className="glass-card rounded-2xl p-5 sm:p-8 md:p-10">
          <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Last updated: {policy.lastUpdated}</p>
          <h1 className="mt-3 font-heading text-3xl font-bold text-[#F0F4FF] sm:text-4xl">{policy.title}</h1>
          <p className="mt-4 text-sm leading-7 text-[rgba(240,244,255,0.7)] sm:text-base">{policy.summary}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            {policy.sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-full border border-[rgba(255,255,255,0.14)] px-3 py-1 text-xs text-[rgba(240,244,255,0.58)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
              >
                {section.heading}
              </a>
            ))}
          </div>

          <div className="mt-8 space-y-8">
            {policy.sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="font-heading text-2xl text-[#F0F4FF]">{section.heading}</h2>
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
