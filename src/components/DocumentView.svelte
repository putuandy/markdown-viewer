<script lang="ts">
  import { openUrl } from "@tauri-apps/plugin-opener";
  import { resolveLocalImages } from "../lib/images";
  import {
    CONTENT_WIDTH_VALUES,
    FONT_SIZE_VALUES,
    type ContentWidth,
    type FontSize,
  } from "../lib/settings";

  let {
    html,
    documentPath = null,
    contentWidth = "medium",
    fontSize = "medium",
  }: {
    html: string;
    documentPath?: string | null;
    contentWidth?: ContentWidth;
    fontSize?: FontSize;
  } = $props();

  let container: HTMLElement | undefined;

  const style = $derived(
    `--content-width: ${CONTENT_WIDTH_VALUES[contentWidth]}; --content-size: ${
      FONT_SIZE_VALUES[fontSize]
    };`,
  );

  $effect(() => {
    const element = container;
    if (!element) return;

    function handleClick(event: MouseEvent) {
      const target = event.currentTarget as HTMLElement;
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor || !target.contains(anchor)) return;

      const href = anchor.getAttribute("href") ?? "";
      event.preventDefault();

      if (/^https?:\/\//i.test(href)) {
        void openUrl(href);
      }
    }

    element.addEventListener("click", handleClick);
    return () => element.removeEventListener("click", handleClick);
  });

  $effect(() => {
    const element = container;
    const path = documentPath;
    const body = html;

    if (!element || !path || !body) return;

    let release: (() => void) | undefined;
    let cancelled = false;

    void resolveLocalImages(element, path).then((cleanup) => {
      if (cancelled) cleanup();
      else release = cleanup;
    });

    return () => {
      cancelled = true;
      release?.();
    };
  });
</script>

<article class="document" bind:this={container} {style}>
  {@html html}
</article>

<style>
  .document {
    max-width: var(--content-width);
    margin: 0 auto;
    padding: 2.5rem 1.5rem 6rem;
    font-family: var(--font-content);
    font-size: var(--content-size);
    line-height: 1.7;
    color: var(--text);
    overflow-wrap: break-word;
  }

  .document :global(h1),
  .document :global(h2),
  .document :global(h3),
  .document :global(h4),
  .document :global(h5),
  .document :global(h6) {
    margin: 2rem 0 0.75rem;
    font-weight: 600;
    line-height: 1.3;
  }

  .document :global(h1) {
    margin-top: 0;
    font-size: 1.875em;
    letter-spacing: -0.01em;
  }

  .document :global(h2) {
    padding-bottom: 0.3em;
    border-bottom: 1px solid var(--border);
    font-size: 1.4em;
  }

  .document :global(h3) {
    font-size: 1.2em;
  }

  .document :global(h4),
  .document :global(h5),
  .document :global(h6) {
    font-size: 1em;
  }

  .document :global(p) {
    margin: 0 0 1em;
  }

  .document :global(a) {
    color: var(--accent);
    text-decoration: none;
  }

  .document :global(a:hover) {
    text-decoration: underline;
  }

  .document :global(strong) {
    font-weight: 600;
  }

  .document :global(ul),
  .document :global(ol) {
    margin: 0 0 1em;
    padding-left: 1.6em;
  }

  .document :global(li) {
    margin: 0.2em 0;
  }

  .document :global(li > p) {
    margin: 0 0 0.5em;
  }

  .document :global(blockquote) {
    margin: 0 0 1em;
    padding: 0.1em 1em;
    border-left: 3px solid var(--border-strong);
    color: var(--text-muted);
  }

  .document :global(blockquote > :last-child) {
    margin-bottom: 0;
  }

  .document :global(code) {
    font-family: var(--font-mono);
    font-size: 0.875em;
    background: var(--bg-inline-code);
    padding: 0.15em 0.35em;
    border-radius: 4px;
  }

  .document :global(pre) {
    margin: 0 0 1.25em;
    padding: 1em 1.15em;
    overflow-x: auto;
    background: var(--bg-code);
    border: 1px solid var(--border-code);
    border-radius: 8px;
    line-height: 1.6;
    tab-size: 4;
  }

  .document :global(pre code) {
    background: none;
    padding: 0;
    border-radius: 0;
    font-size: 0.8125em;
  }

  .document :global(hr) {
    margin: 2.5em 0;
    border: none;
    border-top: 1px solid var(--border);
  }

  .document :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
  }

  .document :global(.table-wrap) {
    margin: 0 0 1.25em;
    overflow-x: auto;
  }

  .document :global(table) {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9375em;
  }

  .document :global(th),
  .document :global(td) {
    padding: 0.45em 0.85em;
    border: 1px solid var(--border-strong);
    text-align: left;
  }

  .document :global(th) {
    background: var(--bg-toolbar);
    font-weight: 600;
  }

  .document :global(tbody tr:nth-child(even)) {
    background: var(--bg-stripe);
  }
</style>
