import assert from "node:assert/strict";
import test from "node:test";
import { highlightCode, highlightableLanguage } from "../src/lib/highlight.ts";

test("resolves languages and their aliases", () => {
  assert.equal(highlightableLanguage("js"), "javascript");
  assert.equal(highlightableLanguage("JavaScript"), "javascript");
  assert.equal(highlightableLanguage("py"), "python");
  assert.equal(highlightableLanguage("sh"), "bash");
  assert.equal(highlightableLanguage("rs"), "rust");
  assert.equal(highlightableLanguage(""), null);
  assert.equal(highlightableLanguage("brainfuck"), null);
});

test("highlights code with both themes", async () => {
  const html = await highlightCode("const answer = 42;", "js");

  assert.ok(html, "expected highlighted output");
  assert.match(html, /class="shiki/);
  assert.match(html, /--shiki-light:/);
  assert.match(html, /--shiki-dark:/);
  assert.ok(!html.includes("background-color"), "background stays with the stylesheet");
});

test("escapes code content", async () => {
  const html = await highlightCode('<script>alert("x")</script>', "html");

  assert.ok(html);
  assert.ok(!/<script/i.test(html), "code content must be escaped");
  assert.match(html, /&#x3C;|&lt;/, "the angle bracket must be escaped");
});

test("returns nothing for languages it cannot highlight", async () => {
  assert.equal(await highlightCode("???", "brainfuck"), null);
});
