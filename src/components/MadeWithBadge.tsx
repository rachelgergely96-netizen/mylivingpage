"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function MadeWithBadge() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timerId: number | null = null;

    const check = async () => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id || cancelled) {
        return;
      }

      timerId = window.setTimeout(() => {
        if (!cancelled) setShow(true);
      }, 800);
    };

    void check();

    return () => {
      cancelled = true;
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, []);

  if (!show || dismissed) return null;

  return (
    <div
      data-testid="public-page-signup-prompt"
      className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2"
    >
      <style>{`@keyframes badgeFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div
        className="profile-window flex items-center gap-1.5 pl-3 pr-1.5"
        style={{ animation: "badgeFadeIn 0.4s ease-out forwards" }}
      >
        <Link
          href="/signup?ref=public_page_prompt&next=/create"
          className="flex items-center gap-2.5 py-2.5 pr-2 text-[13px] sm:text-sm"
        >
          <span className="profile-status text-[#86EFAC]" aria-hidden="true" />
          <span className="whitespace-nowrap text-[rgba(240,244,255,0.7)]">
            Make your own{" "}
            <span className="font-heading font-bold text-[#F0F4FF]">
              Living Page
            </span>
          </span>
          <span className="text-[rgba(240,244,255,0.35)]">&rarr;</span>
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[rgba(240,244,255,0.42)] transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-[rgba(240,244,255,0.72)]"
          aria-label="Dismiss"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
