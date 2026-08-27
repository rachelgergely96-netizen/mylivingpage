"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import AuthMessage from "@/components/auth/AuthMessage";
import ModeAwareLoadingIndicator from "@/components/motion/ModeAwareLoadingIndicator";
import { getFriendlyAuthErrorMessage } from "@/lib/auth-errors";
import {
  buildPasswordRecoveryHref,
  resolvePasswordRecoveryDestination,
} from "@/lib/auth/password-recovery";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [verification, setVerification] = useState<"verifying" | "ready" | "error">("verifying");
  const [postResetDestination, setPostResetDestination] =
    useState("/dashboard");
  const [forgotPasswordHref, setForgotPasswordHref] =
    useState("/forgot-password");
  const redirectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const requestedNext = new URLSearchParams(window.location.search).get("next");
    setPostResetDestination(
      resolvePasswordRecoveryDestination(requestedNext),
    );
    setForgotPasswordHref(
      buildPasswordRecoveryHref("/forgot-password", requestedNext),
    );
  }, []);

  // Supabase redirects here with a hash fragment containing the access token.
  // The browser client picks it up automatically via onAuthStateChange.
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let active = true;
    const verificationTimer = window.setTimeout(() => {
      if (!active) return;
      setVerification("error");
      setMessage("This reset link could not be verified. It may be expired or already used.");
    }, 5_000);

    const markReady = () => {
      if (!active) return;
      window.clearTimeout(verificationTimer);
      setVerification("ready");
      setMessage("");
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        markReady();
      }
    });
    return () => {
      active = false;
      window.clearTimeout(verificationTimer);
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
      }
      subscription.unsubscribe();
    };
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
    setMessage("");

    if (password.length < 8) {
      setStatus("error");
      setMessage("Password must be at least eight characters.");
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
      setMessage("Password updated. Redirecting…");
      const requestedNext = new URLSearchParams(window.location.search).get("next");
      const destination = resolvePasswordRecoveryDestination(requestedNext);
      setPostResetDestination(destination);
      redirectTimerRef.current = window.setTimeout(
        () => router.replace(destination),
        2000,
      );
    } catch (error) {
      setStatus("error");
      setMessage(
        getFriendlyAuthErrorMessage(
          error instanceof Error ? error.message : null,
          "Unable to reset the password. Request a new reset link and try again.",
        ),
      );
    }
  };

  return (
    <main id="main-content" data-site-ui className="mx-auto flex w-full max-w-[30rem] flex-1 items-center px-5 py-10 sm:px-6 sm:py-14">
      <div className="site-panel-raised w-full p-6 sm:p-8">
        <p className="site-eyebrow">Password reset</p>
        <h1 className="site-page-title mt-3">Set a new password</h1>

        {verification === "verifying" ? (
          <div className="mt-6">
            <p role="status" className="flex items-center gap-2 text-sm text-site-secondary">
              <ModeAwareLoadingIndicator size="sm" />
              Verifying reset link…
            </p>
          </div>
        ) : verification === "error" ? (
          <div className="mt-6">
            <AuthMessage id="reset-message" tone="danger">
              {message}
            </AuthMessage>
            <p className="mt-4 text-sm text-site-muted">
              <Link
                href={forgotPasswordHref}
                className="-my-2 inline-block py-2 font-semibold text-site-action hover:text-site-action-hover"
              >
                Request a new reset link
              </Link>
            </p>
          </div>
        ) : status === "success" ? (
          <div className="mt-6">
            <AuthMessage id="reset-message" tone="success">
              {message}
            </AuthMessage>
            <Link href={postResetDestination} className="site-button site-button-primary mt-6">
              {postResetDestination === "/dashboard" ? "Go to dashboard" : "Continue"}
            </Link>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label htmlFor="new-password" className="mb-2 block text-sm font-semibold text-site-text">
                New password
              </label>
              <input
                id="new-password"
                name="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  clearErrorState();
                  setPassword(e.target.value);
                }}
                required
                minLength={8}
                aria-invalid={status === "error"}
                aria-describedby={status === "error" ? "reset-password-help reset-message" : "reset-password-help"}
                className="site-field px-4"
              />
              <p id="reset-password-help" className="mt-2 text-xs text-site-muted">
                Use at least eight characters.
              </p>
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold text-site-text">
                Confirm password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  clearErrorState();
                  setConfirmPassword(e.target.value);
                }}
                required
                minLength={8}
                aria-invalid={status === "error"}
                aria-describedby={status === "error" ? "reset-message" : undefined}
                className="site-field px-4"
              />
            </div>
            <button
              type="submit"
              disabled={status === "loading"}
              className="site-button site-button-primary w-full disabled:cursor-wait disabled:opacity-70"
            >
              {status === "loading" ? "Updating…" : "Reset password"}
            </button>
            {status === "error" ? (
              <AuthMessage id="reset-message" tone="danger">
                {message}
              </AuthMessage>
            ) : null}
          </form>
        )}

        {verification !== "error" && status !== "success" ? (
          <p className="mt-5 border-t border-site-border pt-5 text-sm text-site-secondary">
            Link not working?{" "}
            <Link
              href={forgotPasswordHref}
              className="-my-2 inline-block py-2 font-semibold text-site-action hover:text-site-action-hover"
            >
              Request a new reset link
            </Link>
          </p>
        ) : null}
      </div>
    </main>
  );
}
