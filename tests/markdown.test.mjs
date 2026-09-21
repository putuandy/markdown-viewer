import assert from "node:assert/strict";
import test from "node:test";
import {
  createMarkdownIt,
  isSafeUrl,
  renderMarkdown,
  slugify,
} from "../src/lib/markdown.ts";

test("renders the supported Markdown features", () => {
  const html = renderMarkdown(`# Title

A paragraph with **bold**, *italic* and \`inline code\`.

[External link](https://example.com)

- item
- item

1. ordered
2. ordered

> quote

\`\`\`js
console.log("hello");
\`\`\`

| a | b |
| - | - |
| 1 | 2 |

![alt text](image.png)

---
`);

  const checks = [
    ["heading", /<h1 id="title">Title<\/h1>/],
    ["paragraph", /<p>A paragraph with/],
    ["strong", /<strong>bold<\/strong>/],
    ["emphasis", /<em>italic<\/em>/],
    ["inline code", /<code>inline code<\/code>/],
    [
      "link that opens outside the webview",
      /<a href="https:\/\/example\.com" target="_blank" rel="noopener noreferrer">/,
    ],
    ["unordered list", /<ul>\s*<li>item<\/li>/],
    ["ordered list", /<ol>\s*<li>ordered<\/li>/],
    ["blockquote", /<blockquote>/],
    [
      "fenced code block",
      /<pre><code class="language-js">console\.log\(&quot;hello&quot;\);\n<\/code><\/pre>/,
    ],
    ["table wrapped for horizontal scrolling", /<div class="table-wrap">\s*<table>/],
    ["table rows", /<th>a<\/th>[\s\S]*<td>1<\/td>/],
    ["image", /<img src="image\.png" alt="alt text">/],
    ["horizontal rule", /<hr>/],
  ];

  for (const [name, pattern] of checks) {
    assert.match(html, pattern, `expected the ${name} to render`);
  }
});

test("renders GitHub flavoured Markdown", () => {
  const html = renderMarkdown(`~~gone~~

www.example.com

- [x] done
- [ ] open
`);

  assert.match(html, /<s>gone<\/s>/);
  assert.match(html, /<a href="http:\/\/www\.example\.com" target="_blank" rel="noopener noreferrer">www\.example\.com<\/a>/);
  assert.match(html, /<ul class="contains-task-list">/);
  assert.match(
    html,
    /<li class="task-list-item"><input class="task-checkbox" type="checkbox" disabled checked> done<\/li>/,
  );
  assert.match(
    html,
    /<li class="task-list-item"><input class="task-checkbox" type="checkbox" disabled> open<\/li>/,
  );
});

test("renders footnotes", () => {
  const html = renderMarkdown(`A claim[^1].

[^1]: The source.
`);

  assert.match(html, /<sup class="footnote-ref"><a href="#fn1" id="fnref1">\[1\]<\/a><\/sup>/);
  assert.match(html, /<section class="footnotes">/);
  assert.match(html, /<a href="#fnref1" class="footnote-backref">/);
  assert.match(html, /The source\./);
});

test("adds unique anchors to headings", () => {
  const html = renderMarkdown(`## Installation

### Installation

text
`);

  assert.match(html, /<h2 id="installation">/);
  assert.match(html, /<h3 id="installation-1">/);
});

test("slugifies heading text", () => {
  assert.equal(slugify("Hello, World!"), "hello-world");
  assert.equal(slugify("Café déjà vu"), "café-déjà-vu");
  assert.equal(slugify("  spaced   out  "), "spaced-out");
  assert.equal(slugify("!!!"), "section");
});

test("fragment links are left in place for the reader to follow", () => {
  const html = renderMarkdown(`[jump](#installation)

## Installation
`);

  assert.match(html, /<a href="#installation">jump<\/a>/);
  assert.doesNotMatch(html, /href="#installation" target/);
});

test("treats Markdown as untrusted input", () => {
  const html = renderMarkdown(`<script>alert("xss")</script>

<img src="x" onload="alert('xss')">

<iframe src="https://example.com"></iframe>

[bad](javascript:alert(1))
`);

  assert.ok(!html.includes("<script>"), "raw script tags must not reach the output");
  assert.ok(!html.includes("<iframe"), "iframes must not reach the output");
  assert.ok(html.includes("&lt;script&gt;"), "raw script tags must be escaped");
  assert.ok(
    !/<[a-z][^>]*\son\w+\s*=/i.test(html),
    "event handler attributes must not become real attributes",
  );
  assert.ok(
    !/<[a-z][^>]*\s(href|src)\s*=\s*["']?\s*javascript:/i.test(html),
    "javascript: URLs must not become real attributes",
  );
});

test("neutralizes raw HTML even when it is enabled", () => {
  const md = createMarkdownIt({ html: true });
  const html = md.render(`<script>alert(1)</script>

<img src="x" onerror="alert(1)" style="background: url(https://evil.test)">

<iframe src="https://example.com"></iframe>

<a href="javascript:alert(1)">click</a>
`);

  assert.ok(!/<script/i.test(html), "script tags must be neutralized");
  assert.ok(!/<iframe/i.test(html), "iframes must be neutralized");
  assert.ok(!/<[a-z][^>]*\son\w+\s*=/i.test(html), "event handlers must be dropped");
  assert.ok(!/<[a-z][^>]*\sstyle\s*=/i.test(html), "style attributes must be dropped");
  assert.ok(
    !/<[a-z][^>]*\s(href|src)\s*=\s*["']?\s*javascript:/i.test(html),
    "javascript: URLs must be dropped",
  );
});

test("allows the safe URL forms", () => {
  assert.equal(isSafeUrl("https://example.com/a"), true);
  assert.equal(isSafeUrl("mailto:hi@example.com"), true);
  assert.equal(isSafeUrl("#anchor"), true);
  assert.equal(isSafeUrl("docs/readme.md"), true);
  assert.equal(isSafeUrl("/absolute/path.png"), true);
  assert.equal(isSafeUrl("data:image/png;base64,AAAA", true), true);
});

test("rejects the unsafe URL forms", () => {
  const unsafe = [
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "java\nscript:alert(1)",
    "java\tscript:alert(1)",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
  ];

  for (const url of unsafe) {
    assert.equal(isSafeUrl(url), false, `${url} must be rejected`);
    assert.equal(isSafeUrl(url, true), false, `${url} must be rejected for images`);
  }
});

test("rejects unsafe link and image destinations end to end", () => {
  const payloads = [
    "[x](javascript:alert(1))",
    "[x](JaVaScRiPt:alert(1))",
    "[x](vbscript:msgbox(1))",
    "[x](file:///etc/passwd)",
    "[x](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)",
    "![x](javascript:alert(1))",
    "![x](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)",
  ];

  for (const payload of payloads) {
    const html = renderMarkdown(payload);

    assert.ok(!html.includes("href="), `${payload} must not become a link`);
    assert.ok(!html.includes("src="), `${payload} must not become an image source`);
  }
});
