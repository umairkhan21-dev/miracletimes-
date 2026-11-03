export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 280);
}

export function makePublicId(seed: string) {
  const base = slugify(seed) || "article";
  const suffix = Date.now().toString(36);
  return `${base.slice(0, 60)}-${suffix}`.slice(0, 100);
}
