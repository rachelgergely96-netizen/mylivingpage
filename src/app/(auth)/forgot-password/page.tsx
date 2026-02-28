"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
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
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-6 py-16">
      <div className="glass-card w-full rounded-2xl p-7 md:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Password Reset</p>
        <h1 className="mt-2 font-heading text-4xl font-bold text-[#F0F4FF]">Forgot Password</h1>
        <p className="mt-2 text-sm leading-7 text-[rgba(240,244,255,0.55)]">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>

        {status === "sent" ? (
          <div className="mt-6">
            <p className="text-sm text-[#3B82F6]">{message}</p>
            <Link
              href="/login"
              className="mt-6 inline-block text-xs uppercase tracking-[0.16em] text-[rgba(240,244,255,0.5)] hover:text-[#3B82F6]"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form className="mt-6 space-y-3" onSubmit={onSubmit}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Email address"
              className="h-12 w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] px-4 text-sm text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.35)] focus:border-[#3B82F6] focus:outline-none"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="gold-pill mt-2 h-12 w-full text-sm font-semibold transition-all duration-300 ease-soft hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)] disabled:opacity-70"
            >
              {status === "loading" ? "Sending..." : "Send Reset Link"}
            </button>
            {status === "error" && <p className="text-sm text-[#ff8e8e]">{message}</p>}
          </form>
        )}

        <p className="mt-5 text-sm text-[rgba(240,244,255,0.45)]">
          Remember your password?{" "}
          <Link href="/login" className="text-[#3B82F6] hover:text-[#93C5FD]">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
