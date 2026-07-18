/** @type {import('next').NextConfig} */
const remotePatterns = [];
const isProduction = process.env.NODE_ENV === "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"} https://www.googletagmanager.com https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' ws: wss: https://*.supabase.co https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

try {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    remotePatterns.push({
      protocol: supabaseUrl.protocol.replace(":", ""),
      hostname: supabaseUrl.hostname,
      port: supabaseUrl.port,
      pathname: "/storage/v1/object/**",
    });
  }
} catch {
  // Ignore malformed env values so local builds can still start with partial config.
}

const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/guides/ats-resume-test",
        destination: "/guides/resume-pdf-check",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns,
  },
};

export default nextConfig;
