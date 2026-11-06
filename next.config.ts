import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export only when explicitly requested (`npm run build:export`).
  // Plain `next build` / `next dev` keep dynamic article slugs previewable.
  ...(process.env.STATIC_EXPORT === "1" ? { output: "export" as const } : {}),
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  poweredByHeader: false,
  trailingSlash: true,
  // NOTE: `headers()` is not supported with `output: "export"`.
  // Production static hosting must set CSP/HSTS/etc at the CDN/edge.
  // See vercel.json and docs/DEPLOYMENT_SECURITY.md.
};

export default nextConfig;
