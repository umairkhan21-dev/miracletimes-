/** Base path for the sample news experience. Root `/` stays coming-soon. */
export const DEMO_BASE = "/demo";

/**
 * Build an in-app href under `/demo`.
 * Pass `"/"` or `""` for the demo homepage.
 * Does not force a trailing slash; Next `trailingSlash: true` handles that.
 */
export function demoPath(path: string = "/"): string {
  if (!path || path === "/") return DEMO_BASE;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${DEMO_BASE}${normalized}`;
}

/** Absolute site URL for a demo path (always trailing slash except bare host handling). */
export function demoAbsoluteUrl(siteUrl: string, path: string = "/"): string {
  const origin = siteUrl.replace(/\/$/, "");
  if (!path || path === "/") return `${origin}${DEMO_BASE}/`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const withSlash = normalized.endsWith("/") ? normalized : `${normalized}/`;
  return `${origin}${DEMO_BASE}${withSlash}`;
}

export function normalizePathname(path: string): string {
  if (!path) return "/";
  const trimmed = path.replace(/\/+$/, "");
  return trimmed || "/";
}

export function isDemoHomePath(pathname: string): boolean {
  return normalizePathname(pathname) === DEMO_BASE;
}
