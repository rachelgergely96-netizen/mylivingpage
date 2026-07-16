import { NextRequest, NextResponse } from "next/server";
import { buildAuthCallbackUrl, sanitizeAuthRedirectPath } from "@/lib/auth/callback-url";
import { getAppOrigin } from "@/lib/site";
import { getRequestHostname } from "@/lib/supabase/cookies";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/route-handler";
import { trackEvent } from "@/lib/track-event";

const routeTrustLevel = "public_read";
export const dynamic = "force-dynamic";

function safeAuthScreen(value: string | null) {
  return value === "signup" ? "signup" : "login";
}

function applyNoStoreHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const appOrigin = getAppOrigin();
  const next = sanitizeAuthRedirectPath(requestUrl.searchParams.get("next"));
  const screen = safeAuthScreen(requestUrl.searchParams.get("screen"));
  const legalAcceptRequested = requestUrl.searchParams.get("legal_accept") === "1";
  const legalSource = requestUrl.searchParams.get("legal_source") === "checkout" ? "checkout" : "signup";
  const ref = requestUrl.searchParams.get("ref");
  const callbackUrl = new URL(
    buildAuthCallbackUrl({
      next,
      legalAcceptRequested,
      legalSource,
    }),
  );
  const fallbackRedirect = new URL(`/${screen}`, appOrigin);
  fallbackRedirect.searchParams.set("next", next);
  if (ref) {
    fallbackRedirect.searchParams.set("ref", ref);
  }

  const response = NextResponse.redirect(fallbackRedirect);
  applyNoStoreHeaders(response);

  const supabase = createRouteHandlerSupabaseClient(request, response);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  if (error || !data?.url) {
    await trackEvent(null, "auth.google.start.failed", {
      error: error?.message ?? "Google OAuth start failed.",
      next,
      screen,
      request_host: getRequestHostname(request.headers),
      auth_origin: appOrigin.origin,
      redirect_to: callbackUrl.toString(),
    });

    fallbackRedirect.searchParams.set("error", "google_signin_failed");
    response.headers.set("location", fallbackRedirect.toString());
    return response;
  }

  await trackEvent(null, "auth.google.start.succeeded", {
    next,
    screen,
    request_host: getRequestHostname(request.headers),
    auth_origin: appOrigin.origin,
    redirect_to: callbackUrl.toString(),
    legal_accept_requested: legalAcceptRequested,
    ref,
  });

  response.headers.set("location", data.url);
  return response;
}
