<script lang="ts">
  import { getCurrentWebview } from "@tauri-apps/api/webview";
  import { open } from "@tauri-apps/plugin-dialog";
  import { onMount } from "svelte";
  import DocumentView from "./components/DocumentView.svelte";
  import { basename, isMarkdownPath, readMarkdownFile } from "./lib/filesystem";
  import { renderMarkdown } from "./lib/markdown";

  let filePath = $state<string | null>(null);
  let source = $state("");
  let error = $state<string | null>(null);
  let loading = $state(false);

  const html = $derived(renderMarkdown(source));
  const fileName = $derived(filePath ? basename(filePath) : null);
  const shortcutLabel = navigator.platform.toLowerCase().includes("mac")
    ? "⌘O"
    : "Ctrl+O";

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
    const unlisten = getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type !== "drop") return;

      const path = event.payload.paths.find(isMarkdownPath);
      if (path) void loadFile(path);
      else error = "Only .md and .markdown files can be opened.";
    });

    return () => {
      void unlisten.then((stop) => stop());
    };
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="app">
  <header class="topbar">
    <span class="app-name">Markdown Viewer</span>
    {#if fileName}
      <span class="file-name" title={filePath ?? ""}>{fileName}</span>
    {/if}
    <button class="open-button" onclick={chooseFile}>Open</button>
  </header>

  <main class="content">
    {#if error}
      <p class="notice error" role="alert">{error}</p>
    {/if}

    {#if loading}
      <p class="notice">Opening…</p>
    {:else if filePath}
      <DocumentView {html} />
    {:else if !error}
      <div class="empty">
        <h1>Markdown Viewer</h1>
        <p>Open a Markdown file to start reading.</p>
        <button class="open-button primary" onclick={chooseFile}>
          Open Markdown file
        </button>
        <p class="hint">
          or press {shortcutLabel}, or drop a .md file here
        </p>
      </div>
    {/if}
  </main>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  .topbar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: none;
    padding: 0 0.75rem;
    height: 2.5rem;
    border-bottom: 1px solid #e2e5e9;
    background: #f6f8fa;
    font-size: 0.8125rem;
  }

  .app-name {
    font-weight: 600;
    color: #1f2328;
  }

  .file-name {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: #57606a;
  }

  .open-button {
    margin-left: auto;
    padding: 0.3rem 0.7rem;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    background: #ffffff;
    color: #1f2328;
    font: inherit;
    cursor: pointer;
  }

  .open-button:hover {
    background: #f3f4f6;
  }

  .open-button.primary {
    margin: 1rem 0 0;
    padding: 0.5rem 1rem;
    font-size: 0.9375rem;
  }

  .content {
    flex: 1;
    overflow-y: auto;
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 2rem;
    text-align: center;
    color: #57606a;
  }

  .empty h1 {
    margin: 0;
    font-size: 1.375rem;
    color: #1f2328;
  }

  .empty p {
    margin: 0.5rem 0 0;
  }

  .hint {
    font-size: 0.8125rem;
  }

  .notice {
    max-width: 42rem;
    margin: 1rem auto 0;
    padding: 0 1.5rem;
    color: #57606a;
  }

  .error {
    color: #b42318;
  }
</style>
