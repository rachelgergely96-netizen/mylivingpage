"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  // Supabase redirects here with a hash fragment containing the access token.
  // The browser client picks it up automatically via onAuthStateChange.
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    // Also check if already in a session (page reload)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setStatus("error");
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    setStatus("loading");
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setStatus("success");
      setMessage("Password updated! Redirecting...");
      setTimeout(() => router.replace("/dashboard"), 2000);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to reset password.");
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-6 py-16">
      <div className="glass-card w-full rounded-2xl p-7 md:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Password Reset</p>
        <h1 className="mt-2 font-heading text-4xl font-bold text-[#F0F4FF]">Set New Password</h1>

        {!ready ? (
          <div className="mt-6">
            <p className="text-sm text-[rgba(240,244,255,0.55)]">Verifying reset link...</p>
            <p className="mt-3 text-sm text-[rgba(240,244,255,0.35)]">
              If this takes too long, your link may have expired.{" "}
              <Link href="/forgot-password" className="text-[#3B82F6] hover:text-[#93C5FD]">
                Request a new one
              </Link>
            </p>
          </div>
        ) : status === "success" ? (
          <div className="mt-6">
            <p className="text-sm text-[#4ade80]">{message}</p>
          </div>
        ) : (
          <form className="mt-6 space-y-3" onSubmit={onSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="New password (min 8 characters)"
              className="h-12 w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] px-4 text-sm text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.35)] focus:border-[#3B82F6] focus:outline-none"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Confirm password"
              className="h-12 w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] px-4 text-sm text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.35)] focus:border-[#3B82F6] focus:outline-none"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="gold-pill mt-2 h-12 w-full text-sm font-semibold transition-all duration-300 ease-soft hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)] disabled:opacity-70"
            >
              {status === "loading" ? "Updating..." : "Reset Password"}
            </button>
            {status === "error" && <p className="text-sm text-[#ff8e8e]">{message}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
