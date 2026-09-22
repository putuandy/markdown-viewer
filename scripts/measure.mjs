import { createMarkdownIt, renderDocument, sanitizeTokens } from "../src/lib/markdown.ts";
import { highlightCode } from "../src/lib/highlight.ts";
import { findMatchIndices } from "../src/lib/search.ts";

const paragraph =
  "Lorem ipsum dolor sit amet, **consectetur** adipiscing elit, sed do `eiusmod` tempor incididunt ut labore.\n\nA [link](https://example.com) and a list:\n\n- one\n- two\n- three\n\n```js\nconst x = 1;\n```\n\n";

function documentOf(sizeInBytes) {
  let doc = "# Large Document\n\n";

  while (doc.length < sizeInBytes) {
    doc += `## Section\n\n${paragraph}`;
  }

  return doc;
}

function time(label, run) {
  const started = performance.now();
  const result = run();

  console.log(`${label.padEnd(48)} ${(performance.now() - started).toFixed(1)} ms`);

  return result;
}

console.log("Rendering");
for (const [label, size] of [
  ["100 KB", 100 * 1024],
  ["1 MB", 1024 * 1024],
  ["5 MB", 5 * 1024 * 1024],
]) {
  const source = documentOf(size);
  time(`${label} document`, () => renderDocument(source));
}

console.log("\nWhere the time goes (1 MB)");
{
  const source = documentOf(1024 * 1024);
  const md = createMarkdownIt();
  const env = {};
  const tokens = time("parse", () => md.parse(source, env));

  time("render tokens to HTML", () => md.renderer.render(tokens, md.options, env));
  time("sanitise tokens", () => sanitizeTokens(tokens));
}

console.log("\nSyntax highlighting");
const code = Array.from(
  { length: 40 },
  (_, index) => `export function fn${index}(value: number) { return value * ${index}; }`,
).join("\n");

await time("first highlight (loads the grammar)", () => highlightCode(code, "ts"));
await time("highlight with a warm grammar", () => highlightCode(code, "ts"));

console.log("\nSearch matching");
const haystack = paragraph.repeat(2000);
time(`find every match in ${(haystack.length / 1024).toFixed(0)} KB of text`, () =>
  findMatchIndices(haystack, "consectetur"),
);
