<script lang="ts">
  import { getCurrentWebview } from "@tauri-apps/api/webview";
  import { open } from "@tauri-apps/plugin-dialog";
  import { onMount } from "svelte";
  import DocumentView from "./components/DocumentView.svelte";
  import FileExplorer from "./components/FileExplorer.svelte";
  import Outline from "./components/Outline.svelte";
  import SearchBar from "./components/SearchBar.svelte";
  import Toolbar from "./components/Toolbar.svelte";
  import {
    basename,
    joinPath,
    listMarkdownFiles,
    pathKind,
    readMarkdownFile,
    relativePath,
  } from "./lib/filesystem";
  import { renderDocument } from "./lib/markdown";
  import { clearHighlights } from "./lib/search";
  import { loadSettings, resolveTheme, saveSettings, type AppSettings } from "./lib/settings";
  import { buildFileTree, type FileNode } from "./lib/tree";

  let filePath = $state<string | null>(null);
  let source = $state("");
  let error = $state<string | null>(null);
  let loading = $state(false);
  let systemPrefersDark = $state(false);
  let settings = $state<AppSettings>(loadSettings(localStorage));

  let folderPath = $state<string | null>(null);
  let folderNodes = $state<FileNode[]>([]);
  let folderTruncated = $state(false);

  let contentElement = $state<HTMLElement | undefined>(undefined);
  let searchOpen = $state(false);
  let sidebarTab = $state<"files" | "outline">("files");

  const rendered = $derived(renderDocument(source));
  const html = $derived(rendered.html);
  const outline = $derived(rendered.outline);
  const fileName = $derived(filePath ? basename(filePath) : null);
  const folderName = $derived(folderPath ? basename(folderPath) : null);
  const currentPath = $derived(
    filePath && folderPath ? relativePath(folderPath, filePath) : null,
  );
  const theme = $derived(resolveTheme(settings.theme, systemPrefersDark));
  const hasSidebar = $derived(folderPath !== null || outline.length > 0);
  const sidebarVisible = $derived(settings.sidebar && hasSidebar);
  const sidebarTabVisible = $derived(
    folderPath && sidebarTab === "files" ? "files" : "outline",
  );
  const shortcutLabel = navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl+";

  $effect(() => {
    document.documentElement.dataset.theme = theme;
  });

  $effect(() => {
    saveSettings(localStorage, settings);
  });

  function report(cause: unknown) {
    error = typeof cause === "string" ? cause : String(cause);
  }

  async function loadFile(path: string) {
    error = null;
    loading = true;

    try {
      const contents = await readMarkdownFile(path);
      source = contents;
      filePath = path;
    } catch (cause) {
      report(cause);
    } finally {
      loading = false;
    }
  }

  async function loadFolder(path: string) {
    error = null;

    try {
      const listing = await listMarkdownFiles(path);
      folderPath = path;
      folderNodes = buildFileTree(listing.files);
      folderTruncated = listing.truncated;
      sidebarTab = "files";
    } catch (cause) {
      report(cause);
    }
  }

  async function refreshFolder() {
    if (!folderPath) return;

    try {
      const listing = await listMarkdownFiles(folderPath);
      folderNodes = buildFileTree(listing.files);
      folderTruncated = listing.truncated;
    } catch (cause) {
      report(cause);
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

  async function chooseFolder() {
    const selected = await open({
      title: "Open folder",
      multiple: false,
      directory: true,
    });

    if (typeof selected === "string") {
      await loadFolder(selected);
    }
  }

  function openFromFolder(relativePath: string) {
    if (folderPath) {
      void loadFile(joinPath(folderPath, relativePath));
    }
  }

  function scrollToHeading(id: string) {
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  }

  function closeSearch() {
    searchOpen = false;
    clearHighlights();
  }

  async function openDropped(paths: string[]) {
    for (const path of paths) {
      let kind = "other";

      try {
        kind = await pathKind(path);
      } catch {
        kind = "other";
      }

      if (kind === "directory") {
        await loadFolder(path);
        return;
      }

      if (kind === "markdown") {
        await loadFile(path);
        return;
      }
    }

    error = "Only Markdown files and folders can be opened.";
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && searchOpen) {
      event.preventDefault();
      closeSearch();
      return;
    }

    if (!event.metaKey && !event.ctrlKey) return;

    const key = event.key.toLowerCase();

    if (key === "f") {
      event.preventDefault();
      searchOpen = true;
      return;
    }

    if (key !== "o") return;

    event.preventDefault();

    if (event.shiftKey) {
      void chooseFolder();
    } else {
      void chooseFile();
    }
  }

  onMount(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    systemPrefersDark = media.matches;

    function handleSchemeChange(event: MediaQueryListEvent) {
      systemPrefersDark = event.matches;
    }

    function handleFocus() {
      if (folderPath) void refreshFolder();
    }

    media.addEventListener("change", handleSchemeChange);
    window.addEventListener("focus", handleFocus);

    const unlisten = getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type === "drop") {
        void openDropped(event.payload.paths);
      }
    });

    return () => {
      media.removeEventListener("change", handleSchemeChange);
      window.removeEventListener("focus", handleFocus);
      void unlisten.then((stop) => stop());
    };
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="app">
  <Toolbar
    {filePath}
    {fileName}
    bind:settings
    sidebarAvailable={hasSidebar}
    sidebarVisible={sidebarVisible}
    onOpen={chooseFile}
    onOpenFolder={chooseFolder}
    onToggleSidebar={() => (settings.sidebar = !settings.sidebar)}
  />

  <div class="body">
    {#if sidebarVisible}
      <aside class="sidebar">
        <div class="sidebar-tabs" role="tablist">
          {#if folderPath}
            <button
              class="tab"
              role="tab"
              aria-selected={sidebarTabVisible === "files"}
              onclick={() => (sidebarTab = "files")}
            >
              Files
            </button>
          {/if}
          <button
            class="tab"
            role="tab"
            aria-selected={sidebarTabVisible === "outline"}
            onclick={() => (sidebarTab = "outline")}
          >
            Outline
          </button>
        </div>

        {#if sidebarTabVisible === "files" && folderPath && folderName}
          <FileExplorer
            rootPath={folderPath}
            rootName={folderName}
            nodes={folderNodes}
            {currentPath}
            truncated={folderTruncated}
            onSelect={openFromFolder}
            onRefresh={refreshFolder}
          />
        {:else}
          <Outline entries={outline} root={contentElement} onSelect={scrollToHeading} />
        {/if}
      </aside>
    {/if}

    <div class="viewer">
      {#if searchOpen}
        <SearchBar root={contentElement} revision={html} onClose={closeSearch} />
      {/if}

      <main class="content" bind:this={contentElement}>
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
            <p>Open a Markdown file, or a folder of them, to start reading.</p>
            <div class="actions">
              <button class="primary" onclick={chooseFile}>Open Markdown file</button>
              <button class="primary" onclick={chooseFolder}>Open folder</button>
            </div>
            <p class="hint">
              or press {shortcutLabel}O, {shortcutLabel}⇧O for a folder, or drop one here
            </p>
          </div>
        {/if}
      </main>
    </div>
  </div>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--bg);
  }

  .body {
    display: flex;
    flex: 1;
    min-height: 0;
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    flex: none;
    width: 15.5rem;
    overflow: hidden;
    border-right: 1px solid var(--border);
    background: var(--bg-toolbar);
    font-size: 0.8125rem;
  }

  .sidebar-tabs {
    display: flex;
    flex: none;
    gap: 0.25rem;
    padding: 0.45rem 0.5rem 0;
    border-bottom: 1px solid var(--border);
  }

  .tab {
    padding: 0.3rem 0.6rem 0.4rem;
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: var(--text-muted);
    font: inherit;
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
  }

  .tab:hover {
    color: var(--text);
  }

  .tab[aria-selected="true"] {
    border-bottom-color: var(--accent);
    color: var(--text);
  }

  .viewer {
    position: relative;
    display: flex;
    flex: 1;
    min-width: 0;
    flex-direction: column;
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

  .actions {
    display: flex;
    gap: 0.5rem;
    margin: 1rem 0 0;
  }

  .hint {
    font-size: 0.8125rem;
    color: var(--text-faint);
  }

  .primary {
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
