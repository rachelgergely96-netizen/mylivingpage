"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { buildGoogleAuthStartUrl, sanitizeAuthRedirectPath } from "@/lib/auth/callback-url";
import { getAuthErrorMessage, getPasswordAuthErrorMessage } from "@/lib/auth/auth-error";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const SESSION_CHECK_DELAYS_MS = [0, 150, 350, 700];

async function waitForServerSession() {
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
        return true;
      }
    } catch {
      // Retry until we exhaust the short session-finalization window.
    }
  }

  return false;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const [nextPath, setNextPath] = useState("/dashboard");

  useEffect(() => {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const next = params.get("next");
    setNextPath(sanitizeAuthRedirectPath(next));

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
    setMessage("");
    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw error;
      }
      if (!data.session) {
        throw new Error("Sign-in succeeded but no session was created.");
      }
      const serverSessionReady = await waitForServerSession();
      if (!serverSessionReady) {
        throw new Error("Sign-in succeeded, but the session could not be finalized. Please try again.");
      }
      // Track login (fire-and-forget)
      fetch("/api/auth/track-login", { method: "POST" }).catch(() => {});
      window.location.replace(nextPath);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? getPasswordAuthErrorMessage(error.message)
          : "Unable to sign in.",
      );
    }
  };

  const onGoogleLogin = async () => {
    setStatus("loading");
    setMessage("");
    try {
      const googleAuthUrl = buildGoogleAuthStartUrl({
        next: nextPath,
        screen: "login",
      });
      window.location.assign(googleAuthUrl);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? getAuthErrorMessage(error.message) : "Google login failed.");
    }
  };

  const signupHref = `/signup?next=${encodeURIComponent(nextPath === "/dashboard" ? "/create" : nextPath)}`;

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Keep your resume current."
      description="Sign in to update your page, download a fresh PDF, or create your next share card."
    >
        <button
          type="button"
          onClick={onGoogleLogin}
          disabled={status === "loading"}
          className="h-12 w-full rounded-xl border border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.025)] px-5 text-sm font-medium text-[rgba(240,244,255,0.82)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[#BFDBFE] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" ? "Redirecting to Google..." : "Continue with Google"}
        </button>

        <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-[rgba(240,244,255,0.25)]">
          <div className="h-px flex-1 bg-[rgba(255,255,255,0.1)]" />
          Or
          <div className="h-px flex-1 bg-[rgba(255,255,255,0.1)]" />
        </div>

        <form className="space-y-4" onSubmit={onLogin}>
          <div>
            <label htmlFor="login-email" className="mb-2 block text-xs font-medium text-[rgba(240,244,255,0.72)]">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => {
                clearErrorState();
                setEmail(event.target.value);
              }}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="h-12 w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.035)] px-4 text-sm text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.32)] focus:border-[#60A5FA] focus:outline-none"
            />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="login-password" className="text-xs font-medium text-[rgba(240,244,255,0.72)]">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs text-[rgba(240,244,255,0.45)] hover:text-[#93C5FD]">
                Forgot password?
              </Link>
            </div>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => {
                clearErrorState();
                setPassword(event.target.value);
              }}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              className="h-12 w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.035)] px-4 text-sm text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.32)] focus:border-[#60A5FA] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={status === "loading"}
            className="gold-pill mt-1 h-12 w-full text-sm font-semibold transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)] disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {status === "loading" ? "Signing in..." : "Sign In and Keep Building"}
          </button>
        </form>

        {message ? (
          <p role="alert" className="mt-4 rounded-xl border border-[rgba(255,142,142,0.2)] bg-[rgba(255,142,142,0.07)] px-4 py-3 text-sm text-[#ffb4b4]">
            {message}
          </p>
        ) : null}

        <p className="mt-5 text-sm text-[rgba(240,244,255,0.5)]">
          New here?{" "}
          <Link href={signupHref} className="font-semibold text-[#60A5FA] hover:text-[#BFDBFE]">
            Create your free resume
          </Link>
        </p>
    </AuthShell>
  );
}
