<script lang="ts">
  import { flattenVisible, withAncestorsExpanded, type Expansion, type FileNode } from "../lib/tree";

  let {
    rootPath,
    rootName,
    nodes,
    currentPath = null,
    truncated = false,
    onSelect,
    onRefresh,
  }: {
    rootPath: string;
    rootName: string;
    nodes: FileNode[];
    currentPath?: string | null;
    truncated?: boolean;
    onSelect: (path: string) => void;
    onRefresh: () => void;
  } = $props();

  let expansion = $state<Expansion>({});
  let listElement: HTMLUListElement | undefined;

  const rows = $derived(flattenVisible(nodes, expansion));

  $effect(() => {
    const path = currentPath;
    if (!path) return;

    const next = withAncestorsExpanded(expansion, path);
    if (next !== expansion) {
      expansion = next;
    }
  });

  $effect(() => {
    const path = currentPath;
    const visible = rows;
    if (!path || !listElement) return;

    const index = visible.findIndex((row) => row.path === path && !row.isDirectory);
    if (index < 0) return;

    const element = listElement.children[index] as HTMLElement | undefined;
    element?.scrollIntoView({ block: "nearest" });
  });

  function toggle(path: string) {
    expansion = { ...expansion, [path]: expansion[path] !== true };
  }
</script>

<aside class="sidebar">
  <div class="sidebar-header">
    <span class="sidebar-title">Files</span>
    <button class="refresh" title="Refresh file list" onclick={onRefresh}>⟳</button>
  </div>

  <p class="root" title={rootPath}>{rootName}</p>

  {#if rows.length === 0}
    <p class="message">No Markdown files in this folder.</p>
  {/if}

  <ul class="tree" bind:this={listElement}>
    {#each rows as row (row.path)}
      <li>
        <button
          class="row"
          class:directory={row.isDirectory}
          class:current={!row.isDirectory && row.path === currentPath}
          style="padding-left: {0.4 + row.depth * 0.8}rem"
          title={row.path}
          aria-expanded={row.isDirectory ? row.expanded : undefined}
          aria-current={!row.isDirectory && row.path === currentPath ? "true" : undefined}
          onclick={() => (row.isDirectory ? toggle(row.path) : onSelect(row.path))}
        >
          <span class="icon" aria-hidden="true">
            {#if row.isDirectory}{row.expanded ? "▾" : "▸"}{:else}·{/if}
          </span>
          <span class="label">{row.name}</span>
        </button>
      </li>
    {/each}
  </ul>

  {#if truncated}
    <p class="message">Only the first 5,000 files are listed.</p>
  {/if}
</aside>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    flex: none;
    width: 15.5rem;
    overflow-y: auto;
    border-right: 1px solid var(--border);
    background: var(--bg-toolbar);
    font-size: 0.8125rem;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 0.75rem 0;
  }

  .sidebar-title {
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .refresh {
    padding: 0.1rem 0.4rem;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: var(--text-muted);
    font-size: 0.9375rem;
    line-height: 1.2;
    cursor: pointer;
  }

  .refresh:hover {
    background: var(--bg-hover);
    color: var(--text);
  }

  .root {
    margin: 0.15rem 0 0.5rem;
    padding: 0 0.75rem;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-weight: 600;
    color: var(--text);
  }

  .tree {
    flex: 1;
    margin: 0;
    padding: 0 0.4rem 1rem;
    list-style: none;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    width: 100%;
    padding: 0.25rem 0.4rem;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: var(--text);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .row:hover {
    background: var(--bg-hover);
  }

  .row.directory {
    color: var(--text-muted);
    font-weight: 600;
  }

  .row.current {
    background: var(--accent);
    color: var(--accent-contrast);
  }

  .icon {
    flex: none;
    width: 0.9rem;
    color: var(--text-faint);
    font-size: 0.75rem;
  }

  .row.current .icon {
    color: inherit;
  }

  .label {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .message {
    margin: 0;
    padding: 0 0.75rem 1rem;
    color: var(--text-faint);
  }
</style>
