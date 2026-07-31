/**
 * Plain-language translations of raw Supabase auth error strings.
 *
 * Matching is substring-based because Supabase returns prose sentences rather
 * than stable error codes on the password/signup endpoints. Each caller passes
 * its own generic fallback so the message stays in the context of the action
 * that failed ("Unable to sign in..." vs "Unable to create account...").
 */
export function getFriendlyAuthErrorMessage(
  rawMessage: string | null | undefined,
  fallback: string,
): string {
  const normalized = rawMessage?.trim().toLowerCase() ?? "";
  if (!normalized) {
    return fallback;
  }

  if (
    normalized.includes("already registered") ||
    normalized.includes("user already exists")
  ) {
    return "An account with this email already exists. Sign in instead.";
  }

  if (
    normalized.includes("password should be") ||
    normalized.includes("weak password") ||
    normalized.includes("password is too weak")
  ) {
    return "That password is too weak. Use at least eight characters.";
  }

  if (
    normalized.includes("rate limit") ||
    normalized.includes("too many requests") ||
    normalized.includes("you can only request this after")
  ) {
    return "Too many attempts. Wait a minute and try again.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "We couldn't match that email and password. If you usually use Google, continue with Google instead.";
  }

  if (
    normalized.includes("otp_expired") ||
    normalized.includes("token has expired") ||
    normalized.includes("invalid or has expired") ||
    normalized.includes("link has expired")
  ) {
    return "This link has expired. Request a new one and try again.";
  }

  return fallback;
}
