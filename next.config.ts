import type { NextConfig } from "next";

const apiOrigin =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:4001";

let apiHost = "localhost";
try {
  apiHost = new URL(apiOrigin).hostname;
} catch {
  apiHost = "localhost";
}

const mediaHosts = [
  apiHost,
  "localhost",
  "127.0.0.1",
  ...(process.env.NEXT_IMAGE_REMOTE_HOSTS || "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean),
];

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // JSON-LD remains inline; language boot is /lang-boot.js
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  `img-src 'self' data: blob: ${apiOrigin} https:`,
  `connect-src 'self' ${apiOrigin}`,
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  // Self-hosted Next.js 15 SSR / selective ISR (no static export).
  images: {
    // Keep unoptimized until a CDN/image optimizer is wired in production.
    unoptimized: true,
    remotePatterns: [
      ...mediaHosts.map((hostname) => ({
        protocol: "https" as const,
        hostname,
      })),
      ...mediaHosts.map((hostname) => ({
        protocol: "http" as const,
        hostname,
      })),
    ],
  },
  reactStrictMode: true,
  poweredByHeader: false,
  trailingSlash: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: csp,
          },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
