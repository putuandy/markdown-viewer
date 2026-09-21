import assert from "node:assert/strict";
import test from "node:test";
import { findMatchIndices } from "../src/lib/search.ts";

test("finds case-insensitive matches", () => {
  assert.deepEqual(findMatchIndices("The cat sat on the CAT mat", "cat"), [
    [4, 7],
    [19, 22],
  ]);
});

test("does not overlap matches", () => {
  assert.deepEqual(findMatchIndices("aaaa", "aa"), [
    [0, 2],
    [2, 4],
  ]);
});

test("finds every occurrence", () => {
  assert.deepEqual(findMatchIndices("one two one two one", "one"), [
    [0, 3],
    [8, 11],
    [16, 19],
  ]);
});

test("treats the query literally", () => {
  assert.deepEqual(findMatchIndices("a.b", "."), [[1, 2]]);
  assert.deepEqual(findMatchIndices("axb", "."), []);
});

test("handles empty and missing queries", () => {
  assert.deepEqual(findMatchIndices("abc", ""), []);
  assert.deepEqual(findMatchIndices("", "abc"), []);
  assert.deepEqual(findMatchIndices("abc", "zzz"), []);
});
