import { NextRequest, NextResponse } from "next/server";
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

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const next = safeRedirectPath(requestUrl.searchParams.get("next"));
  const screen = safeAuthScreen(requestUrl.searchParams.get("screen"));
  const legalAcceptRequested = requestUrl.searchParams.get("legal_accept") === "1";
  const legalSource = requestUrl.searchParams.get("legal_source") === "checkout" ? "checkout" : "signup";
  const ref = requestUrl.searchParams.get("ref");

  const callbackParams = new URLSearchParams({ next });
  if (legalAcceptRequested) {
    callbackParams.set("legal_accept", "1");
    callbackParams.set("legal_source", legalSource);
  }

  const callbackUrl = new URL(`/callback?${callbackParams.toString()}`, requestUrl.origin);
  const fallbackRedirect = new URL(`/${screen}`, requestUrl.origin);
  fallbackRedirect.searchParams.set("next", next);
  if (ref) {
    fallbackRedirect.searchParams.set("ref", ref);
  }

  const response = NextResponse.redirect(fallbackRedirect);
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
      redirect_to: callbackUrl.toString(),
    });

    fallbackRedirect.searchParams.set("error", "google_signin_failed");
    return NextResponse.redirect(fallbackRedirect);
  }

  response.headers.set("location", data.url);
  return response;
}
