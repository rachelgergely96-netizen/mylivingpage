import type { CookieOptionsWithName } from "@supabase/ssr";

const SHARED_PRODUCTION_AUTH_COOKIE_DOMAIN = ".mylivingpage.com";
const SHARED_PRODUCTION_AUTH_HOSTS = new Set([
  "mylivingpage.com",
  "www.mylivingpage.com",
]);

function stripPort(host: string): string {
  if (host.startsWith("[")) {
    const closingBracketIndex = host.indexOf("]");
    return closingBracketIndex === -1 ? host : host.slice(0, closingBracketIndex + 1);
  }

  return host.replace(/:\d+$/, "");
}

export function normalizeHostname(hostOrUrl: string | null | undefined): string | null {
  if (!hostOrUrl) {
    return null;
  }

  const trimmed = hostOrUrl.trim();
  if (!trimmed) {
    return null;
  }

  try {
    if (trimmed.includes("://")) {
      return new URL(trimmed).hostname.toLowerCase();
    }
  } catch {
    // Fall back to plain host parsing below.
  }

  return stripPort(trimmed).toLowerCase();
}

export function getRequestHostname(headersLike: { get(name: string): string | null }): string | null {
  return normalizeHostname(headersLike.get("x-forwarded-host") ?? headersLike.get("host"));
}

export function getSupabaseCookieOptions(hostOrUrl: string | null | undefined): CookieOptionsWithName | undefined {
  const hostname = normalizeHostname(hostOrUrl);

  if (!hostname || !SHARED_PRODUCTION_AUTH_HOSTS.has(hostname)) {
    return undefined;
  }

  return {
    domain: SHARED_PRODUCTION_AUTH_COOKIE_DOMAIN,
    path: "/",
    sameSite: "lax",
    secure: true,
  };
}
