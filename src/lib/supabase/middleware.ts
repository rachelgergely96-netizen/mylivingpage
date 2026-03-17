import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { NextResponse as NextResponseBuilder } from "next/server";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookies";

interface SessionUpdateResult {
  response: NextResponse;
  userId: string | null;
  userEmail: string | null;
}

export async function updateSession(request: NextRequest): Promise<SessionUpdateResult> {
  let response = NextResponseBuilder.next({ request });
  const cookieOptions = getSupabaseCookieOptions(request.nextUrl.hostname);

  const supabase = createServerClient(
    getSupabaseUrl() ?? "",
    getSupabasePublishableKey() ?? "",
    {
      cookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponseBuilder.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, cookieOptions ? { ...options, ...cookieOptions } : options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, userId: user?.id ?? null, userEmail: user?.email ?? null };
}
