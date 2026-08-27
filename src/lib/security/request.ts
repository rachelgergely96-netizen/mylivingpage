import { createHmac } from "node:crypto";

const DEVELOPMENT_ONLY_SECURITY_HASH_PEPPER =
  "development-only-mylivingpage-security-hash-pepper";

function getSecurityHashPepper() {
  const configuredPepper = process.env.SECURITY_HASH_PEPPER?.trim();
  if (configuredPepper) {
    return configuredPepper;
  }

  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
    return DEVELOPMENT_ONLY_SECURITY_HASH_PEPPER;
  }

  throw new Error(
    "Missing SECURITY_HASH_PEPPER. Configure a server-only pepper before hashing security identifiers.",
  );
}

export function getClientIp(requestHeaders: Headers): string | null {
  const vercelForwardedFor = requestHeaders.get("x-vercel-forwarded-for");
  if (vercelForwardedFor) {
    const vercelIp = vercelForwardedFor.split(",")[0]?.trim();
    if (vercelIp) return vercelIp.slice(0, 128);
  }

  const forwardedFor = requestHeaders.get("x-forwarded-for");
  if (forwardedFor) {
    const hops = forwardedFor
      .split(",")
      .map((hop) => hop.trim())
      .filter(Boolean);
    const nearestForwardedIp = hops.at(-1);
    if (nearestForwardedIp) return nearestForwardedIp.slice(0, 128);
  }

  const realIp = requestHeaders.get("x-real-ip")?.trim();
  return realIp ? realIp.slice(0, 128) : null;
}

export function hashSecurityIdentifier(value: string) {
  return createHmac("sha256", getSecurityHashPepper())
    .update(value)
    .digest("hex");
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
