import type { LegalAcceptanceSource } from "@/lib/legal/legal-version";
import { getAbsoluteUrl } from "@/lib/site";

interface BuildAuthCallbackUrlInput {
  next: string;
  legalAcceptRequested?: boolean;
  legalSource?: LegalAcceptanceSource;
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
