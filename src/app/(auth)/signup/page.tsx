"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import AuthMessage from "@/components/auth/AuthMessage";
import AuthDestinationNotice from "@/components/auth/AuthDestinationNotice";
import TurnstileWidget from "@/components/auth/TurnstileWidget";
import { buildAuthCallbackUrl, buildGoogleAuthStartUrl } from "@/lib/auth/callback-url";
import { getFriendlyAuthErrorMessage } from "@/lib/auth-errors";
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
  const [legalError, setLegalError] = useState(false);
  const [captchaError, setCaptchaError] = useState(false);
  const [message, setMessage] = useState("");
  const [nextPath, setNextPath] = useState("/create");
  const [destinationPath, setDestinationPath] = useState<string | null>(null);
  const [signupReferrer, setSignupReferrer] = useState<string | null>(null);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetNonce, setTurnstileResetNonce] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedNext = params.get("next");
    setNextPath(sanitizeInternalRedirectPath(requestedNext, "/create"));
    const visibleNext = requestedNext
      ? sanitizeInternalRedirectPath(requestedNext, "")
      : "";
    setDestinationPath(visibleNext || null);
    const ref = params.get("ref") || params.get("utm_source") || null;
    if (ref) setSignupReferrer(ref);
  }, []);

  const signInNextPath =
    signupReferrer && nextPath.startsWith("/create") && !nextPath.includes("ref=")
      ? `${nextPath}${nextPath.includes("?") ? "&" : "?"}ref=${encodeURIComponent(signupReferrer)}`
      : nextPath;
  const signInHref = `/login?next=${encodeURIComponent(signInNextPath)}`;

  const clearErrorState = () => {
    if (status !== "error" && !message) {
      return;
    }

    setStatus("idle");
    setMessage("");
    setFieldInvalid(false);
  };

  const onSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Only a rejected email/password submission marks the fields invalid; the
    // legal and captcha guards below are not about the inputs.
    setFieldInvalid(false);
    const captchaMissing = requiresCaptcha && !turnstileToken;
    setLegalError(!acceptedLegal);
    setCaptchaError(captchaMissing);
    if (!acceptedLegal || captchaMissing) {
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
      setMessage(
        getFriendlyAuthErrorMessage(
          error instanceof Error ? error.message : null,
          "Unable to create account. Please try again.",
        ),
      );
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
      setLegalError(true);
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
      setMessage(
        getFriendlyAuthErrorMessage(
          error instanceof Error ? error.message : null,
          "Google signup failed. Please try again.",
        ),
      );
    }
  };

  return (
    <main id="main-content" data-site-ui className="mx-auto flex w-full max-w-[30rem] flex-1 items-center px-5 py-10 sm:px-6 sm:py-14">
      <div className="site-panel-raised w-full p-6 sm:p-8">
        <p className="site-eyebrow">Create your free Living Page</p>
        <h1 className="site-page-title mt-3">
          Let&apos;s get your page live.
        </h1>
        <p className="mt-3 text-sm leading-6 text-site-secondary">
          You&apos;re a few minutes away from having something you can actually send.
        </p>

        <AuthDestinationNotice action="verify" path={destinationPath} />
        {status === "success" ? (
          <div className="mt-6">
            <AuthMessage id="signup-message" tone="success">
              {message}
            </AuthMessage>
            <p className="mt-4 text-sm leading-6 text-site-secondary">
              Open your inbox and click the confirmation link to finish setting up your account.
            </p>
          </div>
        ) : (
          <>
            <label className="mt-5 flex min-h-11 items-start gap-3 border border-site-border bg-site-canvas-alt p-3 text-sm leading-5 text-site-secondary">
              <input
                id="signup-legal-acceptance"
                type="checkbox"
                checked={acceptedLegal}
                onChange={(event) => {
                  clearErrorState();
                  setAcceptedLegal(event.target.checked);
                  if (event.target.checked) {
                    setLegalError(false);
                  }
                }}
                aria-invalid={legalError}
                aria-describedby={legalError ? "signup-legal-message" : undefined}
                className="site-checkbox mt-0.5"
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

            {legalError ? (
              <AuthMessage id="signup-legal-message" tone="danger" className="mt-2">
                Accept the Terms of Service and Privacy Policy to continue.
              </AuthMessage>
            ) : null}

            <button
              type="button"
              onClick={onGoogleSignup}
              disabled={status === "loading"}
              className="site-button site-button-secondary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pendingAction === "google" ? "Redirecting to Google…" : "Continue with Google"}
            </button>

            <div className="my-5 flex items-center gap-3 text-xs text-site-muted">
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
                  name="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => {
                    clearErrorState();
                    setPassword(event.target.value);
                  }}
                  required
                  minLength={8}
                  aria-invalid={fieldInvalid}
                  aria-describedby={message ? "signup-password-help signup-message" : "signup-password-help"}
                  className="site-field px-4"
                />
                <p id="signup-password-help" className="mt-2 text-xs text-site-muted">
                  Use at least eight characters.
                </p>
              </div>
              {requiresCaptcha ? (
                <>
                  <TurnstileWidget
                    siteKey={turnstileSiteKey}
                    resetNonce={turnstileResetNonce}
                    onTokenChange={(token) => {
                      setTurnstileToken(token);
                      if (token) {
                        setCaptchaError(false);
                      }
                    }}
                  />
                  {captchaError ? (
                    <AuthMessage id="signup-captcha-message" tone="danger">
                      Complete the verification check before creating your account.
                    </AuthMessage>
                  ) : null}
                </>
              ) : null}
              <button
                type="submit"
                disabled={status === "loading"}
                className="site-button site-button-primary w-full disabled:cursor-wait disabled:opacity-70"
              >
                {pendingAction === "email" ? "Creating your page…" : "Create my free page"}
              </button>
            </form>

            {status === "error" && message ? (
              <AuthMessage id="signup-message" tone="danger" className="mt-4">
                {message}
              </AuthMessage>
            ) : null}

            <p className="mt-4 text-xs leading-5 text-site-muted">
              Publishing is free. No card, trial, or subscription is required to build or keep your Living Page online.
            </p>
          </>
        )}

        <p className="mt-5 border-t border-site-border pt-5 text-sm text-site-secondary">
          Already have an account?{" "}
          <Link
            href={signInHref}
            className="-my-2 inline-block py-2 font-semibold text-site-action hover:text-site-action-hover"
          >
            Sign in
          </Link>
        </p>
        <p className="mt-2 text-sm text-site-secondary">
          Want to see it first?{" "}
          <Link
            href="/try"
            className="-my-2 inline-block py-2 font-semibold text-site-action hover:text-site-action-hover"
          >
            Paste your résumé and look at the page
          </Link>
        </p>
      </div>
    </main>
  );
}
