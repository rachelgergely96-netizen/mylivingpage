"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import TurnstileWidget from "@/components/auth/TurnstileWidget";
import { buildAuthCallbackUrl, buildGoogleAuthStartUrl } from "@/lib/auth/callback-url";
import { sanitizeInternalRedirectPath } from "@/lib/auth/internal-redirect";
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
  const [pendingAction, setPendingAction] = useState<"email" | "google" | null>(null);
  const [fieldInvalid, setFieldInvalid] = useState(false);
  const [message, setMessage] = useState("");
  const [nextPath, setNextPath] = useState("/create");
  const [signupReferrer, setSignupReferrer] = useState<string | null>(null);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetNonce, setTurnstileResetNonce] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(sanitizeInternalRedirectPath(params.get("next"), "/create"));
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
    // Only a rejected email/password submission marks the fields invalid; the
    // legal and captcha guards below are not about the inputs.
    setFieldInvalid(false);
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
    setPendingAction("email");
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
      setFieldInvalid(true);
      setMessage(error instanceof Error ? error.message : "Unable to create account.");
    } finally {
      setPendingAction((current) => (current === "email" ? null : current));
      if (requiresCaptcha) {
        setTurnstileResetNonce((current) => current + 1);
      }
    }
  };

  const onGoogleSignup = async () => {
    setFieldInvalid(false);
    if (!acceptedLegal) {
      setStatus("error");
      setMessage("You must accept the Terms of Service and Privacy Policy to continue with Google.");
      return;
    }

    setStatus("loading");
    setPendingAction("google");
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
      setPendingAction(null);
      setMessage(error instanceof Error ? error.message : "Google signup failed.");
    }
  };

  return (
    <main id="main-content" data-site-ui className="mx-auto flex w-full max-w-[30rem] flex-1 items-center px-5 py-8 sm:px-6 sm:py-12">
      <div className="site-panel-raised w-full p-6 sm:p-7">
        <p className="site-eyebrow">Create your free Living Page</p>
        <h1 className="site-page-title mt-3 text-[2rem] sm:text-[2.35rem]">
          Let&apos;s get your page live.
        </h1>
        <p className="mt-3 text-sm leading-6 text-site-secondary">
          You&apos;re a few minutes away from having something you can actually send.
        </p>
        <label className="mt-5 flex min-h-11 items-start gap-3 border border-site-border bg-site-canvas-alt p-3 text-sm leading-5 text-site-secondary">
          <input
            id="signup-legal-acceptance"
            type="checkbox"
            checked={acceptedLegal}
            onChange={(event) => setAcceptedLegal(event.target.checked)}
            aria-invalid={!acceptedLegal && status === "error"}
            aria-describedby={!acceptedLegal && status === "error" ? "signup-legal-message" : undefined}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--site-action)]"
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="font-semibold text-site-action underline underline-offset-2 hover:text-site-action-hover">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-semibold text-site-action underline underline-offset-2 hover:text-site-action-hover">
              Privacy Policy
            </Link>.
          </span>
        </label>

        {!acceptedLegal && status === "error" ? (
          <p id="signup-legal-message" className="mt-2 text-xs text-site-warning">
            Check the box above to continue.
          </p>
        ) : null}

        <button
          type="button"
          onClick={onGoogleSignup}
          disabled={status === "loading"}
          className="site-button site-button-secondary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pendingAction === "google" ? "Redirecting to Google..." : "Continue with Google"}
        </button>

        <div className="my-4 flex items-center gap-3 text-xs text-site-muted">
          <div className="h-px flex-1 bg-site-border" />
          Or
          <div className="h-px flex-1 bg-site-border" />
        </div>

        <form className="space-y-4" onSubmit={onSignup}>
          <div>
            <label htmlFor="signup-email" className="mb-2 block text-sm font-semibold text-site-text">
              Email address
            </label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="Email address"
              aria-invalid={fieldInvalid}
              aria-describedby={message ? "signup-message" : undefined}
              className="site-field px-4"
            />
          </div>
          <div>
            <label htmlFor="signup-password" className="mb-2 block text-sm font-semibold text-site-text">
              Create password
            </label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              placeholder="Create password"
              aria-invalid={fieldInvalid}
              aria-describedby={message ? "signup-password-help signup-message" : "signup-password-help"}
              className="site-field px-4"
            />
            <p id="signup-password-help" className="mt-2 text-xs text-site-muted">
              Use at least eight characters.
            </p>
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
            className="site-button site-button-primary w-full disabled:cursor-wait disabled:opacity-70"
          >
            {pendingAction === "email" ? "Creating your page..." : "Create my free page"}
          </button>
        </form>

        {requiresCaptcha && !turnstileToken ? (
          <p className="mt-3 text-xs text-site-muted">
            Complete the human verification step to enable email signup.
          </p>
        ) : null}

        {message ? (
          <p
            id="signup-message"
            role={status === "error" ? "alert" : "status"}
            className={`mt-4 border-l-2 pl-3 text-sm ${
              status === "error"
                ? "border-site-danger text-site-danger"
                : "border-site-success text-site-success"
            }`}
          >
            {message}
          </p>
        ) : null}

        <p className="mt-4 text-xs leading-5 text-site-muted">
          Publishing is free. No card, trial, or subscription is required to build or keep your Living Page online.
        </p>

        <p className="mt-5 border-t border-site-border pt-5 text-sm text-site-secondary">
          Already have an account?{" "}
          <Link href={signInHref} className="font-semibold text-site-action hover:text-site-action-hover">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
