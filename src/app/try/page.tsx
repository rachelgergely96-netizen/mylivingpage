import type { Metadata } from "next";
import Link from "next/link";
import TryYourResume from "@/components/marketing/TryYourResume";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "See your résumé as a living page",
  description:
    "Paste your résumé and watch it become a living professional page, right in your browser. No account, no upload, no AI reading it.",
  alternates: {
    canonical: absoluteUrl("/try"),
  },
};

export default function TryPage() {
  return (
    <main id="main-content" tabIndex={-1} className="site-container py-8 sm:py-12">
      <div className="max-w-3xl">
        <p className="site-eyebrow">Try it first</p>
        <h1 className="site-page-title mt-2">
          See your own résumé as a living page
        </h1>
        <p className="mt-3 text-base leading-7 text-site-secondary">
          Paste it below and the page builds on this device. No account, nothing uploaded,
          nothing published — decide afterwards whether you want to keep it.
        </p>
        <p className="mt-3 text-sm leading-6 text-site-muted">
          Have your résumé as a PDF or Word file?{" "}
          <Link href="/signup?next=%2Fcreate" className="site-link">
            Create a free account
          </Link>{" "}
          and you can upload it directly.
        </p>
      </div>

      <div className="mt-8">
        <TryYourResume />
      </div>

      <p className="mt-10 max-w-3xl text-xs leading-5 text-site-muted">
        {SITE_NAME} builds one living professional page and a matching ATS-ready résumé PDF
        from a single source you control.
      </p>
    </main>
  );
}
