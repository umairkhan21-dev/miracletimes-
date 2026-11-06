#!/usr/bin/env node
/**
 * After static export, set <html lang> (and .site-shell lang) from each page's
 * <meta name="language"> when present. Next.js App Router only allows one root
 * layout `<html>`, so content language for article pages is patched here for
 * crawlers that read the exported HTML without executing JavaScript.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @param {string} html
 * @returns {{ html: string, lang: string | null, changed: boolean }}
 */
export function patchHtmlDocumentLang(html) {
  const metaMatch = html.match(
    /<meta\s+name="language"\s+content="(hi|en)"\s*\/?>/i,
  );
  if (!metaMatch) {
    return { html, lang: null, changed: false };
  }
  const lang = metaMatch[1].toLowerCase() === "en" ? "en" : "hi";
  let next = html;
  let changed = false;

  function withLangAttr(attrs, nextLang) {
    const without = attrs.replace(/\s*\blang\s*=\s*["'][^"']*["']/i, "");
    const trimmed = without.replace(/\s+/g, " ").trim();
    return trimmed
      ? ` lang="${nextLang}" ${trimmed}`
      : ` lang="${nextLang}"`;
  }

  next = next.replace(/<html\b([^>]*)>/i, (full, attrs) => {
    const desired = withLangAttr(attrs, lang);
    const nextTag = `<html${desired}>`;
    if (nextTag === full) return full;
    // Also treat semantically equal tags (spacing-only diffs) as changed when needed.
    if (
      new RegExp(`\\blang\\s*=\\s*["']${lang}["']`, "i").test(attrs) &&
      !/\s{2,}/.test(attrs)
    ) {
      return full;
    }
    changed = true;
    return nextTag;
  });

  next = next.replace(
    /(<div\b)([^>]*\bclass="[^"]*\bsite-shell\b[^"]*"[^>]*)(>)/i,
    (full, open, attrs, end) => {
      const desired = withLangAttr(attrs, lang);
      const nextTag = `${open}${desired}${end}`;
      if (nextTag === full) return full;
      if (
        new RegExp(`\\blang\\s*=\\s*["']${lang}["']`, "i").test(attrs) &&
        !/\s{2,}/.test(attrs)
      ) {
        return full;
      }
      changed = true;
      return nextTag;
    },
  );

  return { html: next, lang, changed };
}

/**
 * @param {string} outDir
 * @returns {{ patched: number, scanned: number }}
 */
export function patchExportedHtmlLang(outDir) {
  let scanned = 0;
  let patched = 0;

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith(".html")) continue;
      scanned += 1;
      const original = fs.readFileSync(full, "utf8");
      const result = patchHtmlDocumentLang(original);
      if (result.changed) {
        fs.writeFileSync(full, result.html);
        patched += 1;
      }
    }
  }

  walk(outDir);
  return { scanned, patched };
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const outDir = path.join(root, "out");
  const result = patchExportedHtmlLang(outDir);
  console.log(
    `[patch-html-lang] scanned=${result.scanned} patched=${result.patched}`,
  );
}
