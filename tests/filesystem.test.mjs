import assert from "node:assert/strict";
import test from "node:test";
import {
  basename,
  isMarkdownPath,
  joinPath,
  relativePath,
} from "../src/lib/filesystem.ts";

test("detects Markdown paths", () => {
  assert.equal(isMarkdownPath("/docs/README.md"), true);
  assert.equal(isMarkdownPath("notes.MARKDOWN"), true);
  assert.equal(isMarkdownPath("notes.txt"), false);
  assert.equal(isMarkdownPath("README.md.bak"), false);
});

test("reads the last path segment", () => {
  assert.equal(basename("/Users/me/docs/README.md"), "README.md");
  assert.equal(basename("C:\\Users\\me\\README.md"), "README.md");
  assert.equal(basename("/Users/me/docs/"), "docs");
});

test("joins relative paths onto a folder", () => {
  assert.equal(joinPath("/Users/me/docs", "guide/usage.md"), "/Users/me/docs/guide/usage.md");
  assert.equal(joinPath("/Users/me/docs/", "README.md"), "/Users/me/docs/README.md");
  assert.equal(
    joinPath("C:\\Users\\me\\docs", "guide/usage.md"),
    "C:\\Users\\me\\docs\\guide\\usage.md",
  );
});

test("relativizes paths inside a folder", () => {
  assert.equal(relativePath("/Users/me/docs", "/Users/me/docs/README.md"), "README.md");
  assert.equal(relativePath("/Users/me/docs", "/Users/me/docs/guide/a.md"), "guide/a.md");
  assert.equal(relativePath("/Users/me/docs/", "/Users/me/docs/a.md"), "a.md");
});

test("refuses paths outside the folder", () => {
  assert.equal(relativePath("/Users/me/docs", "/Users/me/docs-extra/a.md"), null);
  assert.equal(relativePath("/Users/me/docs", "/Users/me/other/a.md"), null);
  assert.equal(relativePath("/Users/me/docs", "/Users/me/docs"), null);
});
