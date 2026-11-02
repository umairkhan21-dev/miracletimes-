/**
 * Build an in-app href at the site root.
 * Pass `"/"` or `""` for the homepage.
 * Does not force a trailing slash; Next `trailingSlash: true` handles that.
 */
export function sitePath(path: string = "/"): string {
  if (!path || path === "/") return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

/** @deprecated Use sitePath — kept so existing imports keep working. */
export const demoPath = sitePath;

/** Absolute site URL for a path (always trailing slash). */
export function absoluteSiteUrl(siteUrl: string, path: string = "/"): string {
  const origin = siteUrl.replace(/\/$/, "");
  if (!path || path === "/") return `${origin}/`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const withSlash = normalized.endsWith("/") ? normalized : `${normalized}/`;
  return `${origin}${withSlash}`;
}

/** @deprecated Use absoluteSiteUrl. */
export const demoAbsoluteUrl = absoluteSiteUrl;

export function normalizePathname(path: string): string {
  if (!path) return "/";
  const trimmed = path.replace(/\/+$/, "");
  return trimmed || "/";
}

export function isHomePath(pathname: string): boolean {
  return normalizePathname(pathname) === "/";
}

/** @deprecated Use isHomePath. */
export const isDemoHomePath = isHomePath;
