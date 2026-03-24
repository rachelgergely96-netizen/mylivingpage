"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import TurnstileWidget from "@/components/auth/TurnstileWidget";
import { buildAuthCallbackUrl, buildGoogleAuthStartUrl } from "@/lib/auth/callback-url";
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "@/lib/legal/legal-version";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
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
    if (next && next.startsWith("/")) {
      setNextPath(next);
    }
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
      setMessage("Check your email to confirm your account, then come back to get your page live.");
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-5 py-10 sm:px-6 sm:py-12">
      <div className="glass-card w-full rounded-2xl p-6 md:p-7">
        <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Create your page</p>
        <h1 className="mt-2 font-heading text-3xl font-bold leading-tight text-[#F0F4FF] sm:text-[2.2rem]">
          Let&apos;s get your page live.
        </h1>
        <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.58)]">
          You&apos;re a few minutes away from having something you can actually send.
        </p>
        <label className="mt-4 flex items-start gap-3 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] p-3 text-xs leading-5 text-[rgba(240,244,255,0.62)]">
          <input
            type="checkbox"
            checked={acceptedLegal}
            onChange={(event) => setAcceptedLegal(event.target.checked)}
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

        {!acceptedLegal && (
          <p className="mt-2 text-xs text-[#FCD34D]">Check the box above to continue.</p>
        )}

          <button
            type="button"
            onClick={onGoogleSignup}
            disabled={status === "loading"}
            className="mt-4 w-full rounded-full border border-[rgba(255,255,255,0.18)] px-5 py-3 text-sm text-[rgba(240,244,255,0.8)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD] disabled:cursor-not-allowed disabled:opacity-50"
          >
          Create Your Page with Google
          </button>

        <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-[rgba(240,244,255,0.25)]">
          <div className="h-px flex-1 bg-[rgba(255,255,255,0.1)]" />
          Or
          <div className="h-px flex-1 bg-[rgba(255,255,255,0.1)]" />
        </div>

        <form className="space-y-3" onSubmit={onSignup}>
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
            minLength={8}
            placeholder="Create password"
            className="h-12 w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] px-4 text-sm text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.35)] focus:border-[#3B82F6] focus:outline-none"
          />
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
            className="gold-pill mt-2 h-12 w-full text-sm font-semibold transition-all duration-300 ease-soft hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)] disabled:opacity-70"
          >
            {status === "loading" ? "Starting..." : "Create My Page"}
          </button>
        </form>

        {requiresCaptcha && !turnstileToken && status !== "error" ? (
          <p className="mt-3 text-xs text-[rgba(240,244,255,0.42)]">
            Complete the human verification step to enable email signup.
          </p>
        ) : null}

        {message ? (
          <p className={`mt-4 text-sm ${status === "error" ? "text-[#ff8e8e]" : "text-[#3B82F6]"}`}>{message}</p>
        ) : null}

        <p className="mt-4 text-xs leading-5 text-[rgba(240,244,255,0.42)]">
          No card required to publish. New accounts get one month of free live hosting with every feature unlocked, then monthly hosting is $9.99/month.
        </p>

        <p className="mt-4 text-sm text-[rgba(240,244,255,0.45)]">
          Already have an account?{" "}
          <Link href={signInHref} className="text-[#3B82F6] hover:text-[#93C5FD]">
            Sign in
          </Link>
        </p>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-4 text-xs uppercase tracking-[0.16em] text-[rgba(240,244,255,0.35)] hover:text-[#3B82F6]"
        >
          Back to Home
        </button>
      </div>
    </main>
  );
}
