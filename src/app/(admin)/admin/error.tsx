"use client";

import styles from "@/components/admin/AdminExperience.module.css";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className={styles.page}>
      <section className="site-danger-panel p-6 sm:p-8">
        <p className="site-eyebrow text-site-danger">Admin data unavailable</p>
        <h1 className="site-page-title mt-2">This view could not load safely.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-site-secondary">
          The underlying data request failed, so this view shows an error instead
          of an empty dashboard. Try again, and check system health if the problem
          continues.
        </p>
        <button type="button" onClick={reset} className="site-button site-button-primary mt-5">
          Try again
        </button>
      </section>
    </main>
  );
}
