import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  normalizeSettings,
  resolveTheme,
  saveSettings,
} from "../src/lib/settings.ts";

function fakeStorage(initial = {}) {
  const entries = new Map(Object.entries(initial));

  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
    },
  };
}

test("falls back to defaults when nothing is stored", () => {
  assert.deepEqual(loadSettings(fakeStorage()), DEFAULT_SETTINGS);
});

test("keeps valid stored settings", () => {
  const storage = fakeStorage({
    "markdown-viewer.settings": JSON.stringify({
      theme: "dark",
      contentWidth: "wide",
      fontSize: "large",
    }),
  });

  assert.deepEqual(loadSettings(storage), {
    theme: "dark",
    contentWidth: "wide",
    fontSize: "large",
  });
});

test("drops invalid or missing values", () => {
  assert.deepEqual(
    normalizeSettings({ theme: "neon", contentWidth: 42, fontSize: "xlarge" }),
    { theme: "system", contentWidth: "medium", fontSize: "xlarge" },
  );

  assert.deepEqual(normalizeSettings(null), DEFAULT_SETTINGS);
  assert.deepEqual(normalizeSettings("not an object"), DEFAULT_SETTINGS);
});

test("survives corrupt stored data", () => {
  const storage = fakeStorage({ "markdown-viewer.settings": "{ not json" });

  assert.deepEqual(loadSettings(storage), DEFAULT_SETTINGS);
});

test("round-trips settings through storage", () => {
  const storage = fakeStorage();
  const settings = { theme: "light", contentWidth: "narrow", fontSize: "small" };

  saveSettings(storage, settings);

  assert.deepEqual(loadSettings(storage), settings);
});

test("does not fail when storage rejects writes", () => {
  const storage = {
    getItem: () => null,
    setItem: () => {
      throw new Error("quota exceeded");
    },
  };

  assert.doesNotThrow(() => saveSettings(storage, DEFAULT_SETTINGS));
});

test("resolves the theme preference", () => {
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
});
