import type { NextConfig } from "next";

// CSP / next/image must use the browser-facing API origin only — never the
// server-only API_INTERNAL_URL (e.g. http://127.0.0.1:4001 on Contabo).
const apiOrigin =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:4001";

let apiHost = "localhost";
try {
  apiHost = new URL(apiOrigin).hostname;
} catch {
  apiHost = "localhost";
}

// When API_INTERNAL_URL is set (Contabo private SSR), the browser-facing
// origin must not be loopback — that was the Vercel localhost misconfig.
if (
  process.env.API_INTERNAL_URL?.trim() &&
  (apiHost === "127.0.0.1" || apiHost === "localhost")
) {
  throw new Error(
    "NEXT_PUBLIC_API_URL must not be localhost/127.0.0.1 when API_INTERNAL_URL is set. " +
      "Use the public API origin (e.g. https://api.miracletimes.in) for the browser bundle " +
      "and keep API_INTERNAL_URL=http://127.0.0.1:4001 for server-side fetches only.",
  );
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
