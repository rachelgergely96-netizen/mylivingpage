import { createHash } from "node:crypto";

export function getClientIp(requestHeaders: Headers): string | null {
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = requestHeaders.get("x-real-ip")?.trim();
  return realIp || null;
}

export function hashSecurityIdentifier(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function getBestEffortRequestIdentifier(requestHeaders: Headers) {
  const ip = getClientIp(requestHeaders);
  if (ip) {
    return ip;
  }

  const userAgent = requestHeaders.get("user-agent")?.trim();
  if (userAgent) {
    return `ua:${userAgent}`;
  }

  return "unknown";
}
