import { NextRequest, NextResponse } from "next/server";
import {
  getCallbackAuthErrorCode,
  getProviderCallbackErrorCode,
} from "@/lib/auth/auth-error";
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
import {
  sanitizeAuthRef,
  sanitizeAuthScreen,
  type AuthScreen,
} from "@/lib/auth/callback-url";
import { sanitizeInternalRedirectPath } from "@/lib/auth/internal-redirect";
import { resolvePostLoginDestination } from "@/lib/auth/post-login";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/route-handler";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";

const AUTH_CALLBACK_ERROR_MAX_LENGTH = 240;

function getBoundedCallbackError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof error.message === "string"
        ? error.message
        : typeof error === "string"
          ? error
          : "Unknown profile provisioning failure";

  return (
    message.replace(/\s+/g, " ").trim() ||
    "Unknown profile provisioning failure"
  ).slice(0, AUTH_CALLBACK_ERROR_MAX_LENGTH);
}

function applyNoStoreHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
}

function buildAuthFailureRedirect({
  appOrigin,
  errorCode,
  next,
  ref,
  screen,
}: {
  appOrigin: URL;
  errorCode: string;
  next: string;
  ref: string | null;
  screen: AuthScreen;
}) {
  const errorRedirect = new URL(`/${screen}`, appOrigin);
  errorRedirect.searchParams.set("error", errorCode);
  errorRedirect.searchParams.set("next", next);
  if (ref) {
    errorRedirect.searchParams.set("ref", ref);
  }
  return errorRedirect;
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const appOrigin = getAppOrigin();
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeInternalRedirectPath(requestUrl.searchParams.get("next"));
  const screen = sanitizeAuthScreen(requestUrl.searchParams.get("screen"));
  const ref = sanitizeAuthRef(requestUrl.searchParams.get("ref"));
  const legalAcceptRequested = requestUrl.searchParams.get("legal_accept") === "1";
  const legalSourceParam = requestUrl.searchParams.get("legal_source");
  const legalSource: LegalAcceptanceSource =
    legalSourceParam === "checkout" ? "checkout" : "signup";
  let resolvedNext = next;
  const redirectUrl = new URL(resolvedNext, appOrigin);

  if (!code) {
    // Providers report failures (expired confirmation links, cancelled consent
    // screens) as error params with no code — surface those on the login form.
    const providerErrorCode = getProviderCallbackErrorCode({
      error: requestUrl.searchParams.get("error"),
      errorCode: requestUrl.searchParams.get("error_code"),
    });
    if (providerErrorCode) {
      await trackEvent(null, "auth.callback.failed", {
        error: requestUrl.searchParams.get("error_description") ?? requestUrl.searchParams.get("error"),
        error_code: providerErrorCode,
        provider_error: requestUrl.searchParams.get("error"),
        provider_error_code: requestUrl.searchParams.get("error_code"),
        next,
        screen,
        ref,
        request_host: getRequestHostname(request.headers),
        auth_origin: appOrigin.origin,
        redirect_to: redirectUrl.toString(),
      });
      const providerErrorRedirect = buildAuthFailureRedirect({
        appOrigin,
        errorCode: providerErrorCode,
        next,
        ref,
        screen,
      });
      const providerErrorResponse = NextResponse.redirect(providerErrorRedirect);
      applyNoStoreHeaders(providerErrorResponse);
      return providerErrorResponse;
    }

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
      screen,
      ref,
      request_host: getRequestHostname(request.headers),
      auth_origin: appOrigin.origin,
      redirect_to: redirectUrl.toString(),
    });
    const errorRedirect = buildAuthFailureRedirect({
      appOrigin,
      errorCode,
      next,
      ref,
      screen,
    });
    const errorResponse = NextResponse.redirect(errorRedirect);
    applyNoStoreHeaders(errorResponse);
    return errorResponse;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const admin = createServiceRoleSupabaseClient();
    try {
      await ensureUserProfile(admin, user);
    } catch (profileError) {
      const failureRedirect = buildAuthFailureRedirect({
        appOrigin,
        errorCode: "signin_failed",
        next,
        ref,
        screen,
      });
      await trackEvent(user.id, "auth.callback.failed", {
        error: getBoundedCallbackError(profileError),
        error_code: "profile_provision_failed",
        next,
        screen,
        ref,
        request_host: getRequestHostname(request.headers),
        auth_origin: appOrigin.origin,
        redirect_to: failureRedirect.toString(),
      });
      response.headers.set("location", failureRedirect.toString());
      return response;
    }

    const { data: existingPage, error: existingPageError } = await admin
      .from("pages")
      .select("id")
      .or(`owner_id.eq.${user.id},user_id.eq.${user.id}`)
      .limit(1)
      .maybeSingle();
    const hasLivingPage = existingPageError
      ? null
      : Boolean(existingPage);
    resolvedNext = resolvePostLoginDestination(next, hasLivingPage);
    redirectUrl.href = new URL(resolvedNext, appOrigin).href;
    response.headers.set("location", redirectUrl.toString());

    await trackEvent(user.id, "auth.callback.succeeded", {
      auth_provider:
        typeof user.app_metadata?.provider === "string"
          ? user.app_metadata.provider
          : null,
      next: resolvedNext,
      requested_next: next,
      has_living_page: hasLivingPage,
      request_host: getRequestHostname(request.headers),
      auth_origin: appOrigin.origin,
      redirect_to: redirectUrl.toString(),
      legal_accept_requested: legalAcceptRequested,
      legal_source: legalSource,
    });

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
