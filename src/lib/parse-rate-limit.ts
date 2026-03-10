export const PARSE_RATE_LIMIT_MAX_REQUESTS = 5;
export const PARSE_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export function getParseRateLimitWindowStart(now: Date = new Date()): Date {
  return new Date(now.getTime() - PARSE_RATE_LIMIT_WINDOW_MS);
}

export function isParseRateLimited(
  requestCount: number,
  maxRequests: number = PARSE_RATE_LIMIT_MAX_REQUESTS,
): boolean {
  return requestCount >= maxRequests;
}
