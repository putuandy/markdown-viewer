<script lang="ts">
  import type { OutlineEntry } from "../lib/markdown";

  let {
    entries,
    root,
    onSelect,
  }: {
    entries: OutlineEntry[];
    root?: HTMLElement;
    onSelect: (id: string) => void;
  } = $props();

  let activeId = $state<string | null>(null);
  let focusedId = $state<string | null>(null);
  let listElement: HTMLUListElement | undefined;

  const minLevel = $derived(
    entries.length > 0 ? Math.min(...entries.map((entry) => entry.level)) : 1,
  );

  $effect(() => {
    const container = root;
    const outline = entries;

    if (!container || outline.length === 0) return;

    const viewport: HTMLElement = container;
    let frame = 0;

    function update() {
      frame = 0;

      const containerTop = viewport.getBoundingClientRect().top;
      let active = outline[0].id;

      for (const entry of outline) {
        const heading = document.getElementById(entry.id);
        if (!heading) continue;

        if (heading.getBoundingClientRect().top - containerTop <= 80) {
          active = entry.id;
        }
      }

      activeId = active;
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    update();
    viewport.addEventListener("scroll", schedule, { passive: true });

    return () => {
      viewport.removeEventListener("scroll", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  });

  $effect(() => {
    const id = activeId;
    const list = listElement;

    if (!id || !list) return;
    if (focusedId !== null && focusedId !== id) return;

    const index = entries.findIndex((entry) => entry.id === id);
    if (index < 0) return;

    elementAt(index)?.scrollIntoView({ block: "nearest" });
  });

  function elementAt(index: number): HTMLButtonElement | undefined {
    const item = listElement?.children[index] as HTMLElement | undefined;
    return item?.querySelector("button") ?? undefined;
  }

  function focusEntry(index: number) {
    const entry = entries[index];
    if (!entry) return;

    focusedId = entry.id;
    elementAt(index)?.focus();
  }

  function handleKeydown(event: KeyboardEvent) {
    const index = entries.findIndex((entry) => entry.id === focusedId);
    const current = index < 0 ? 0 : index;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusEntry(Math.min(current + 1, entries.length - 1));
        break;

      case "ArrowUp":
        event.preventDefault();
        focusEntry(Math.max(current - 1, 0));
        break;

      case "Home":
        event.preventDefault();
        focusEntry(0);
        break;

      case "End":
        event.preventDefault();
        focusEntry(entries.length - 1);
        break;

      default:
        break;
    }
  }
</script>

<nav class="outline" aria-label="Document outline">
  {#if entries.length === 0}
    <p class="message">No headings in this document.</p>
  {/if}

  <ul
    role="tree"
    aria-label="Headings"
    bind:this={listElement}
    onkeydown={handleKeydown}
  >
    {#each entries as entry, index (entry.id)}
      <li role="none">
        <button
          class="entry"
          class:active={entry.id === activeId}
          style="padding-left: {0.5 + (entry.level - minLevel) * 0.8}rem"
          title={entry.text}
          role="treeitem"
          aria-level={entry.level - minLevel + 1}
          aria-selected={entry.id === activeId}
          tabindex={focusedId === null ? (index === 0 ? 0 : -1) : entry.id === focusedId ? 0 : -1}
          onclick={() => {
            focusedId = entry.id;
            onSelect(entry.id);
          }}
        >
          {entry.text}
        </button>
      </li>
    {/each}
  </ul>
</nav>

<style>
  .outline {
    flex: 1;
    overflow-y: auto;
    padding: 0.35rem 0.4rem 1rem;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .entry {
    display: block;
    width: 100%;
    padding: 0.25rem 0.5rem;
    overflow: hidden;
    border: none;
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--text-muted);
    font: inherit;
    text-align: left;
    white-space: nowrap;
    text-overflow: ellipsis;
    cursor: pointer;
  }

  .entry:hover {
    background: var(--bg-hover);
    color: var(--text);
  }

  .entry.active {
    background: var(--accent);
    color: var(--accent-contrast);
    font-weight: 600;
  }

  .message {
    margin: 0;
    padding: 0 0.75rem 1rem;
    color: var(--text-faint);
  }
</style>
