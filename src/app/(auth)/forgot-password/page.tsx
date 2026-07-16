"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const supabase = createBrowserSupabaseClient();
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setStatus("sent");
      setMessage("Check your email for a password reset link.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  return (
    <AuthShell
      eyebrow="Password reset"
      title="Forgot Password"
      description="Enter your email address and we’ll send you a secure link to reset your password."
    >
        {status === "sent" ? (
          <div className="profile-panel p-4">
            <p role="status" className="text-sm text-[#86EFAC]">{message}</p>
            <Link
              href="/login"
              className="profile-link mt-4 inline-block text-xs font-semibold"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label htmlFor="reset-email" className="mb-2 block text-xs font-medium text-[rgba(240,244,255,0.72)]">
                Email address
              </label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="Email address"
              className="h-12 w-full rounded-md border border-[rgba(147,197,253,0.2)] bg-[rgba(255,255,255,0.035)] px-4 text-sm text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.35)] focus:border-[#60A5FA] focus:outline-none"
            />
            </div>
            <button
              type="submit"
              disabled={status === "loading"}
              className="gold-pill mt-2 h-12 w-full text-sm font-semibold transition-all duration-300 ease-soft hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)] disabled:opacity-70"
            >
              {status === "loading" ? "Sending..." : "Send Reset Link"}
            </button>
            {status === "error" && <p role="alert" className="border border-[rgba(255,142,142,0.2)] bg-[rgba(255,142,142,0.07)] px-3 py-2 text-sm text-[#ffb4b4]">{message}</p>}
          </form>
        )}

        <p className="mt-5 text-sm text-[rgba(240,244,255,0.45)]">
          Remember your password?{" "}
          <Link href="/login" className="profile-link">
            Sign in
          </Link>
        </p>
    </AuthShell>
  );
}
