/** @type {import('next').NextConfig} */
const remotePatterns = [];

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
