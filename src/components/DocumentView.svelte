<script lang="ts">
  import { openUrl } from "@tauri-apps/plugin-opener";

  let { html }: { html: string } = $props();

  let container: HTMLElement | undefined;

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
</script>

<article class="document" bind:this={container}>
  {@html html}
</article>

<style>
  .document {
    max-width: 42rem;
    margin: 0 auto;
    padding: 2.5rem 1.5rem 6rem;
    line-height: 1.7;
    font-size: 1rem;
  }

  .document :global(h1),
  .document :global(h2),
  .document :global(h3),
  .document :global(h4),
  .document :global(h5),
  .document :global(h6) {
    line-height: 1.25;
    margin: 2rem 0 0.75rem;
    font-weight: 600;
  }

  .document :global(h1) {
    font-size: 1.875rem;
    margin-top: 0;
  }

  .document :global(h2) {
    font-size: 1.5rem;
  }

  .document :global(h3) {
    font-size: 1.25rem;
  }

  .document :global(p) {
    margin: 0 0 1rem;
  }

  .document :global(a) {
    color: #2f6feb;
  }

  .document :global(a:hover) {
    text-decoration: none;
  }

  .document :global(ul),
  .document :global(ol) {
    margin: 0 0 1rem;
    padding-left: 1.5rem;
  }

  .document :global(li) {
    margin: 0.25rem 0;
  }

  .document :global(blockquote) {
    margin: 0 0 1rem;
    padding: 0.25rem 1rem;
    border-left: 3px solid #d0d7de;
    color: #57606a;
  }

  .document :global(code) {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas,
      monospace;
    font-size: 0.875em;
    background: #f2f3f5;
    padding: 0.15em 0.4em;
    border-radius: 4px;
  }

  .document :global(pre) {
    margin: 0 0 1rem;
    padding: 1rem;
    overflow-x: auto;
    background: #f6f8fa;
    border: 1px solid #e2e5e9;
    border-radius: 6px;
  }

  .document :global(pre code) {
    background: none;
    padding: 0;
    font-size: 0.8125rem;
    line-height: 1.6;
  }

  .document :global(hr) {
    margin: 2rem 0;
    border: none;
    border-top: 1px solid #d8dee4;
  }

  .document :global(img) {
    max-width: 100%;
    height: auto;
  }

  .document :global(table) {
    width: 100%;
    margin: 0 0 1rem;
    border-collapse: collapse;
  }

  .document :global(th),
  .document :global(td) {
    padding: 0.4rem 0.75rem;
    border: 1px solid #d8dee4;
    text-align: left;
  }
</style>
