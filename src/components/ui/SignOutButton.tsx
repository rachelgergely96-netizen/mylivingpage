"use client";

import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  const signOut = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <button
      type="button"
      onClick={signOut}
      className="rounded-full border border-[rgba(255,255,255,0.18)] px-4 py-2 text-xs uppercase tracking-[0.16em] text-[rgba(245,240,235,0.7)] transition-colors hover:border-[rgba(212,166,84,0.35)] hover:text-[#F0D48A]"
    >
      Sign Out
    </button>
  );
}
