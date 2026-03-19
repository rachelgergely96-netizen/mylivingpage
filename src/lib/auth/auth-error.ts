export type CallbackAuthErrorCode =
  | "google_signin_expired"
  | "google_signin_failed";

const AUTH_ERROR_MESSAGES: Record<CallbackAuthErrorCode, string> = {
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
    return "google_signin_expired";
  }

  return "google_signin_failed";
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
    return AUTH_ERROR_MESSAGES[normalized as CallbackAuthErrorCode];
  }

  if (isMissingPkceVerifierError(normalized)) {
    return AUTH_ERROR_MESSAGES.google_signin_expired;
  }

  return normalized;
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
