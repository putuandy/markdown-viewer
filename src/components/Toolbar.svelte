<script lang="ts">
  import {
    CONTENT_WIDTHS,
    FONT_SIZES,
    THEME_PREFERENCES,
    type AppSettings,
    type ContentWidth,
    type FontSize,
    type ThemePreference,
  } from "../lib/settings";

  let {
    filePath = null,
    fileName = null,
    settings = $bindable(),
    sidebarAvailable = false,
    sidebarVisible = false,
    onOpen,
    onOpenFolder,
    onToggleSidebar,
  }: {
    filePath?: string | null;
    fileName?: string | null;
    settings: AppSettings;
    sidebarAvailable?: boolean;
    sidebarVisible?: boolean;
    onOpen: () => void;
    onOpenFolder: () => void;
    onToggleSidebar: () => void;
  } = $props();

  const THEME_LABELS: Record<ThemePreference, string> = {
    system: "System",
    light: "Light",
    dark: "Dark",
  };

  const WIDTH_LABELS: Record<ContentWidth, string> = {
    narrow: "Narrow",
    medium: "Medium",
    wide: "Wide",
    full: "Full width",
  };

  const SIZE_LABELS: Record<FontSize, string> = {
    small: "Small",
    medium: "Medium",
    large: "Large",
    xlarge: "Extra large",
  };

  let overflowOpen = $state(false);
  let overflowElement: HTMLElement | undefined;

  function handleWindowClick(event: MouseEvent) {
    if (!overflowOpen) return;

    const target = event.target as Node | null;
    if (!target || !overflowElement?.contains(target)) {
      overflowOpen = false;
    }
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      overflowOpen = false;
    }
  }
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleWindowKeydown} />

<header class="toolbar">
  <span class="app-name">Markdown Viewer</span>
  {#if fileName}
    <span class="file-name" title={filePath ?? ""}>{fileName}</span>
  {/if}

  <div class="actions">
    {#if sidebarAvailable}
      <button
        class="button icon"
        aria-pressed={sidebarVisible}
        title={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
        onclick={onToggleSidebar}
      >
        ☰
      </button>
    {/if}

    <button class="button" onclick={onOpen} title="Open a Markdown file">
      Open file
    </button>

    <button class="button" onclick={onOpenFolder} title="Open a folder of Markdown files">
      Open folder
    </button>

    <label class="field">
      <span class="field-label">Theme</span>
      <select class="select" bind:value={settings.theme}>
        {#each THEME_PREFERENCES as preference (preference)}
          <option value={preference}>{THEME_LABELS[preference]}</option>
        {/each}
      </select>
    </label>

    <div class="overflow" bind:this={overflowElement}>
      <button
        class="button icon"
        aria-haspopup="true"
        aria-expanded={overflowOpen}
        title="More options"
        onclick={() => (overflowOpen = !overflowOpen)}
      >
        ⋯
      </button>

      {#if overflowOpen}
        <div class="popover">
          <label class="field stacked">
            <span class="field-label">Content width</span>
            <select class="select" bind:value={settings.contentWidth}>
              {#each CONTENT_WIDTHS as width (width)}
                <option value={width}>{WIDTH_LABELS[width]}</option>
              {/each}
            </select>
          </label>

          <label class="field stacked">
            <span class="field-label">Text size</span>
            <select class="select" bind:value={settings.fontSize}>
              {#each FONT_SIZES as size (size)}
                <option value={size}>{SIZE_LABELS[size]}</option>
              {/each}
            </select>
          </label>
        </div>
      {/if}
    </div>
  </div>
</header>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: none;
    padding: 0 0.75rem;
    height: 2.75rem;
    border-bottom: 1px solid var(--border);
    background: var(--bg-toolbar);
    color: var(--text);
    font-size: 0.8125rem;
  }

  .app-name {
    font-weight: 600;
  }

  .file-name {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--text-muted);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: auto;
  }

  .button {
    padding: 0.3rem 0.7rem;
    border: 1px solid var(--border-strong);
    border-radius: 6px;
    background: var(--bg);
    color: var(--text);
    font: inherit;
    cursor: pointer;
  }

  .button:hover {
    background: var(--bg-hover);
  }

  .button.icon {
    padding: 0.3rem 0.55rem;
    font-size: 1rem;
    line-height: 1;
  }

  .field {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .field.stacked {
    flex-direction: column;
    align-items: stretch;
    gap: 0.3rem;
  }

  .field-label {
    color: var(--text-muted);
  }

  .select {
    padding: 0.3rem 0.4rem;
    border: 1px solid var(--border-strong);
    border-radius: 6px;
    background: var(--bg);
    color: var(--text);
    font: inherit;
  }

  .select:hover {
    background: var(--bg-hover);
  }

  .overflow {
    position: relative;
  }

  .popover {
    position: absolute;
    top: calc(100% + 0.4rem);
    right: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-width: 11rem;
    padding: 0.75rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg-popover);
    box-shadow: var(--shadow-popover);
  }
</style>
