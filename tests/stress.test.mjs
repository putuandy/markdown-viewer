import assert from "node:assert/strict";
import test from "node:test";
import { renderDocument } from "../src/lib/markdown.ts";

// Pathological documents must render, or fail cleanly, without hanging or
// throwing. Timings are not asserted here; see `npm run measure`.

test("renders ten thousand headings", () => {
  const source = Array.from(
    { length: 10_000 },
    (_, index) => `## Section ${index}\n\ntext\n`,
  ).join("\n");

  const { html, outline } = renderDocument(source);

  assert.equal(outline.length, 10_000);
  assert.equal(outline[0].id, "section-0");
  assert.equal(outline[9_999].id, "section-9999");
  assert.match(html, /<h2 id="section-9999">Section 9999<\/h2>/);
});

test("truncates structures nested beyond the parser limit instead of failing", () => {
  const depth = 200;
  const lists = Array.from(
    { length: depth },
    (_, index) => `${"  ".repeat(index)}- level ${index}`,
  ).join("\n");

  const html = renderDocument(`${lists}\n\n# After\n\ntail text\n`).html;

  // markdown-it stops nesting at maxNesting (100 here) and drops whatever
  // follows, rather than recursing until the stack gives out.
  assert.ok(html.includes("level 19"), "content within the limit renders");
  assert.ok(!html.includes("level 199"), "content beyond the limit is dropped");
  assert.ok(!html.includes("tail text"), "parsing stops at the limit");
});

test("renders nesting up to the limit", () => {
  // Each list level costs two units of the parser budget, so maxNesting 100
  // allows 50 nested lists.
  const depth = 40;
  const lists = Array.from(
    { length: depth },
    (_, index) => `${"  ".repeat(index)}- level ${index}`,
  ).join("\n");

  const html = renderDocument(`${lists}\n\n# After\n\ntail text\n`).html;

  assert.ok(html.includes("level 39"), "nesting within the limit is preserved");
  assert.ok(html.includes("tail text"), "parsing continues after normal nesting");
});

test("renders a single very long line", () => {
  const source = `# Long\n\n${"word ".repeat(150_000)}\n`;
  const { html } = renderDocument(source);

  assert.ok(html.length > 500_000);
  assert.match(html, /^<h1 id="long">Long<\/h1>/);
});

test("renders hundreds of code blocks", () => {
  const source = Array.from(
    { length: 400 },
    (_, index) => `\`\`\`js\nconst value${index} = ${index};\n\`\`\`\n`,
  ).join("\n");

  const { html } = renderDocument(source);

  assert.equal(html.match(/<pre>/g)?.length, 400);
});

test("renders many tables", () => {
  const table = "| a | b |\n| - | - |\n| 1 | 2 |\n\n";

  const { html } = renderDocument(table.repeat(200));

  assert.equal(html.match(/class="table-wrap"/g)?.length, 200);
});

test("merges tables that are not separated by a blank line", () => {
  const table = "| a | b |\n| - | - |\n| 1 | 2 |\n";

  const { html } = renderDocument(table.repeat(3));

  assert.equal(html.match(/class="table-wrap"/g)?.length, 1);
  assert.ok(
    (html.match(/<tr>/g)?.length ?? 0) > 6,
    "the merged table keeps the rows of every block",
  );
});

test("handles unclosed and unusual constructs", () => {
  const source = [
    "```js",
    "const never_closed = true;",
    "",
    "# not a heading inside a fence",
    "",
    "| broken | table",
    "[unclosed link](https://example.com",
    "**bold never closed",
    "> quote",
    "    indented code",
    "\u0000\u0007 control characters",
    "𝔘𝔫𝔦𝔠𝔬𝔡𝔢 headings",
    "<script>alert(1)</script>",
  ].join("\n");

  const { html } = renderDocument(source);

  assert.ok(html.length > 0);
  assert.ok(!/<script/i.test(html), "script tags must stay neutralised");
});

test("handles empty and whitespace-only documents", () => {
  assert.equal(renderDocument("").html, "");
  assert.equal(renderDocument("\n\n   \n").outline.length, 0);
});
