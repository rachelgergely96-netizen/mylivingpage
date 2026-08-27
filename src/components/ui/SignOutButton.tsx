"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { clearBrowserLocalDraftStorage } from "@/hooks/useLocalDraft";
import { completeClientSignOut } from "@/lib/auth/client-sign-out";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function SignOutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  const signOut = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      await completeClientSignOut({
        signOut: () => supabase.auth.signOut(),
        clearLocalDrafts: clearBrowserLocalDraftStorage,
      });
      router.replace("/login");
    } catch {
      setError("We couldn't sign you out. Check your connection and try again.");
      setPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void signOut()}
        disabled={pending}
        aria-busy={pending || undefined}
        aria-describedby={error ? errorId : undefined}
        className={`site-nav-link shrink-0 disabled:opacity-50 ${className}`}
      >
        {pending ? "Signing out…" : error ? "Retry sign out" : "Sign out"}
      </button>
      {error ? (
        <span id={errorId} role="alert" className="sr-only">
          {error}
        </span>
      ) : null}
    </>
  );
}
