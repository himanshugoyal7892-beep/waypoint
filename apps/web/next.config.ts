import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Clerk needs its Frontend API + image hosts. 'unsafe-eval' only in dev (React Refresh).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com`,
  "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com",
  "img-src 'self' data: https://img.clerk.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@waypoint/shared"],
  // ESLint runs as its own step (pnpm lint) with the shared flat config.
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      // Dashboard + admin API: strict headers. Public/builder APIs set their own CORS headers.
      { source: "/((?!api/public|api/builder|sdk).*)", headers: securityHeaders },
      {
        source: "/sdk/:file*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300, stale-while-revalidate=86400" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
