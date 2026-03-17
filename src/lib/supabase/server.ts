import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import {
  requireSupabasePublishableConfig,
  requireSupabaseSecretConfig,
} from "@/lib/supabase/env";
import {
  getRequestHostname,
  getSupabaseCookieOptions,
} from "@/lib/supabase/cookies";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const { url, publishableKey } = requireSupabasePublishableConfig();
  const cookieOptions = getSupabaseCookieOptions(getRequestHostname(headerStore));

  return createServerClient(url, publishableKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, cookieOptions ? { ...options, ...cookieOptions } : options);
          });
        } catch {
          // Server Components cannot set cookies directly in all contexts.
        }
      },
    },
  });
}

export function createServiceRoleSupabaseClient() {
  const { url, secretKey } = requireSupabaseSecretConfig();

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
