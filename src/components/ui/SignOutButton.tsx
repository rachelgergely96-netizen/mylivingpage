"use client";

import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function SignOutButton({ className = "" }: { className?: string }) {
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
      className={`site-nav-link shrink-0 ${className}`}
    >
      Sign out
    </button>
  );
}
