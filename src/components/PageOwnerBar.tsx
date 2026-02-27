"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface PageOwnerBarProps {
  pageId: string;
  pageUserId: string;
}

export default function PageOwnerBar({ pageId, pageUserId }: PageOwnerBarProps) {
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

  if (!isOwner) return null;

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
    <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 pb-2 pt-4 md:px-8">
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 text-xs text-[rgba(245,240,235,0.5)] transition-colors hover:text-[#F0D48A]"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Dashboard
      </Link>
      <div className="flex items-center gap-2">
        <Link
          href={`/dashboard/edit/${pageId}`}
          className="rounded-full border border-[rgba(212,166,84,0.3)] px-4 py-1.5 text-xs uppercase tracking-[0.14em] text-[#D4A654] transition-colors hover:bg-[rgba(212,166,84,0.08)] hover:text-[#F0D48A]"
        >
          Edit
        </Link>
        <button
          type="button"
          disabled={deleting}
          onClick={handleDelete}
          className="rounded-full border border-[rgba(255,120,120,0.25)] px-4 py-1.5 text-xs uppercase tracking-[0.14em] text-[rgba(255,120,120,0.6)] transition-colors hover:border-[rgba(255,120,120,0.4)] hover:text-[#ff8e8e] disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
