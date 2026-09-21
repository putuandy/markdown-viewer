import MarkdownIt from "markdown-it";
import footnote from "markdown-it-footnote";
import Token from "markdown-it/lib/token.mjs";

const URL_ATTRIBUTES = new Set([
  "href",
  "src",
  "poster",
  "action",
  "formaction",
  "cite",
  "xlink:href",
]);

/** Attributes that can carry script, styling or exfiltration payloads. */
const DROPPED_ATTRIBUTES = /^(on[a-z]+|style|srcdoc|srcset)$/i;

const SAFE_SCHEMES = /^(https?|mailto|tel|blob):/;
const SAFE_DATA_IMAGE = /^data:image\/(gif|png|jpe?g|webp|avif);base64,/;

const TASK_MARKER = /^\[([ xX])\](?:\s+|$)/;

/**
 * Allows document-relative paths, fragments, a few safe schemes, and inline
 * images for image sources. Everything else — `javascript:`, `vbscript:`,
 * `file:`, `data:text/html`, obfuscated variants — is rejected.
 */
export function isSafeUrl(value: string, image = false): boolean {
  const url = value.replace(/[\u0000-\u0020\u007f]+/g, "").toLowerCase();

  if (!url) return false;
  if (url.startsWith("#")) return true;
  if (!/^[a-z][a-z0-9+.-]*:/.test(url)) return true;
  if (SAFE_SCHEMES.test(url)) return true;

  return image && SAFE_DATA_IMAGE.test(url);
}

/**
 * Removes anything from a parsed document that could execute, restyle or leak.
 *
 * Raw HTML tokens become plain text, URL attributes are checked against
 * [`isSafeUrl`], and event handler and style attributes are dropped. This runs
 * after every other core rule, so plugin output is covered too.
 */
export function sanitizeTokens(tokens: Token[]): void {
  for (const token of tokens) {
    if (token.type === "html_block" || token.type === "html_inline") {
      // The renderer escapes `text` tokens instead of passing them through.
      token.type = "text";
    }

    if (token.attrs) {
      token.attrs = token.attrs.filter(([name, value]) => {
        const attribute = name.toLowerCase();

        if (DROPPED_ATTRIBUTES.test(attribute)) return false;
        if (URL_ATTRIBUTES.has(attribute)) {
          return isSafeUrl(value, attribute === "src" || attribute === "poster");
        }

        return true;
      });
    }

    if (token.children) {
      sanitizeTokens(token.children);
    }
  }
}

export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "section";
}

function applyHeadingAnchors(tokens: Token[]): void {
  const seen = new Map<string, number>();

  tokens.forEach((token, index) => {
    if (token.type !== "heading_open") return;

    const inline = tokens[index + 1];
    if (!inline || inline.type !== "inline") return;

    const base = slugify(inline.content);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);

    token.attrSet("id", count === 0 ? base : `${base}-${count}`);
  });
}

function addClass(token: Token, className: string): void {
  const classes = (token.attrGet("class") ?? "").split(/\s+/).filter(Boolean);

  if (!classes.includes(className)) {
    token.attrJoin("class", className);
  }
}

/**
 * GitHub-flavoured task lists, rendered through a dedicated token so that no
 * raw HTML has to reach the document.
 */
function applyTaskLists(tokens: Token[]): void {
  const lists: Token[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token.type === "bullet_list_open" || token.type === "ordered_list_open") {
      lists.push(token);
      continue;
    }

    if (token.type === "bullet_list_close" || token.type === "ordered_list_close") {
      lists.pop();
      continue;
    }

    if (token.type !== "list_item_open") continue;

    let paragraphIndex = -1;

    for (let next = index + 1; next < tokens.length; next += 1) {
      const candidate = tokens[next];

      if (
        candidate.type === "list_item_close" ||
        candidate.type === "bullet_list_open" ||
        candidate.type === "ordered_list_open"
      ) {
        break;
      }

      if (candidate.type === "paragraph_open") {
        paragraphIndex = next;
        break;
      }
    }

    if (paragraphIndex < 0) continue;

    const inline = tokens[paragraphIndex + 1];
    const children = inline?.children;
    if (!inline || inline.type !== "inline" || !children) continue;

    const textIndex = children.findIndex((child) => child.type === "text");
    if (textIndex < 0) continue;

    const marker = TASK_MARKER.exec(children[textIndex].content);
    if (!marker) continue;

    children[textIndex].content = children[textIndex].content.slice(marker[0].length);

    const checkbox = new Token("task_checkbox", "", 0);
    checkbox.meta = { checked: marker[1].toLowerCase() === "x" };
    children.splice(textIndex, 0, checkbox);

    token.attrJoin("class", "task-list-item");

    const list = lists[lists.length - 1];
    if (list) addClass(list, "contains-task-list");
  }
}

export function createMarkdownIt({ html = false }: { html?: boolean } = {}): MarkdownIt {
  const md = new MarkdownIt({ html, linkify: true });

  md.use(footnote);

  md.renderer.rules.link_open = (tokens, index, options, _env, self) => {
    const href = tokens[index].attrGet("href") ?? "";

    if (!href.startsWith("#")) {
      tokens[index].attrSet("target", "_blank");
      tokens[index].attrSet("rel", "noopener noreferrer");
    }

    return self.renderToken(tokens, index, options);
  };

  md.renderer.rules.task_checkbox = (tokens, index) =>
    `<input class="task-checkbox" type="checkbox" disabled${
      tokens[index].meta?.checked ? " checked" : ""
    }> `;

  md.renderer.rules.table_open = () => '<div class="table-wrap">\n<table>\n';
  md.renderer.rules.table_close = () => "</table>\n</div>\n";

  md.core.ruler.push("task_lists", (state) => applyTaskLists(state.tokens));
  md.core.ruler.push("heading_anchors", (state) => applyHeadingAnchors(state.tokens));
  md.core.ruler.push("sanitize", (state) => sanitizeTokens(state.tokens));

  return md;
}

const md = createMarkdownIt();

export function renderMarkdown(source: string): string {
  return md.render(source);
}
