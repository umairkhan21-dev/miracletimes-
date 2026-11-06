/** ASCII URL slug from a headline. Non-Latin titles may yield an empty result. */
export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 280);
}

function uniqueSuffix() {
  return Date.now().toString(36).slice(-5);
}

/**
 * Build a unique, editable slug from a headline.
 * Latin headlines become readable slugs; Hindi/other scripts fall back to a
 * stable unique token the editor can replace with a romanized slug.
 */
export function slugFromHeadline(
  headline: string,
  options?: { fallbackSeed?: string; ensureUnique?: boolean },
) {
  const fromTitle = slugify(headline);
  const fromSeed = options?.fallbackSeed ? slugify(options.fallbackSeed) : "";
  const base = fromTitle || fromSeed || "article";
  if (!options?.ensureUnique) {
    return base.slice(0, 280);
  }
  const suffix = uniqueSuffix();
  return `${base.slice(0, Math.max(1, 280 - suffix.length - 1))}-${suffix}`;
}

export function makePublicId(seed: string) {
  const base = slugify(seed) || "article";
  const suffix = Date.now().toString(36);
  return `${base.slice(0, 60)}-${suffix}`.slice(0, 100);
}
