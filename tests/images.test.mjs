import assert from "node:assert/strict";
import test from "node:test";
import { isExternalImage, mimeTypeFor } from "../src/lib/images.ts";

test("classifies sources the webview can load itself", () => {
  const external = [
    "https://example.com/a.png",
    "http://example.com/a.png",
    "//cdn.example.com/a.png",
    "data:image/png;base64,AAA",
    "blob:tauri://localhost/1",
  ];

  for (const source of external) {
    assert.equal(isExternalImage(source), true, `${source} should be external`);
  }
});

test("classifies paths that must be read from disk", () => {
  const local = [
    "images/a.png",
    "./a.png",
    "../a.png",
    "/Users/me/a.png",
    "C:/Users/me/a.png",
    "C:\\Users\\me\\a.png",
    "my image.png",
  ];

  for (const source of local) {
    assert.equal(isExternalImage(source), false, `${source} should be local`);
  }
});

test("maps image extensions to MIME types", () => {
  assert.equal(mimeTypeFor("a.PNG"), "image/png");
  assert.equal(mimeTypeFor("a.jpeg"), "image/jpeg");
  assert.equal(mimeTypeFor("dir/a.svg?v=2"), "image/svg+xml");
  assert.equal(mimeTypeFor("a.webp"), "image/webp");
  assert.equal(mimeTypeFor("a.xyz"), "application/octet-stream");
});
