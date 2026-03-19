"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
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
    if (next && next.startsWith("/")) {
      setNextPath(next);
    }

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
      const params = new URLSearchParams({
        next: nextPath,
        screen: "login",
      });
      window.location.assign(`/api/auth/google?${params.toString()}`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? getAuthErrorMessage(error.message) : "Google login failed.");
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-6 py-16">
      <div className="glass-card w-full rounded-2xl p-7 md:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Welcome Back</p>
        <h1 className="mt-2 font-heading text-4xl font-bold text-[#F0F4FF]">Sign in to MyLivingPage</h1>

        <button
          type="button"
          onClick={onGoogleLogin}
          disabled={status === "loading"}
          className="mt-6 w-full rounded-full border border-[rgba(255,255,255,0.18)] px-5 py-3 text-sm text-[rgba(240,244,255,0.8)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "loading" ? "Redirecting to Google..." : "Continue with Google"}
        </button>

        <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-[rgba(240,244,255,0.25)]">
          <div className="h-px flex-1 bg-[rgba(255,255,255,0.1)]" />
          Or
          <div className="h-px flex-1 bg-[rgba(255,255,255,0.1)]" />
        </div>

        <form className="space-y-3" onSubmit={onLogin}>
          <input
            type="email"
            value={email}
            onChange={(event) => {
              clearErrorState();
              setEmail(event.target.value);
            }}
            required
            placeholder="Email address"
            className="h-12 w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] px-4 text-sm text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.35)] focus:border-[#3B82F6] focus:outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => {
              clearErrorState();
              setPassword(event.target.value);
            }}
            required
            placeholder="Password"
            className="h-12 w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] px-4 text-sm text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.35)] focus:border-[#3B82F6] focus:outline-none"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="gold-pill mt-2 h-12 w-full text-sm font-semibold transition-all duration-300 ease-soft hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)] disabled:opacity-70"
          >
            {status === "loading" ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {message ? <p className="mt-4 text-sm text-[#ff8e8e]">{message}</p> : null}

        <div className="mt-3 text-right">
          <Link href="/forgot-password" className="text-xs text-[rgba(240,244,255,0.4)] hover:text-[#3B82F6]">
            Forgot password?
          </Link>
        </div>

        <p className="mt-3 text-sm text-[rgba(240,244,255,0.45)]">
          New here?{" "}
          <Link href="/signup" className="text-[#3B82F6] hover:text-[#93C5FD]">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
