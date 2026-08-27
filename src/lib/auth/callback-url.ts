import type { LegalAcceptanceSource } from "@/lib/legal/legal-version";
import { getAbsoluteUrl } from "@/lib/site";
import { sanitizeInternalRedirectPath } from "@/lib/auth/internal-redirect";

export type AuthScreen = "login" | "signup";

const AUTH_REF_MAX_LENGTH = 80;
const AUTH_REF_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

interface BuildAuthCallbackUrlInput {
  next: string;
  screen?: AuthScreen | string | null;
  legalAcceptRequested?: boolean;
  legalSource?: LegalAcceptanceSource;
  ref?: string | null;
}

interface BuildGoogleAuthStartUrlInput {
  next: string;
  screen: AuthScreen;
  legalAcceptRequested?: boolean;
  legalSource?: LegalAcceptanceSource;
  ref?: string | null;
}

export function sanitizeAuthScreen(value: string | null | undefined): AuthScreen {
  return value === "signup" ? "signup" : "login";
}

export function sanitizeAuthRef(value: string | null | undefined): string | null {
  const candidate = value?.trim() ?? "";
  if (
    !candidate ||
    candidate.length > AUTH_REF_MAX_LENGTH ||
    !AUTH_REF_PATTERN.test(candidate)
  ) {
    return null;
  }

  return candidate;
}

export function buildAuthCallbackUrl({
  next,
  screen,
  legalAcceptRequested = false,
  legalSource = "signup",
  ref,
}: BuildAuthCallbackUrlInput): string {
  const callbackUrl = new URL(getAbsoluteUrl("/callback"));
  callbackUrl.searchParams.set("next", sanitizeInternalRedirectPath(next));

  if (screen !== undefined && screen !== null) {
    callbackUrl.searchParams.set("screen", sanitizeAuthScreen(screen));
  }

  if (legalAcceptRequested) {
    callbackUrl.searchParams.set("legal_accept", "1");
    callbackUrl.searchParams.set("legal_source", legalSource);
  }

  const safeRef = sanitizeAuthRef(ref);
  if (safeRef) {
    callbackUrl.searchParams.set("ref", safeRef);
  }

  return callbackUrl.toString();
}

export function buildGoogleAuthStartUrl({
  next,
  screen,
  legalAcceptRequested = false,
  legalSource = "signup",
  ref,
}: BuildGoogleAuthStartUrlInput): string {
  const googleAuthUrl = new URL(getAbsoluteUrl("/api/auth/google"));
  googleAuthUrl.searchParams.set("next", sanitizeInternalRedirectPath(next));
  googleAuthUrl.searchParams.set("screen", sanitizeAuthScreen(screen));

  if (legalAcceptRequested) {
    googleAuthUrl.searchParams.set("legal_accept", "1");
    googleAuthUrl.searchParams.set("legal_source", legalSource);
  }

  const safeRef = sanitizeAuthRef(ref);
  if (safeRef) {
    googleAuthUrl.searchParams.set("ref", safeRef);
  }

  return googleAuthUrl.toString();
}
