import assert from "node:assert/strict";
import test from "node:test";
import {
  ancestorsOf,
  buildFileTree,
  flattenVisible,
  withAncestorsExpanded,
} from "../src/lib/tree.ts";

const paths = [
  "docs/install.md",
  "README.md",
  "docs/guide/usage.md",
  "LICENSE.md",
];

test("builds a sorted hierarchy with directories first", () => {
  const tree = buildFileTree(paths);

  assert.deepEqual(
    tree.map((node) => node.path),
    ["docs", "LICENSE.md", "README.md"],
  );
  assert.deepEqual(
    tree[0].children.map((node) => node.path),
    ["docs/guide", "docs/install.md"],
  );
  assert.deepEqual(
    tree[0].children[0].children.map((node) => node.path),
    ["docs/guide/usage.md"],
  );
  assert.equal(tree[0].isDirectory, true);
  assert.equal(tree[1].isDirectory, false);
});

test("ignores duplicate entries", () => {
  const tree = buildFileTree(["README.md", "README.md", "docs/a.md", "docs/a.md"]);

  assert.deepEqual(
    tree.map((node) => node.path),
    ["docs", "README.md"],
  );
  assert.deepEqual(tree[0].children.map((node) => node.path), ["docs/a.md"]);
});

test("keeps a file and a folder of the same name apart", () => {
  const tree = buildFileTree(["api.md", "api/notes.md"]);

  assert.deepEqual(
    tree.map((node) => node.path),
    ["api", "api.md"],
  );
  assert.equal(tree[0].isDirectory, true);
  assert.equal(tree[1].isDirectory, false);
});

test("flattens only expanded branches", () => {
  const tree = buildFileTree(paths);

  assert.deepEqual(
    flattenVisible(tree, {}).map((row) => `${row.depth}:${row.path}`),
    ["0:docs", "0:LICENSE.md", "0:README.md"],
  );

  assert.deepEqual(
    flattenVisible(tree, { docs: true }).map((row) => `${row.depth}:${row.path}`),
    ["0:docs", "1:docs/guide", "1:docs/install.md", "0:LICENSE.md", "0:README.md"],
  );

  assert.deepEqual(
    flattenVisible(tree, { docs: true, "docs/guide": true }).map((row) => `${row.path}`),
    [
      "docs",
      "docs/guide",
      "docs/guide/usage.md",
      "docs/install.md",
      "LICENSE.md",
      "README.md",
    ],
  );
});

test("reports which rows are expanded", () => {
  const rows = flattenVisible(buildFileTree(paths), { docs: true });
  const directory = rows.find((row) => row.path === "docs");
  const collapsed = rows.find((row) => row.path === "docs/guide");

  assert.equal(directory?.expanded, true);
  assert.equal(collapsed?.expanded, false);
});

test("finds the ancestors of a document", () => {
  assert.deepEqual(ancestorsOf("docs/guide/usage.md"), ["docs", "docs/guide"]);
  assert.deepEqual(ancestorsOf("README.md"), []);
});

test("expands ancestors without needless work", () => {
  const expanded = withAncestorsExpanded({}, "docs/guide/usage.md");

  assert.deepEqual(expanded, { docs: true, "docs/guide": true });
  assert.equal(withAncestorsExpanded(expanded, "docs/guide/usage.md"), expanded);
  assert.equal(withAncestorsExpanded(expanded, "docs/install.md"), expanded);
  assert.deepEqual(withAncestorsExpanded(expanded, "other/deep/file.md"), {
    docs: true,
    "docs/guide": true,
    other: true,
    "other/deep": true,
  });
});
