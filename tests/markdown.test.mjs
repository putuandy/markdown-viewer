import assert from "node:assert/strict";
import test from "node:test";
import { renderMarkdown } from "../src/lib/markdown.ts";

const source = `# Title

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

<script>alert("xss")</script>

<img src="x" onload="alert('xss')">

[bad](javascript:alert(1))
`;

const html = renderMarkdown(source);

test("renders the supported Markdown features", () => {
  const checks = [
    ["heading", /<h1>Title<\/h1>/],
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

test("treats Markdown as untrusted input", () => {
  assert.ok(!html.includes("<script>"), "raw script tags must not reach the output");
  assert.ok(html.includes("&lt;script&gt;"), "raw script tags must be escaped");
  assert.ok(
    !/<[a-z][^>]*\son\w+\s*=/i.test(html),
    "event handler attributes must not become real attributes",
  );
});

test("rejects unsafe link protocols", () => {
  const unsafe = [
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "vbscript:msgbox(1)",
    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
  ];

  for (const href of unsafe) {
    const output = renderMarkdown(`[bad](${href})`);
    assert.ok(!output.includes("href="), `${href} must not become a link`);
  }
});
