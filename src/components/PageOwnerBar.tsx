"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PageOwnerBarProps {
  pageId: string;
  isOwner: boolean;
  children: ReactNode;
}

const ownerBarSafeAreaStyle = {
  paddingTop: "env(safe-area-inset-top, 0px)",
};

export default function PageOwnerBar({ pageId, isOwner, children }: PageOwnerBarProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this page? This action cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/pages/${pageId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to delete page.");
      }
      router.push("/dashboard");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Unable to delete page.");
      setDeleting(false);
    }
  };

  return (
    <div className="relative flex h-full flex-col">
      {isOwner ? (
        <>
          <div aria-hidden="true" className="shrink-0" style={ownerBarSafeAreaStyle}>
            <div className="h-16 sm:h-[4.5rem]" />
          </div>
          <div className="fixed left-0 right-0 top-0 z-50 border-b border-site-border bg-site-canvas" style={ownerBarSafeAreaStyle} data-site-ui>
            <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-2 px-3 sm:min-h-[4.5rem] sm:gap-3 sm:px-4 md:px-8">
              <Link
                href="/dashboard"
                className="site-nav-link shrink-0 gap-1.5 whitespace-nowrap"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Your Page
              </Link>
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <Link
                  href={`/dashboard/edit/${pageId}/living-page`}
                  className="site-button site-button-secondary whitespace-nowrap px-3 py-2 text-xs sm:px-4"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="site-button site-button-danger whitespace-nowrap px-3 py-2 text-xs disabled:opacity-50 sm:px-4"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
      <div className="min-h-0 flex-1">
        {children}
      </div>
    </div>
  );
}
