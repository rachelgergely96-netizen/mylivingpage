"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import AuthMessage from "@/components/auth/AuthMessage";
import AuthDestinationNotice from "@/components/auth/AuthDestinationNotice";
import { buildGoogleAuthStartUrl } from "@/lib/auth/callback-url";
import { getAuthErrorMessage } from "@/lib/auth/auth-error";
import { getFriendlyAuthErrorMessage } from "@/lib/auth-errors";
import { sanitizeInternalRedirectPath } from "@/lib/auth/internal-redirect";
import { buildPasswordRecoveryHref } from "@/lib/auth/password-recovery";
import {
  resolvePostLoginDestination,
  withPostLoginWelcome,
} from "@/lib/auth/post-login";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const SESSION_CHECK_DELAYS_MS = [0, 150, 350, 700];

interface ServerSessionState {
  hasLivingPage: boolean | null;
  ready: boolean;
}

async function waitForServerSession(): Promise<ServerSessionState> {
  for (const delayMs of SESSION_CHECK_DELAYS_MS) {
    if (delayMs > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }

    try {
      const response = await fetch("/api/profile", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      if (response.status !== 401) {
        if (!response.ok) {
          return { hasLivingPage: null, ready: true };
        }

        const profile = (await response.json()) as {
          hasLivingPage?: boolean | null;
          latestPage?: unknown;
        };
        return {
          hasLivingPage:
            typeof profile.hasLivingPage === "boolean"
              ? profile.hasLivingPage
              : profile.hasLivingPage === null
                ? null
                : Boolean(profile.latestPage),
          ready: true,
        };
      }
    } catch {
      // Retry until we exhaust the short session-finalization window.
    }
  }

  return { hasLivingPage: null, ready: false };
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [pendingAction, setPendingAction] = useState<"email" | "google" | null>(null);
  const [message, setMessage] = useState("");
  const [nextPath, setNextPath] = useState("/dashboard");
  const [destinationPath, setDestinationPath] = useState<string | null>(null);
  // Carry the destination through to signup only when the URL actually asked
  // for one, so a funnel visitor (next=/create?ref=…) who switches to signup
  // keeps their intent, while a bare /login still links to a bare /signup.
  const [createAccountHref, setCreateAccountHref] = useState("/signup");
  const [forgotPasswordHref, setForgotPasswordHref] =
    useState("/forgot-password");

  useEffect(() => {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const requestedNext = params.get("next");
    const resolvedNext = sanitizeInternalRedirectPath(
      requestedNext,
      "/dashboard",
    );
    const visibleNext = requestedNext
      ? sanitizeInternalRedirectPath(requestedNext, "")
      : "";
    setDestinationPath(visibleNext || null);
    setNextPath(resolvedNext);
    setCreateAccountHref(
      requestedNext
        ? `/signup?next=${encodeURIComponent(resolvedNext)}`
        : "/signup",
    );
    setForgotPasswordHref(
      buildPasswordRecoveryHref("/forgot-password", requestedNext),
    );

    const error = params.get("error");
    if (error) {
      setStatus("error");
      setMessage(getAuthErrorMessage(error));
      params.delete("error");
      const nextUrl = `${url.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      window.history.replaceState({}, "", nextUrl);
    }
  }, []);

  const clearErrorState = () => {
    if (status !== "error" && !message) {
      return;
    }

    setStatus("idle");
    setMessage("");
  };

  const onLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setPendingAction("email");
    setMessage("");
    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setStatus("error");
        setPendingAction(null);
        setMessage(getFriendlyAuthErrorMessage(error.message, "Unable to sign in. Please try again."));
        return;
      }
      if (!data.session) {
        throw new Error("Sign-in succeeded but no session was created.");
      }
      const serverSession = await waitForServerSession();
      if (!serverSession.ready) {
        throw new Error(
          "Sign-in succeeded, but the session could not be finalized. Please try again.",
        );
      }
      // Track login (fire-and-forget)
      fetch("/api/auth/track-login", { method: "POST" }).catch(() => {});
      window.location.replace(
        resolvePostLoginDestination(nextPath, serverSession.hasLivingPage),
      );
    } catch (error) {
      setStatus("error");
      setPendingAction(null);
      setMessage(
        error instanceof Error && error.message
          ? error.message
          : "Unable to sign in. Please try again.",
      );
    }
  };

  const onGoogleLogin = async () => {
    setStatus("loading");
    setPendingAction("google");
    setMessage("");
    try {
      const googleAuthUrl = buildGoogleAuthStartUrl({
        next: withPostLoginWelcome(nextPath),
        screen: "login",
      });
      window.location.assign(googleAuthUrl);
    } catch (error) {
      setStatus("error");
      setPendingAction(null);
      setMessage(error instanceof Error ? getAuthErrorMessage(error.message) : "Google login failed.");
    }
  };

  return (
    <main
      id="main-content"
      data-site-ui
      className="mx-auto flex w-full max-w-[30rem] flex-1 items-center px-5 py-10 sm:px-6 sm:py-14"
    >
      <div className="site-panel-raised w-full p-6 sm:p-8">
        <p className="site-eyebrow">Welcome back</p>
        <h1 className="site-page-title mt-3">Sign in to MyLivingPage</h1>
        <p className="mt-3 text-sm leading-6 text-site-secondary">
          Keep your professional page, résumé PDF, and sharing tools current
          from one place.
        </p>
        <AuthDestinationNotice action="signin" path={destinationPath} />

        <button
          type="button"
          onClick={onGoogleLogin}
          disabled={status === "loading"}
          className="site-button site-button-secondary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pendingAction === "google" ? "Redirecting to Google…" : "Continue with Google"}
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-site-muted">
          <div className="h-px flex-1 bg-site-border" />
          Or
          <div className="h-px flex-1 bg-site-border" />
        </div>

        <form className="space-y-4" onSubmit={onLogin}>
          <div>
            <label
              htmlFor="login-email"
              className="mb-2 block text-sm font-semibold text-site-text"
            >
              Email address
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                clearErrorState();
                setEmail(event.target.value);
              }}
              required
              placeholder="you@example.com"
              aria-invalid={status === "error"}
              aria-describedby={message ? "login-message" : undefined}
              className="site-field px-4"
            />
          </div>
          <div>
            <label
              htmlFor="login-password"
              className="mb-2 block text-sm font-semibold text-site-text"
            >
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                clearErrorState();
                setPassword(event.target.value);
              }}
              required
              aria-invalid={status === "error"}
              aria-describedby={message ? "login-message" : undefined}
              className="site-field px-4"
            />
          </div>
          <button
            type="submit"
            disabled={status === "loading"}
            className="site-button site-button-primary w-full disabled:cursor-wait disabled:opacity-70"
          >
            {pendingAction === "email" ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {message ? (
          <AuthMessage id="login-message" tone="danger" className="mt-4">
            {message}
          </AuthMessage>
        ) : null}

        <div className="mt-3 text-right">
          <Link
            href={forgotPasswordHref}
            className="-my-2 inline-flex min-h-11 items-center text-sm font-medium text-site-action hover:text-site-action-hover"
          >
            Forgot password?
          </Link>
        </div>

        <p className="mt-5 border-t border-site-border pt-5 text-sm text-site-secondary">
          New here?{" "}
          <Link
            href={createAccountHref}
            className="-my-2 inline-block py-2 font-semibold text-site-action hover:text-site-action-hover"
          >
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
