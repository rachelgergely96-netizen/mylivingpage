"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface ShareCardDownloadProps {
  pageUserId: string;
  slug: string;
  premium?: boolean;
}

export default function ShareCardDownload({ pageUserId, slug, premium = false }: ShareCardDownloadProps) {
  const [isOwner, setIsOwner] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const check = async () => {
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id === pageUserId) setIsOwner(true);
    };
    check();
  }, [pageUserId]);

  if (!isOwner) return null;
  if (!premium) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/${slug}/opengraph-image`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}-share-card.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Silently fail
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-48 z-40">
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(10,22,40,0.85)] px-4 py-2.5 text-[13px] sm:text-sm text-[rgba(240,244,255,0.7)] shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:text-[#93C5FD] hover:shadow-[0_8px_24px_rgba(59,130,246,0.2)] disabled:opacity-60 disabled:hover:translate-y-0"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
        </svg>
        <span>{downloading ? "Downloading..." : "Share Card"}</span>
      </button>
    </div>
  );
}
