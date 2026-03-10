import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { NextResponse as NextResponseBuilder } from "next/server";

interface SessionUpdateResult {
  response: NextResponse;
  userId: string | null;
  userEmail: string | null;
}

export async function updateSession(request: NextRequest): Promise<SessionUpdateResult> {
  let response = NextResponseBuilder.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
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
            response.cookies.set(name, value, options);
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
