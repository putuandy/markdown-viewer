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
  let focusedPath = $state<string | null>(null);
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

    // Only follow the document when the tree is not being navigated by hand.
    if (focusedPath !== null && focusedPath !== path) return;

    elementAt(index)?.scrollIntoView({ block: "nearest" });
  });

  function elementAt(index: number): HTMLButtonElement | undefined {
    const item = listElement?.children[index] as HTMLElement | undefined;
    return item?.querySelector("button") ?? undefined;
  }

  function focusRow(index: number) {
    const row = rows[index];
    if (!row) return;

    focusedPath = row.path;
    elementAt(index)?.focus();
  }

  function indexOfFocused(): number {
    const index = rows.findIndex((row) => row.path === focusedPath);
    return index < 0 ? 0 : index;
  }

  function toggle(path: string) {
    expansion = { ...expansion, [path]: expansion[path] !== true };
  }

  function handleKeydown(event: KeyboardEvent) {
    const index = indexOfFocused();
    const row = rows[index];
    if (!row) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusRow(Math.min(index + 1, rows.length - 1));
        break;

      case "ArrowUp":
        event.preventDefault();
        focusRow(Math.max(index - 1, 0));
        break;

      case "Home":
        event.preventDefault();
        focusRow(0);
        break;

      case "End":
        event.preventDefault();
        focusRow(rows.length - 1);
        break;

      case "ArrowRight":
        if (!row.isDirectory) return;
        event.preventDefault();

        if (!row.expanded) {
          toggle(row.path);
        } else {
          const child = rows[index + 1];
          if (child && child.depth > row.depth) focusRow(index + 1);
        }
        break;

      case "ArrowLeft": {
        if (row.isDirectory && row.expanded) {
          event.preventDefault();
          toggle(row.path);
          break;
        }

        const parentDepth = row.depth - 1;
        if (parentDepth < 0) break;

        event.preventDefault();

        for (let candidate = index - 1; candidate >= 0; candidate -= 1) {
          if (rows[candidate].depth === parentDepth) {
            focusRow(candidate);
            break;
          }
        }
        break;
      }

      default:
        break;
    }
  }
</script>

<div class="explorer">
  <div class="explorer-header">
    <span class="root" title={rootPath}>{rootName}</span>
    <button class="refresh" title="Refresh file list" onclick={onRefresh}>⟳</button>
  </div>

  {#if rows.length === 0}
    <p class="message">No Markdown files in this folder.</p>
  {/if}

  <ul class="tree" role="tree" aria-label="Markdown files" bind:this={listElement} onkeydown={handleKeydown}>
    {#each rows as row, index (row.path)}
      <li role="none">
        <button
          class="row"
          class:directory={row.isDirectory}
          class:current={!row.isDirectory && row.path === currentPath}
          style="padding-left: {0.4 + row.depth * 0.8}rem"
          title={row.path}
          role="treeitem"
          aria-level={row.depth + 1}
          aria-expanded={row.isDirectory ? row.expanded : undefined}
          aria-selected={!row.isDirectory && row.path === currentPath ? "true" : undefined}
          tabindex={focusedPath === null ? (index === 0 ? 0 : -1) : row.path === focusedPath ? 0 : -1}
          onclick={() => {
            focusedPath = row.path;
            if (row.isDirectory) toggle(row.path);
            else onSelect(row.path);
          }}
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
</div>

<style>
  .explorer {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  .explorer-header {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 0.5rem 0.4rem 0.75rem;
  }

  .root {
    flex: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-weight: 600;
    color: var(--text);
  }

  .refresh {
    flex: none;
    padding: 0.1rem 0.4rem;
    border: none;
    border-radius: var(--radius-control);
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

  .tree {
    flex: 1;
    margin: 0;
    padding: 0 0.4rem 1rem;
    overflow-y: auto;
    list-style: none;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    width: 100%;
    padding: 0.25rem 0.4rem;
    border: none;
    border-radius: var(--radius-control);
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

  .row.current:focus-visible {
    outline-color: var(--text);
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
