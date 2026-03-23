import type { LegalAcceptanceSource } from "@/lib/legal/legal-version";
import { getAbsoluteUrl } from "@/lib/site";

interface BuildAuthCallbackUrlInput {
  next: string;
  legalAcceptRequested?: boolean;
  legalSource?: LegalAcceptanceSource;
}

interface BuildGoogleAuthStartUrlInput {
  next: string;
  screen: "login" | "signup";
  legalAcceptRequested?: boolean;
  legalSource?: LegalAcceptanceSource;
  ref?: string | null;
}

export function buildAuthCallbackUrl({
  next,
  legalAcceptRequested = false,
  legalSource = "signup",
}: BuildAuthCallbackUrlInput): string {
  const callbackUrl = new URL(getAbsoluteUrl("/callback"));
  callbackUrl.searchParams.set("next", next);

  if (legalAcceptRequested) {
    callbackUrl.searchParams.set("legal_accept", "1");
    callbackUrl.searchParams.set("legal_source", legalSource);
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
  googleAuthUrl.searchParams.set("next", next);
  googleAuthUrl.searchParams.set("screen", screen);

  if (legalAcceptRequested) {
    googleAuthUrl.searchParams.set("legal_accept", "1");
    googleAuthUrl.searchParams.set("legal_source", legalSource);
  }

  if (ref) {
    googleAuthUrl.searchParams.set("ref", ref);
  }

  return googleAuthUrl.toString();
}
