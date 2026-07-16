"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface PageOwnerBarProps {
  pageId: string;
  pageUserId: string;
  children: ReactNode;
}

const ownerBarSafeAreaStyle = {
  paddingTop: "env(safe-area-inset-top, 0px)",
};

export default function PageOwnerBar({ pageId, pageUserId, children }: PageOwnerBarProps) {
  const router = useRouter();
  const [isOwner, setIsOwner] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const check = async () => {
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id === pageUserId) {
        setIsOwner(true);
      }
    };
    check();
  }, [pageUserId]);

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
    <div className="relative flex h-full min-h-0 flex-col">
      {isOwner ? (
        <>
          <div aria-hidden="true" className="shrink-0" style={ownerBarSafeAreaStyle}>
            <div className="h-16 sm:h-[4.5rem]" />
          </div>
          <div className="fixed left-0 right-0 top-0 z-50" style={ownerBarSafeAreaStyle}>
            <div className="profile-window mx-2 mt-2 flex min-h-14 max-w-6xl items-center justify-between gap-2 px-2.5 sm:mx-4 sm:gap-3 sm:px-3 lg:mx-auto">
              <div className="flex min-w-0 items-center gap-3">
                <Link
                  href="/dashboard"
                  className="flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2 py-2 text-xs font-semibold text-[#BFDBFE] transition-colors hover:text-white"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  Profile home
                </Link>
                <span className="profile-status !hidden text-[#86EFAC] sm:!inline-flex">owner preview</span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <Link
                  href={`/dashboard/edit/${pageId}/living-page`}
                  className="profile-action min-h-9 whitespace-nowrap px-3 py-1 text-[11px] uppercase tracking-[0.1em] sm:px-4"
                >
                  Edit profile
                </Link>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="min-h-9 whitespace-nowrap rounded-md border border-[rgba(255,120,120,0.25)] px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-[rgba(255,142,142,0.72)] transition-colors hover:border-[rgba(255,120,120,0.5)] hover:bg-[rgba(255,120,120,0.08)] hover:text-[#ffb4b4] disabled:opacity-50 sm:px-4"
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
