<script lang="ts">
  import { getCurrentWebview } from "@tauri-apps/api/webview";
  import { open } from "@tauri-apps/plugin-dialog";
  import { onMount } from "svelte";
  import DocumentView from "./components/DocumentView.svelte";
  import Toolbar from "./components/Toolbar.svelte";
  import { basename, isMarkdownPath, readMarkdownFile } from "./lib/filesystem";
  import { renderMarkdown } from "./lib/markdown";
  import {
    loadSettings,
    resolveTheme,
    saveSettings,
    type AppSettings,
  } from "./lib/settings";

  let filePath = $state<string | null>(null);
  let source = $state("");
  let error = $state<string | null>(null);
  let loading = $state(false);
  let systemPrefersDark = $state(false);
  let settings = $state<AppSettings>(loadSettings(localStorage));

  const html = $derived(renderMarkdown(source));
  const fileName = $derived(filePath ? basename(filePath) : null);
  const theme = $derived(resolveTheme(settings.theme, systemPrefersDark));
  const shortcutLabel = navigator.platform.toLowerCase().includes("mac")
    ? "⌘O"
    : "Ctrl+O";

  $effect(() => {
    document.documentElement.dataset.theme = theme;
  });

  $effect(() => {
    saveSettings(localStorage, settings);
  });

  async function loadFile(path: string) {
    error = null;
    loading = true;

    try {
      const contents = await readMarkdownFile(path);
      source = contents;
      filePath = path;
    } catch (cause) {
      error = typeof cause === "string" ? cause : String(cause);
    } finally {
      loading = false;
    }
  }

  async function chooseFile() {
    const selected = await open({
      title: "Open Markdown file",
      multiple: false,
      directory: false,
      filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
    });

    if (typeof selected === "string") {
      await loadFile(selected);
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "o") {
      event.preventDefault();
      void chooseFile();
    }
  }

  onMount(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    systemPrefersDark = media.matches;

    function handleSchemeChange(event: MediaQueryListEvent) {
      systemPrefersDark = event.matches;
    }

    media.addEventListener("change", handleSchemeChange);

    const unlisten = getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type !== "drop") return;

      const path = event.payload.paths.find(isMarkdownPath);
      if (path) void loadFile(path);
      else error = "Only .md and .markdown files can be opened.";
    });

    return () => {
      media.removeEventListener("change", handleSchemeChange);
      void unlisten.then((stop) => stop());
    };
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="app">
  <Toolbar {filePath} {fileName} bind:settings onOpen={chooseFile} />

  <main class="content">
    {#if error}
      <p class="notice error" role="alert">{error}</p>
    {/if}

    {#if filePath}
      <DocumentView
        {html}
        documentPath={filePath}
        contentWidth={settings.contentWidth}
        fontSize={settings.fontSize}
      />
    {:else if loading}
      <p class="notice">Opening…</p>
    {:else if !error}
      <div class="empty">
        <h1>Markdown Viewer</h1>
        <p>Open a Markdown file to start reading.</p>
        <button class="primary" onclick={chooseFile}>Open Markdown file</button>
        <p class="hint">or press {shortcutLabel}, or drop a .md file here</p>
      </div>
    {/if}
  </main>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--bg);
  }

  .content {
    flex: 1;
    overflow-y: auto;
    scroll-behavior: smooth;
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 2rem;
    text-align: center;
    color: var(--text-muted);
  }

  .empty h1 {
    margin: 0;
    font-size: 1.375rem;
    color: var(--text);
  }

  .empty p {
    margin: 0.5rem 0 0;
  }

  .empty .hint {
    font-size: 0.8125rem;
    color: var(--text-faint);
  }

  .primary {
    margin: 1rem 0 0;
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-strong);
    border-radius: 6px;
    background: var(--bg);
    color: var(--text);
    font: inherit;
    font-size: 0.9375rem;
    cursor: pointer;
  }

  .primary:hover {
    background: var(--bg-hover);
  }

  .notice {
    max-width: 42rem;
    margin: 1rem auto 0;
    padding: 0 1.5rem;
    color: var(--text-muted);
  }

  .error {
    color: var(--danger);
  }
</style>
