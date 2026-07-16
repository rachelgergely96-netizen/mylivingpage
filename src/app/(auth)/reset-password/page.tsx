"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
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
    <AuthShell
      eyebrow="Password reset"
      title="Set New Password"
      description="Choose a new password to get back to your private profile workspace."
    >
        {!ready ? (
          <div className="profile-panel p-4">
            <p role="status" className="text-sm text-[rgba(240,244,255,0.72)]">Verifying reset link...</p>
            <p className="mt-3 text-sm text-[rgba(240,244,255,0.35)]">
              If this takes too long, your link may have expired.{" "}
              <Link href="/forgot-password" className="profile-link">
                Request a new one
              </Link>
            </p>
          </div>
        ) : status === "success" ? (
          <div className="profile-panel p-4">
            <p role="status" className="text-sm text-[#86EFAC]">{message}</p>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label htmlFor="new-password" className="mb-2 block text-xs font-medium text-[rgba(240,244,255,0.72)]">
                New password
              </label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="New password (min 8 characters)"
              className="h-12 w-full rounded-md border border-[rgba(147,197,253,0.2)] bg-[rgba(255,255,255,0.035)] px-4 text-sm text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.35)] focus:border-[#60A5FA] focus:outline-none"
            />
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-2 block text-xs font-medium text-[rgba(240,244,255,0.72)]">
                Confirm password
              </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Confirm password"
              className="h-12 w-full rounded-md border border-[rgba(147,197,253,0.2)] bg-[rgba(255,255,255,0.035)] px-4 text-sm text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.35)] focus:border-[#60A5FA] focus:outline-none"
            />
            </div>
            <button
              type="submit"
              disabled={status === "loading"}
              className="gold-pill mt-2 h-12 w-full text-sm font-semibold transition-all duration-300 ease-soft hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)] disabled:opacity-70"
            >
              {status === "loading" ? "Updating..." : "Reset Password"}
            </button>
            {status === "error" && <p role="alert" className="border border-[rgba(255,142,142,0.2)] bg-[rgba(255,142,142,0.07)] px-3 py-2 text-sm text-[#ffb4b4]">{message}</p>}
          </form>
        )}
    </AuthShell>
  );
}
