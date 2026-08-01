export type CallbackAuthErrorCode =
  | "signin_expired"
  | "signin_failed"
  | "confirm_link_expired"
  | "signin_cancelled";

// Older redirects (and the Google-only sign-in start route) still arrive with
// these codes, so they stay accepted alongside the provider-neutral ones.
type LegacyAuthErrorCode = "google_signin_expired" | "google_signin_failed";

const AUTH_ERROR_MESSAGES: Record<CallbackAuthErrorCode | LegacyAuthErrorCode, string> = {
  signin_expired:
    "Your sign-in link expired before it finished. Open the link again from this browser, or sign in below.",
  signin_failed: "Sign-in could not be completed. Please try again.",
  confirm_link_expired:
    "That confirmation link has expired. Sign in below or request a new one.",
  signin_cancelled: "Sign-in was cancelled before it finished. Please try again.",
  google_signin_expired:
    "Google sign-in expired before it finished. Please try again from the same browser tab.",
  google_signin_failed:
    "Google sign-in could not be completed. Please try again.",
};

function isMissingPkceVerifierError(errorMessage: string): boolean {
  const normalized = errorMessage.toLowerCase();

  return (
    normalized.includes("pkce code verifier not found in storage") ||
    normalized.includes("code verifier not found")
  );
}

export function getCallbackAuthErrorCode(errorMessage: string): CallbackAuthErrorCode {
  if (isMissingPkceVerifierError(errorMessage)) {
    return "signin_expired";
  }

  return "signin_failed";
}

interface ProviderCallbackErrorInput {
  error: string | null;
  errorCode: string | null;
}

/**
 * Maps the `error` / `error_code` params a provider (Supabase verify endpoint,
 * OAuth consent screen) appends to the callback URL when it fails without a
 * `code`. Returns null when no error params are present.
 */
export function getProviderCallbackErrorCode({
  error,
  errorCode,
}: ProviderCallbackErrorInput): CallbackAuthErrorCode | null {
  if (!error && !errorCode) {
    return null;
  }

  if (errorCode === "otp_expired") {
    return "confirm_link_expired";
  }

  if (error === "access_denied") {
    return "signin_cancelled";
  }

  return "signin_failed";
}

export function getAuthErrorMessage(errorParam: string | null | undefined): string {
  if (!errorParam) {
    return "";
  }

  const normalized = errorParam.trim();
  if (!normalized) {
    return "";
  }

  if (normalized in AUTH_ERROR_MESSAGES) {
    return AUTH_ERROR_MESSAGES[normalized as keyof typeof AUTH_ERROR_MESSAGES];
  }

  if (isMissingPkceVerifierError(normalized)) {
    return AUTH_ERROR_MESSAGES.signin_expired;
  }

  // Never echo an unrecognized value: the param arrives via the URL, so a
  // crafted link could otherwise display arbitrary text as a first-party error.
  return AUTH_ERROR_MESSAGES.signin_failed;
}

export function getPasswordAuthErrorMessage(errorMessage: string | null | undefined): string {
  const normalized = errorMessage?.trim();
  if (!normalized) {
    return "Unable to sign in.";
  }

  if (normalized.toLowerCase().includes("invalid login credentials")) {
    return "We couldn't match that email and password. If you usually use Google, continue with Google instead.";
  }

  return normalized;
}
