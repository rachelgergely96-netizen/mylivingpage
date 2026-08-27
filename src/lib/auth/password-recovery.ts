import { sanitizeInternalRedirectPath } from "@/lib/auth/internal-redirect";

export const DEFAULT_PASSWORD_RECOVERY_DESTINATION = "/dashboard";

/**
 * Resolve the post-reset destination without ever accepting a cross-origin URL.
 */
export function resolvePasswordRecoveryDestination(
  requestedNext: string | null | undefined,
): string {
  return sanitizeInternalRedirectPath(
    requestedNext,
    DEFAULT_PASSWORD_RECOVERY_DESTINATION,
  );
}

/**
 * Preserve an explicitly requested safe destination between auth screens.
 * Bare and unsafe requests keep the existing bare-route behavior.
 */
export function buildPasswordRecoveryHref(
  pathname: "/forgot-password" | "/login" | "/reset-password",
  requestedNext: string | null | undefined,
): string {
  const safeNext = sanitizeInternalRedirectPath(requestedNext, "");
  if (!safeNext) return pathname;

  return `${pathname}?next=${encodeURIComponent(safeNext)}`;
}
