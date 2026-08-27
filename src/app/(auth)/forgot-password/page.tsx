"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import AuthMessage from "@/components/auth/AuthMessage";
import { getFriendlyAuthErrorMessage } from "@/lib/auth-errors";
import { buildPasswordRecoveryHref } from "@/lib/auth/password-recovery";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [loginHref, setLoginHref] = useState("/login");

  useEffect(() => {
    const requestedNext = new URLSearchParams(window.location.search).get("next");
    setLoginHref(buildPasswordRecoveryHref("/login", requestedNext));
  }, []);

  const clearErrorState = () => {
    if (status !== "error" && !message) {
      return;
    }

    setStatus("idle");
    setMessage("");
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const supabase = createBrowserSupabaseClient();
      const requestedNext = new URLSearchParams(window.location.search).get("next");
      const resetPasswordHref = buildPasswordRecoveryHref(
        "/reset-password",
        requestedNext,
      );
      const redirectTo = new URL(
        resetPasswordHref,
        window.location.origin,
      ).toString();
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setStatus("sent");
      setMessage("Check your email for a password reset link.");
    } catch (error) {
      setStatus("error");
      setMessage(
        getFriendlyAuthErrorMessage(
          error instanceof Error ? error.message : null,
          "We couldn't send the reset link. Check the email address and try again.",
        ),
      );
    }
  };

  return (
    <main id="main-content" data-site-ui className="mx-auto flex w-full max-w-[30rem] flex-1 items-center px-5 py-10 sm:px-6 sm:py-14">
      <div className="site-panel-raised w-full p-6 sm:p-8">
        <p className="site-eyebrow">Password reset</p>
        <h1 className="site-page-title mt-3">Forgot your password?</h1>
        <p className="mt-3 text-sm leading-6 text-site-secondary">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>

        {status === "sent" ? (
          <div className="mt-6">
            <AuthMessage id="forgot-message" tone="success">
              {message}
            </AuthMessage>
            <Link
              href={loginHref}
              className="site-button site-button-primary mt-6"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label htmlFor="forgot-email" className="mb-2 block text-sm font-semibold text-site-text">
                Email address
              </label>
              <input
                id="forgot-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  clearErrorState();
                  setEmail(e.target.value);
                }}
                required
                placeholder="you@example.com"
                aria-invalid={status === "error"}
                aria-describedby={status === "error" ? "forgot-message" : undefined}
                className="site-field px-4"
              />
            </div>
            <button
              type="submit"
              disabled={status === "loading"}
              className="site-button site-button-primary w-full disabled:cursor-wait disabled:opacity-70"
            >
              {status === "loading" ? "Sending…" : "Send reset link"}
            </button>
            {status === "error" ? (
              <AuthMessage id="forgot-message" tone="danger">
                {message}
              </AuthMessage>
            ) : null}
          </form>
        )}

        <p className="mt-6 border-t border-site-border pt-5 text-sm text-site-secondary">
          Remember your password?{" "}
          <Link
            href={loginHref}
            className="-my-2 inline-block py-2 font-semibold text-site-action hover:text-site-action-hover"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
