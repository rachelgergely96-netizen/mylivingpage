"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clearBrowserLocalDraftStorage } from "@/hooks/useLocalDraft";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function SignOutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const signOut = async () => {
    if (pending) return;
    setPending(true);
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
      clearBrowserLocalDraftStorage();
      router.replace("/login");
    } catch {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={pending}
      className={`site-nav-link shrink-0 disabled:opacity-50 ${className}`}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
