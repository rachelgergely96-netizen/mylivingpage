import { NextRequest, NextResponse } from "next/server";
import { getCallbackAuthErrorCode } from "@/lib/auth/auth-error";
import { getAppOrigin } from "@/lib/site";
import {
  getClientIp,
  recordLegalAcceptance,
} from "@/lib/legal/acceptance";
import type { LegalAcceptanceSource } from "@/lib/legal/legal-version";
import {
  getRequestHostname,
} from "@/lib/supabase/cookies";
import { ensureUserProfile } from "@/lib/auth/ensureUserProfile";
import { sanitizeInternalRedirectPath } from "@/lib/auth/internal-redirect";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/route-handler";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";

function applyNoStoreHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const appOrigin = getAppOrigin();
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeInternalRedirectPath(requestUrl.searchParams.get("next"));
  const legalAcceptRequested = requestUrl.searchParams.get("legal_accept") === "1";
  const legalSourceParam = requestUrl.searchParams.get("legal_source");
  const legalSource: LegalAcceptanceSource =
    legalSourceParam === "checkout" ? "checkout" : "signup";
  const redirectUrl = new URL(next, appOrigin);

  if (!code) {
    const missingCodeResponse = NextResponse.redirect(redirectUrl);
    applyNoStoreHeaders(missingCodeResponse);
    return missingCodeResponse;
  }

  const response = NextResponse.redirect(redirectUrl);
  applyNoStoreHeaders(response);
  const supabase = createRouteHandlerSupabaseClient(request, response);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const errorCode = getCallbackAuthErrorCode(error.message);
    await trackEvent(null, "auth.callback.failed", {
      error: error.message,
      error_code: errorCode,
      next,
      request_host: getRequestHostname(request.headers),
      auth_origin: appOrigin.origin,
      redirect_to: redirectUrl.toString(),
    });
    const errorRedirect = new URL("/login", appOrigin);
    errorRedirect.searchParams.set("error", errorCode);
    errorRedirect.searchParams.set("next", next);
    const errorResponse = NextResponse.redirect(errorRedirect);
    applyNoStoreHeaders(errorResponse);
    return errorResponse;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await trackEvent(user.id, "auth.callback.succeeded", {
      auth_provider:
        typeof user.app_metadata?.provider === "string"
          ? user.app_metadata.provider
          : null,
      next,
      request_host: getRequestHostname(request.headers),
      auth_origin: appOrigin.origin,
      redirect_to: redirectUrl.toString(),
      legal_accept_requested: legalAcceptRequested,
      legal_source: legalSource,
    });

    const admin = createServiceRoleSupabaseClient();
    await ensureUserProfile(admin, user);

    // Increment sign-in count
    await admin.rpc("increment_sign_in_count", { uid: user.id });

    const metadataAccepted = user.user_metadata?.legal_accepted === true;
    if (legalAcceptRequested || metadataAccepted) {
      const metadataAcceptedAt =
        typeof user.user_metadata?.legal_accepted_at === "string"
          ? user.user_metadata.legal_accepted_at
          : undefined;
      const metadataTermsVersion =
        typeof user.user_metadata?.legal_terms_version === "string"
          ? user.user_metadata.legal_terms_version
          : undefined;
      const metadataPrivacyVersion =
        typeof user.user_metadata?.legal_privacy_version === "string"
          ? user.user_metadata.legal_privacy_version
          : undefined;

      try {
        await recordLegalAcceptance({
          userId: user.id,
          source: legalSource,
          acceptedAt: metadataAcceptedAt,
          termsVersion: metadataTermsVersion,
          privacyVersion: metadataPrivacyVersion,
          ipAddress: getClientIp(request.headers),
          userAgent: request.headers.get("user-agent"),
        });
      } catch (acceptanceError) {
        await trackEvent(user.id, "auth.callback.legal_acceptance_failed", {
          error: acceptanceError instanceof Error ? acceptanceError.message : "Unknown error",
          source: legalSource,
        });
        console.error("Failed to record legal acceptance in callback", acceptanceError);
      }
    }
  }

  return response;
}
