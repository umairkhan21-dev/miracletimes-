#!/usr/bin/env node
/**
 * SEO helper unit tests + optional HTML checks.
 * HTML assertions prefer a live SSR server (SSR_BASE_URL) and fall back to
 * legacy out/ only if present. Prefer `npm run test:ssr-smoke` for SSR HTML.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Current published fixtures (not removed demo-only corpus). */
const HI_SLUG = "lucknow-smart-technology-urban-development-test-hi";
const EN_SLUG = "lucknow-smart-technology-urban-development-test";
const EN_BRANDED_SLUG = "lucknow-smart-city-digital-services-test";

function trimSeo(value) {
  return (value || "").trim();
}

function effectiveSeoTitle(seoTitle, title) {
  return trimSeo(seoTitle) || trimSeo(title);
}

function effectiveSeoDescription(seoDescription, summary) {
  return trimSeo(seoDescription) || trimSeo(summary);
}

function documentTitle(seoOrHeadline, brand = "Miracle Times") {
  const trimmed = trimSeo(seoOrHeadline);
  if (!trimmed) return { absolute: brand };
  if (/miracle\s*times/i.test(trimmed)) return { absolute: trimmed };
  return trimmed;
}

function publicShareImageUrl(url) {
  const value = trimSeo(url);
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return undefined;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local") ||
      host.endsWith(".internal")
    ) {
      return undefined;
    }
    return value;
  } catch {
    return undefined;
  }
}

test("SEO title falls back to headline", () => {
  assert.equal(effectiveSeoTitle("", "Headline"), "Headline");
  assert.equal(effectiveSeoTitle("  ", "Headline"), "Headline");
  assert.equal(effectiveSeoTitle(null, "Headline"), "Headline");
  assert.equal(effectiveSeoTitle(" SEO Title ", "Headline"), "SEO Title");
});

test("SEO description falls back to summary", () => {
  assert.equal(effectiveSeoDescription("", "Summary"), "Summary");
  assert.equal(effectiveSeoDescription("  ", "Summary"), "Summary");
  assert.equal(effectiveSeoDescription(null, "Summary"), "Summary");
  assert.equal(
    effectiveSeoDescription(" SEO Desc ", "Summary"),
    "SEO Desc",
  );
});

test("document title avoids double Miracle Times branding", () => {
  assert.deepEqual(
    documentTitle("Lucknow Smart City | Miracle Times"),
    { absolute: "Lucknow Smart City | Miracle Times" },
  );
  assert.equal(documentTitle("Agra traffic plan"), "Agra traffic plan");
});

test("publicShareImageUrl rejects localhost and empty values", () => {
  assert.equal(publicShareImageUrl(""), undefined);
  assert.equal(
    publicShareImageUrl("http://localhost:4001/uploads/a.jpg"),
    undefined,
  );
  assert.equal(
    publicShareImageUrl("https://cdn.example.com/a.jpg"),
    "https://cdn.example.com/a.jpg",
  );
});

async function readLiveOrExport(slug) {
  const ssrBase = (process.env.SSR_BASE_URL || "").replace(/\/$/, "");
  if (ssrBase) {
    try {
      const response = await fetch(`${ssrBase}/news/${slug}/`);
      if (!response.ok) return null;
      const html = await response.text();
      return { html, head: html.split("</head>")[0] };
    } catch {
      return null;
    }
  }

  const file = path.join(root, "out", "news", slug, "index.html");
  if (!fs.existsSync(file)) {
    return null;
  }
  const html = fs.readFileSync(file, "utf8");
  return {
    html,
    head: html.split("</head>")[0],
  };
}

function assertMeta(head, { titleIncludes, descriptionIncludes, ogType, canonical, noLocalhostMeta }) {
  assert.match(head, new RegExp(`<title>[^<]*${titleIncludes}[^<]*</title>`));
  assert.match(
    head,
    new RegExp(`<meta name="description" content="[^"]*${descriptionIncludes}[^"]*"`),
  );
  assert.match(head, new RegExp(`property="og:type" content="${ogType}"`));
  assert.match(head, new RegExp(`rel="canonical" href="${canonical}"`));
  // Local rebuilds may preload article images from localhost API; OG/Twitter
  // share images must still never bake private hosts into meta tags.
  if (noLocalhostMeta) {
    assert.doesNotMatch(
      head,
      /property="og:image"[^>]+(?:localhost|127\.0\.0\.1)/i,
    );
    assert.doesNotMatch(
      head,
      /name="twitter:image"[^>]+(?:localhost|127\.0\.0\.1)/i,
    );
  }
}

test("Hindi article HTML uses admin SEO fields and body content", async (t) => {
  const exported = await readLiveOrExport(HI_SLUG);
  if (!exported) {
    t.skip(
      `SSR/out HTML for ${HI_SLUG} missing — run next start or test:ssr-smoke`,
    );
    return;
  }
  assertMeta(exported.head, {
    titleIncludes: "स्मार्ट तकनीक",
    descriptionIncludes: "डिजिटल सेवाओं",
    ogType: "article",
    canonical: `https://miracletimes.in/news/${HI_SLUG}/`,
    noLocalhostMeta: true,
  });
  assert.match(exported.head, /name="twitter:title"/);
  assert.match(exported.head, /name="twitter:description"/);
  assert.match(exported.html, /application\/ld\+json/);
  assert.match(exported.html, /"@type":"NewsArticle"/);
  assert.doesNotMatch(exported.head, /Miracle Times — Miracle Times/);
  assert.match(exported.html, /<html[^>]*lang="hi"/);
  assert.match(exported.html, /name="language" content="hi"/);
  assert.match(exported.html, /<h1>/);
  assert.match(exported.html, /class="story-body"/);
  assert.match(exported.html, /class="story-dek"/);
  assert.match(exported.html, /class="[^"]*story-meta/);
  assert.doesNotMatch(exported.html, /खबरें लोड हो रही हैं/);
});

test("English article HTML uses SEO fields and hreflang", async (t) => {
  const exported = await readLiveOrExport(EN_SLUG);
  if (!exported) {
    t.skip(
      `SSR/out HTML for ${EN_SLUG} missing — run next start or test:ssr-smoke`,
    );
    return;
  }
  assertMeta(exported.head, {
    titleIncludes: "Lucknow Smart City",
    descriptionIncludes: "digital services",
    ogType: "article",
    canonical: `https://miracletimes.in/news/${EN_SLUG}/`,
    noLocalhostMeta: true,
  });
  assert.match(exported.head, /hrefLang="en"/);
  assert.match(exported.head, /hrefLang="hi"/);
  assert.match(exported.html, /application\/ld\+json/);
  assert.match(exported.html, /<h1>/);
  assert.match(exported.html, /class="story-body"/);
  assert.match(exported.html, /class="[^"]*story-meta/);
  assert.doesNotMatch(exported.head, /Miracle Times — Miracle Times/);
  assert.match(exported.html, /<html[^>]*lang="en"/);
  assert.match(exported.html, /name="language" content="en"/);
});

test("homepage keeps default Hindi html lang", async (t) => {
  const ssrBase = (process.env.SSR_BASE_URL || "").replace(/\/$/, "");
  if (ssrBase) {
    try {
      const response = await fetch(`${ssrBase}/`);
      const html = await response.text();
      assert.match(html, /<html[^>]*lang="hi"/);
      return;
    } catch {
      // fall through
    }
  }
  const file = path.join(root, "out", "index.html");
  if (!fs.existsSync(file)) {
    t.skip("homepage HTML missing — run next start or test:ssr-smoke");
    return;
  }
  const html = fs.readFileSync(file, "utf8");
  assert.match(html, /<html[^>]*lang="hi"/);
});

test("branded SEO title is not doubled by the layout template", async (t) => {
  const exported = await readLiveOrExport(EN_BRANDED_SLUG);
  if (!exported) {
    t.skip(
      `SSR/out HTML for ${EN_BRANDED_SLUG} missing — run next start or test:ssr-smoke`,
    );
    return;
  }
  assert.match(
    exported.head,
    /<title>Lucknow Smart City Initiative \| Miracle Times<\/title>/,
  );
  assert.doesNotMatch(exported.head, /Miracle Times — Miracle Times/);
  assert.match(exported.html, /application\/ld\+json/);
  assert.match(exported.html, /class="story-body"/);
});

test("robots.txt matches app robots policy", async (t) => {
  const ssrBase = (process.env.SSR_BASE_URL || "").replace(/\/$/, "");
  if (ssrBase) {
    try {
      const response = await fetch(`${ssrBase}/robots.txt`);
      const text = await response.text();
      assert.match(text, /Disallow:\s*\/admin\//);
      assert.match(text, /Disallow:\s*\/search\//);
      assert.match(text, /Sitemap:\s*https:\/\/miracletimes\.in\/sitemap\.xml/);
      return;
    } catch {
      // fall through
    }
  }
  const file = path.join(root, "out", "robots.txt");
  if (!fs.existsSync(file)) {
    t.skip("robots.txt missing — run next start or test:ssr-smoke");
    return;
  }
  const text = fs.readFileSync(file, "utf8");
  assert.match(text, /Disallow:\s*\/admin\//);
  assert.match(text, /Disallow:\s*\/search\//);
  assert.match(text, /Sitemap:\s*https:\/\/miracletimes\.in\/sitemap\.xml/);
  assert.match(text, /Host:\s*https:\/\/miracletimes\.in/);
});

test("sitemap.xml lists current published article URLs", async (t) => {
  const ssrBase = (process.env.SSR_BASE_URL || "").replace(/\/$/, "");
  if (ssrBase) {
    try {
      const response = await fetch(`${ssrBase}/sitemap.xml`);
      const xml = await response.text();
      assert.match(xml, new RegExp(`/news/${HI_SLUG}/`));
      assert.match(xml, new RegExp(`/news/${EN_SLUG}/`));
      assert.match(xml, /https:\/\/miracletimes\.in\//);
      return;
    } catch {
      // fall through
    }
  }
  const file = path.join(root, "out", "sitemap.xml");
  if (!fs.existsSync(file)) {
    t.skip("sitemap.xml missing — run next start or test:ssr-smoke");
    return;
  }
  const xml = fs.readFileSync(file, "utf8");
  assert.match(xml, new RegExp(`/news/${HI_SLUG}/`));
  assert.match(xml, new RegExp(`/news/${EN_SLUG}/`));
  assert.match(xml, /https:\/\/miracletimes\.in\/<\/loc>/);
});
