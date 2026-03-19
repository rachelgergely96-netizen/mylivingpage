import { NextRequest, NextResponse } from "next/server";
import { buildAuthCallbackUrl } from "@/lib/auth/callback-url";
import { getAppOrigin } from "@/lib/site";
import { getRequestHostname } from "@/lib/supabase/cookies";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/route-handler";
import { trackEvent } from "@/lib/track-event";

const routeTrustLevel = "public_read";

function safeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/")) {
    return "/dashboard";
  }

  return value;
}

function safeAuthScreen(value: string | null) {
  return value === "signup" ? "signup" : "login";
}

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const appOrigin = getAppOrigin();
  const next = safeRedirectPath(requestUrl.searchParams.get("next"));
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

  const cookieResponse = NextResponse.next();
  const supabase = createRouteHandlerSupabaseClient(request, cookieResponse);
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
    return NextResponse.redirect(fallbackRedirect);
  }

  const oauthRedirect = NextResponse.redirect(data.url);
  copyCookies(cookieResponse, oauthRedirect);
  return oauthRedirect;
}
