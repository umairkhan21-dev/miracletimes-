import assert from "node:assert/strict";
import test from "node:test";
import { patchHtmlDocumentLang } from "./patch-html-lang.mjs";

test("patchHtmlDocumentLang sets html and site-shell lang from meta", () => {
  const input = `<!DOCTYPE html><html lang="hi"><head>
<meta name="language" content="en"/>
</head><body><div lang="hi" class="site-shell">x</div></body></html>`;
  const result = patchHtmlDocumentLang(input);
  assert.equal(result.lang, "en");
  assert.equal(result.changed, true);
  assert.match(result.html, /<html lang="en"/);
  assert.match(
    result.html,
    /<div[^>]*site-shell[^>]*lang="en"|<div[^>]*lang="en"[^>]*site-shell/,
  );
});

test("patchHtmlDocumentLang is a no-op without language meta", () => {
  const input = `<!DOCTYPE html><html lang="hi"><head></head><body></body></html>`;
  const result = patchHtmlDocumentLang(input);
  assert.equal(result.lang, null);
  assert.equal(result.changed, false);
  assert.equal(result.html, input);
});

test("patchHtmlDocumentLang keeps matching lang unchanged", () => {
  const input = `<!DOCTYPE html><html lang="hi"><head>
<meta name="language" content="hi"/>
</head><body><div class="site-shell" lang="hi">x</div></body></html>`;
  const result = patchHtmlDocumentLang(input);
  assert.equal(result.lang, "hi");
  assert.equal(result.changed, false);
});
