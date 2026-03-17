import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { getRequestHostname, getSupabaseCookieOptions } from "@/lib/supabase/cookies";
import { requireSupabasePublishableConfig } from "@/lib/supabase/env";

export function createRouteHandlerSupabaseClient(request: NextRequest, response: NextResponse) {
  const { url, publishableKey } = requireSupabasePublishableConfig();
  const cookieOptions = getSupabaseCookieOptions(getRequestHostname(request.headers));

  return createServerClient(url, publishableKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, cookieOptions ? { ...options, ...cookieOptions } : options);
        });
      },
    },
  });
}
