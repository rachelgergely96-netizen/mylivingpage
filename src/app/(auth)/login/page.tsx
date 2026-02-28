"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const [nextPath, setNextPath] = useState("/dashboard");

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next");
    if (next && next.startsWith("/")) {
      setNextPath(next);
    }
  }, []);

  const onLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw error;
      }
      router.refresh();
      router.replace(nextPath);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
    }
  };

  const onGoogleLogin = async () => {
    setStatus("loading");
    setMessage("");
    try {
      const supabase = createBrowserSupabaseClient();
      const redirectTo = `${window.location.origin}/callback?next=${encodeURIComponent(nextPath)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });
      if (error) {
        throw error;
      }
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Google login failed.");
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
          className="mt-6 w-full rounded-full border border-[rgba(255,255,255,0.18)] px-5 py-3 text-sm text-[rgba(240,244,255,0.8)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
        >
          Continue with Google
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
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="Email address"
            className="h-12 w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] px-4 text-sm text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.35)] focus:border-[#3B82F6] focus:outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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

        <p className="mt-5 text-sm text-[rgba(240,244,255,0.45)]">
          New here?{" "}
          <Link href="/signup" className="text-[#3B82F6] hover:text-[#93C5FD]">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
