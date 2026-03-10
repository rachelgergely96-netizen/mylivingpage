"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabasePublishableConfig } from "@/lib/supabase/env";

let browserClient: SupabaseClient | undefined;

export function createBrowserSupabaseClient() {
  if (browserClient) {
    return browserClient;
  }

  const { url, publishableKey } = requireSupabasePublishableConfig();

  browserClient = createBrowserClient(url, publishableKey);
  return browserClient;
}
