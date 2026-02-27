"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface MadeWithBadgeProps {
  pageUserId: string;
}

export default function MadeWithBadge({ pageUserId }: MadeWithBadgeProps) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const check = async () => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id === pageUserId) return;
      setTimeout(() => setShow(true), 800);
    };
    check();
  }, [pageUserId]);

  if (!show || dismissed) return null;

  return (
    <div
      className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2"
      style={{ animation: "badgeFadeIn 0.4s ease-out forwards" }}
    >
      <style>{`@keyframes badgeFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div className="flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(26,10,46,0.85)] pl-4 pr-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(212,166,84,0.2)]">
        <Link
          href="/signup?utm_source=badge&utm_medium=livingpage"
          className="flex items-center gap-2.5 py-2.5 pr-2 text-[13px] sm:text-sm"
        >
          <span className="text-[#D4A654]">✦</span>
          <span className="whitespace-nowrap text-[rgba(245,240,235,0.7)]">
            Create your own{" "}
            <span className="font-heading font-bold text-[#F5F0EB]">
              my<span className="text-[#D4A654]">living</span>page
            </span>
          </span>
          <span className="text-[rgba(245,240,235,0.35)]">&rarr;</span>
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="flex h-6 w-6 items-center justify-center rounded-full text-[rgba(245,240,235,0.3)] transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-[rgba(245,240,235,0.6)]"
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
