type ErrorContext = Record<string, string | number | boolean | null | undefined>;

function sanitizeLogText(value: string, maxLength = 500) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [redacted]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[redacted-email]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted-token]")
    .slice(0, maxLength);
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: sanitizeLogText(error.message),
      stack: error.stack ? sanitizeLogText(error.stack.split("\n").slice(0, 12).join("\n"), 2_000) : undefined,
    };
  }

  return { name: "UnknownError", message: sanitizeLogText(String(error)) };
}

export function reportServerError(
  message: string,
  error: unknown,
  context: ErrorContext = {},
) {
  console.error(JSON.stringify({
    level: "error",
    message,
    error: normalizeError(error),
    ...context,
  }));
}
