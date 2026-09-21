import type { HighlighterCore } from "shiki/core";
import type { LanguageRegistration } from "shiki/types";

type LanguageLoader = () => Promise<{ default: LanguageRegistration[] }>;

/**
 * Languages are loaded on demand: each one is a separate chunk that is only
 * fetched once a document actually uses it.
 */
const LANGUAGES: Record<string, LanguageLoader> = {
  bash: () => import("shiki/langs/bash.mjs"),
  c: () => import("shiki/langs/c.mjs"),
  cpp: () => import("shiki/langs/cpp.mjs"),
  csharp: () => import("shiki/langs/csharp.mjs"),
  css: () => import("shiki/langs/css.mjs"),
  diff: () => import("shiki/langs/diff.mjs"),
  docker: () => import("shiki/langs/docker.mjs"),
  go: () => import("shiki/langs/go.mjs"),
  html: () => import("shiki/langs/html.mjs"),
  java: () => import("shiki/langs/java.mjs"),
  javascript: () => import("shiki/langs/javascript.mjs"),
  json: () => import("shiki/langs/json.mjs"),
  jsx: () => import("shiki/langs/jsx.mjs"),
  kotlin: () => import("shiki/langs/kotlin.mjs"),
  markdown: () => import("shiki/langs/markdown.mjs"),
  php: () => import("shiki/langs/php.mjs"),
  python: () => import("shiki/langs/python.mjs"),
  ruby: () => import("shiki/langs/ruby.mjs"),
  rust: () => import("shiki/langs/rust.mjs"),
  sql: () => import("shiki/langs/sql.mjs"),
  swift: () => import("shiki/langs/swift.mjs"),
  toml: () => import("shiki/langs/toml.mjs"),
  tsx: () => import("shiki/langs/tsx.mjs"),
  typescript: () => import("shiki/langs/typescript.mjs"),
  xml: () => import("shiki/langs/xml.mjs"),
  yaml: () => import("shiki/langs/yaml.mjs"),
};

const ALIASES: Record<string, string> = {
  cjs: "javascript",
  console: "bash",
  cs: "csharp",
  dockerfile: "docker",
  htm: "html",
  js: "javascript",
  jsonc: "json",
  kt: "kotlin",
  md: "markdown",
  mjs: "javascript",
  py: "python",
  rb: "ruby",
  rs: "rust",
  sh: "bash",
  ts: "typescript",
  yml: "yaml",
  zsh: "bash",
};

const THEMES = { light: "github-light", dark: "github-dark" };

let highlighterPromise: Promise<HighlighterCore> | undefined;
const loaded = new Set<string>();

/**
 * Shiki itself is imported lazily as well, so documents without code blocks
 * never pay for the highlighter.
 */
function getHighlighter(): Promise<HighlighterCore> {
  highlighterPromise ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }, light, dark] =
      await Promise.all([
        import("shiki/core"),
        import("shiki/engine/javascript"),
        import("shiki/themes/github-light.mjs"),
        import("shiki/themes/github-dark.mjs"),
      ]);

    return createHighlighterCore({
      themes: [light.default, dark.default],
      langs: [],
      engine: createJavaScriptRegexEngine(),
    });
  })();

  return highlighterPromise;
}

/** The language we can highlight for a fenced code block, if any. */
export function highlightableLanguage(language: string): string | null {
  const name = language.trim().toLowerCase();
  if (!name) return null;

  const resolved = LANGUAGES[name] ? name : ALIASES[name];

  return resolved && LANGUAGES[resolved] ? resolved : null;
}

export async function highlightCode(
  code: string,
  language: string,
): Promise<string | null> {
  const name = highlightableLanguage(language);
  if (!name) return null;

  const highlighter = await getHighlighter();

  if (!loaded.has(name)) {
    await highlighter.loadLanguage(LANGUAGES[name]);
    loaded.add(name);
  }

  return highlighter.codeToHtml(code, {
    lang: name,
    themes: THEMES,
    defaultColor: false,
  });
}

/**
 * Replaces fenced code blocks with highlighted markup, one block at a time.
 * Failures are ignored: a document must stay readable even when a grammar
 * cannot be loaded or applied.
 */
export async function highlightCodeBlocks(
  root: HTMLElement,
  shouldStop: () => boolean = () => false,
): Promise<void> {
  const blocks = Array.from(
    root.querySelectorAll<HTMLElement>("pre > code[class*='language-']"),
  );

  for (const block of blocks) {
    if (shouldStop()) return;

    const language = /language-([^\s]+)/.exec(block.className)?.[1] ?? "";

    try {
      const html = await highlightCode(block.textContent ?? "", language);
      if (!html || shouldStop()) continue;

      const template = document.createElement("template");
      template.innerHTML = html;

      const highlighted = template.content.firstElementChild;
      if (highlighted) {
        block.parentElement?.replaceWith(highlighted);
      }
    } catch {
      // Leave the plain code block in place.
    }
  }
}
