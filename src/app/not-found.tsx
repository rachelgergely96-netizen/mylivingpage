import Link from "next/link";

export default function NotFound() {
  return (
    <main className="site-shell flex min-h-screen items-center px-5 py-16" data-site-ui>
      <div className="site-panel-raised mx-auto w-full max-w-2xl p-6 sm:p-10">
        <Link href="/" className="site-wordmark">my<span>living</span>page</Link>
        <p className="site-eyebrow mt-12">404 · Page not found</p>
        <h1 className="site-page-title mt-3">This page is not available.</h1>
        <p className="site-muted mt-5 max-w-xl leading-7">
          The link may have changed, the page may be private, or the address may have been typed incorrectly.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="site-button site-button-primary">Go to the homepage</Link>
          <Link href="/login?next=/dashboard" className="site-button site-button-secondary">Open your account</Link>
        </div>
      </div>
    </main>
  );
}
