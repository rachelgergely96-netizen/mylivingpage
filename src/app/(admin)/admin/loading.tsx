export default function Loading() {
  return (
    <main className="mx-auto w-[min(100%-2.5rem,90rem)] py-10">
      <div className="site-panel flex w-full max-w-sm items-center gap-4 p-5" role="status" aria-live="polite">
        <span className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-site-border border-t-site-action" aria-hidden="true" />
        <div>
          <p className="font-semibold text-site-text">Loading admin data</p>
          <p className="mt-1 text-sm text-site-muted">This should only take a moment.</p>
        </div>
      </div>
    </main>
  );
}
