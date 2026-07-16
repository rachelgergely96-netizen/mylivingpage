"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import TurnstileWidget from "@/components/auth/TurnstileWidget";
import {
  buildAuthCallbackUrl,
  buildGoogleAuthStartUrl,
  sanitizeAuthRedirectPath,
} from "@/lib/auth/callback-url";
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "@/lib/legal/legal-version";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const requiresCaptcha = Boolean(turnstileSiteKey);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [nextPath, setNextPath] = useState("/create");
  const [signupReferrer, setSignupReferrer] = useState<string | null>(null);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetNonce, setTurnstileResetNonce] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    setNextPath(sanitizeAuthRedirectPath(next, "/create"));
    const ref = params.get("ref") || params.get("utm_source") || null;
    if (ref) setSignupReferrer(ref);
  }, []);

  const signInNextPath =
    signupReferrer && nextPath.startsWith("/create") && !nextPath.includes("ref=")
      ? `${nextPath}${nextPath.includes("?") ? "&" : "?"}ref=${encodeURIComponent(signupReferrer)}`
      : nextPath;
  const signInHref = `/login?next=${encodeURIComponent(signInNextPath)}`;

  const onSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!acceptedLegal) {
      setStatus("error");
      setMessage("You must accept the Terms of Service and Privacy Policy to create an account.");
      return;
    }
    if (requiresCaptcha && !turnstileToken) {
      setStatus("error");
      setMessage("Please complete the verification check before creating your account.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const supabase = createBrowserSupabaseClient();
      const redirectTo = buildAuthCallbackUrl({
        next: nextPath,
        legalAcceptRequested: true,
        legalSource: "signup",
      });
      const signupMetadata: Record<string, string | boolean> = {
        legal_accepted: true,
        legal_accepted_at: new Date().toISOString(),
        legal_terms_version: TERMS_VERSION,
        legal_privacy_version: PRIVACY_VERSION,
      };
      if (signupReferrer) {
        signupMetadata.signup_referrer = signupReferrer;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          captchaToken: requiresCaptcha ? turnstileToken ?? undefined : undefined,
          emailRedirectTo: redirectTo,
          data: signupMetadata,
        },
      });
      if (error) {
        throw error;
      }

      if (data.session) {
        await fetch("/api/legal/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "signup" }),
        }).catch(() => {});

        window.location.replace(nextPath);
        return;
      }

      setStatus("success");
      setPassword("");
      setMessage("Check your email to confirm your account, then come back to build and publish your page.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to create account.");
    } finally {
      if (requiresCaptcha) {
        setTurnstileResetNonce((current) => current + 1);
      }
    }
  };

  const onGoogleSignup = async () => {
    if (!acceptedLegal) {
      setStatus("error");
      setMessage("You must accept the Terms of Service and Privacy Policy to continue with Google.");
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      const googleAuthUrl = buildGoogleAuthStartUrl({
        next: nextPath,
        screen: "signup",
        legalAcceptRequested: true,
        legalSource: "signup",
        ref: signupReferrer,
      });
      window.location.assign(googleAuthUrl);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Google signup failed.");
    }
  };

  if (status === "success") {
    return (
      <AuthShell
        eyebrow="Account created"
        title="Check your inbox."
        description="Confirm your email, then you will return to the guided builder to add your resume details."
      >
        <div className="rounded-2xl border border-[rgba(59,130,246,0.24)] bg-[rgba(59,130,246,0.09)] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#93C5FD]">
            Confirmation sent to
          </p>
          <p className="mt-2 break-all text-base font-semibold text-[#F0F4FF]">{email}</p>
          <ol className="mt-5 space-y-3 text-sm leading-6 text-[rgba(240,244,255,0.68)]">
            <li className="flex gap-3">
              <span className="font-mono text-[#93C5FD]">1.</span>
              Open the confirmation email from MyLivingPage.
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-[#93C5FD]">2.</span>
              Confirm your account to return to your private draft.
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-[#93C5FD]">3.</span>
              Add your details, preview, and publish only when you are ready.
            </li>
          </ol>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              setMessage("");
            }}
            className="rounded-full border border-[rgba(255,255,255,0.15)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-[rgba(240,244,255,0.7)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#BFDBFE]"
          >
            Use a different email
          </button>
          <Link href={signInHref} className="text-sm font-semibold text-[#93C5FD] hover:text-[#BFDBFE]">
            Already confirmed? Sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Step 1 of 2"
      title="Create your living resume."
      description="Create your free account now. Next, you will add your details in a private guided builder."
    >
        <label className="flex items-start gap-3 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.025)] p-3.5 text-xs leading-5 text-[rgba(240,244,255,0.66)]">
          <input
            id="signup-legal"
            type="checkbox"
            checked={acceptedLegal}
            onChange={(event) => {
              setAcceptedLegal(event.target.checked);
              if (event.target.checked && status === "error") {
                setStatus("idle");
                setMessage("");
              }
            }}
            className="mt-1 h-4 w-4 accent-[#3B82F6]"
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="text-[#93C5FD] hover:text-[#BFDBFE] underline underline-offset-2">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-[#93C5FD] hover:text-[#BFDBFE] underline underline-offset-2">
              Privacy Policy
            </Link>.
          </span>
        </label>

          <button
            type="button"
            onClick={onGoogleSignup}
            disabled={status === "loading"}
            className="mt-4 h-12 w-full rounded-xl border border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.025)] px-5 text-sm font-medium text-[rgba(240,244,255,0.82)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[#BFDBFE] disabled:cursor-not-allowed disabled:opacity-50"
          >
          Continue with Google
          </button>

        <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-[rgba(240,244,255,0.25)]">
          <div className="h-px flex-1 bg-[rgba(255,255,255,0.1)]" />
          Or
          <div className="h-px flex-1 bg-[rgba(255,255,255,0.1)]" />
        </div>

        <form className="space-y-4" onSubmit={onSignup}>
          <div>
            <label htmlFor="signup-email" className="mb-2 block text-xs font-medium text-[rgba(240,244,255,0.72)]">
              Email address
            </label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="h-12 w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.035)] px-4 text-sm text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.32)] focus:border-[#60A5FA] focus:outline-none"
            />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="signup-password" className="text-xs font-medium text-[rgba(240,244,255,0.72)]">
                Create password
              </label>
              <span className="text-[10px] text-[rgba(240,244,255,0.4)]">8 characters minimum</span>
            </div>
            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Choose a secure password"
              className="h-12 w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.035)] px-4 text-sm text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.32)] focus:border-[#60A5FA] focus:outline-none"
            />
          </div>
          {requiresCaptcha ? (
            <TurnstileWidget
              siteKey={turnstileSiteKey}
              resetNonce={turnstileResetNonce}
              onTokenChange={setTurnstileToken}
            />
          ) : null}
          <button
            type="submit"
            disabled={status === "loading"}
            className="gold-pill mt-1 h-12 w-full text-sm font-semibold transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)] disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {status === "loading" ? "Creating your account..." : "Create My Free Resume"}
          </button>
        </form>

        {requiresCaptcha && !turnstileToken && status !== "error" ? (
          <p className="mt-3 text-xs text-[rgba(240,244,255,0.42)]">
            Complete the human verification step to enable email signup.
          </p>
        ) : null}

        {message ? (
          <p role="alert" className={`mt-4 rounded-xl border px-4 py-3 text-sm ${status === "error" ? "border-[rgba(255,142,142,0.2)] bg-[rgba(255,142,142,0.07)] text-[#ffb4b4]" : "border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.08)] text-[#93C5FD]"}`}>{message}</p>
        ) : null}

        <p className="mt-4 text-xs leading-5 text-[rgba(240,244,255,0.5)]">
          Free means free: no card, trial, or subscription. Your draft stays private until you publish it.
        </p>

        <p className="mt-4 text-sm text-[rgba(240,244,255,0.45)]">
          Already have an account?{" "}
          <Link href={signInHref} className="text-[#3B82F6] hover:text-[#93C5FD]">
            Sign in
          </Link>
        </p>
    </AuthShell>
  );
}
