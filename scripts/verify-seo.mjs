#!/usr/bin/env node
/**
 * SEO helper + static-export HTML checks.
 * Run after `npm run build:export` for HTML assertions.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

function readExport(slug) {
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

function assertMeta(head, { titleIncludes, descriptionIncludes, ogType, canonical, noLocalhost }) {
  assert.match(head, new RegExp(`<title>[^<]*${titleIncludes}[^<]*</title>`));
  assert.match(
    head,
    new RegExp(`<meta name="description" content="[^"]*${descriptionIncludes}[^"]*"`),
  );
  assert.match(head, new RegExp(`property="og:type" content="${ogType}"`));
  assert.match(head, new RegExp(`rel="canonical" href="${canonical}"`));
  if (noLocalhost) {
    assert.doesNotMatch(head, /localhost|127\.0\.0\.1/i);
  }
}

test("exported Hindi article HTML uses headline fallback and canonical", (t) => {
  const exported = readExport("agra-virasat-yatayat-namuna");
  if (!exported) {
    t.skip("out/news/agra-virasat-yatayat-namuna missing — run build:export first");
    return;
  }
  assertMeta(exported.head, {
    titleIncludes: "आगरा",
    descriptionIncludes: "ताज",
    ogType: "article",
    canonical: "https://miracletimes.in/news/agra-virasat-yatayat-namuna/",
    noLocalhost: true,
  });
  assert.match(exported.html, /application\/ld\+json/);
  assert.doesNotMatch(exported.head, /Miracle Times — Miracle Times/);
  assert.match(exported.head, /name="twitter:card" content="summary"/);
  assert.match(exported.html, /<html[^>]*lang="hi"/);
  assert.match(exported.html, /name="language" content="hi"/);
});

test("exported English article HTML uses SEO fields", (t) => {
  const exported = readExport("agra-heritage-traffic-sample");
  if (!exported) {
    t.skip("out/news/agra-heritage-traffic-sample missing — run build:export first");
    return;
  }
  assertMeta(exported.head, {
    titleIncludes: "Agra heritage traffic sample plan",
    descriptionIncludes: "sample English SEO description",
    ogType: "article",
    canonical: "https://miracletimes.in/news/agra-heritage-traffic-sample/",
    noLocalhost: true,
  });
  assert.match(exported.head, /hrefLang="en"/);
  assert.match(exported.head, /hrefLang="hi"/);
  assert.doesNotMatch(exported.head, /Miracle Times — Miracle Times/);
  assert.match(exported.html, /<html[^>]*lang="en"/);
  assert.match(exported.html, /name="language" content="en"/);
});

test("exported homepage keeps default Hindi html lang", (t) => {
  const file = path.join(root, "out", "index.html");
  if (!fs.existsSync(file)) {
    t.skip("out/index.html missing — run build:export first");
    return;
  }
  const html = fs.readFileSync(file, "utf8");
  assert.match(html, /<html[^>]*lang="hi"/);
});

test("exported branded SEO title is not doubled by the layout template", (t) => {
  const exported = readExport("lucknow-smart-city-digital-services-test");
  if (!exported) {
    t.skip(
      "out/news/lucknow-smart-city-digital-services-test missing — run build:export first",
    );
    return;
  }
  assert.match(
    exported.head,
    /<title>Lucknow Smart City Initiative \| Miracle Times<\/title>/,
  );
  assert.doesNotMatch(exported.head, /Miracle Times — Miracle Times/);
  assert.match(exported.head, /article:section" content="Uttar Pradesh"/);
  assert.doesNotMatch(exported.head, /localhost:4001/);
  assert.match(exported.html, /application\/ld\+json/);
});
