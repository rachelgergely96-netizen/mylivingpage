const INTERNAL_ORIGIN = "https://internal.mylivingpage.invalid";
const UNSAFE_PATH_CHARACTER = /[\u0000-\u001f\u007f\\]/;

function hasUnsafeDecodedForm(value: string): boolean {
  let candidate = value;

  for (let pass = 0; pass < 3; pass += 1) {
    if (
      !candidate.startsWith("/") ||
      candidate.startsWith("//") ||
      candidate.startsWith("/\\") ||
      UNSAFE_PATH_CHARACTER.test(candidate)
    ) {
      return true;
    }

    try {
      const decoded = decodeURIComponent(candidate);
      if (decoded === candidate) break;
      candidate = decoded;
    } catch {
      return true;
    }
  }

  return false;
}

/** Accept only same-origin paths, including after common decoding passes. */
export function sanitizeInternalRedirectPath(
  value: string | null | undefined,
  fallback: string = "/dashboard",
): string {
  if (!value || hasUnsafeDecodedForm(value)) return fallback;

  try {
    const parsed = new URL(value, INTERNAL_ORIGIN);
    if (parsed.origin !== INTERNAL_ORIGIN) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
