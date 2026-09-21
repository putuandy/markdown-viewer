<script lang="ts">
  import { onDestroy } from "svelte";
  import {
    clearHighlights,
    findRanges,
    scrollToRange,
    showHighlights,
  } from "../lib/search";

  let {
    root,
    revision = "",
    onClose,
  }: {
    root?: HTMLElement;
    revision?: string;
    onClose: () => void;
  } = $props();

  let query = $state("");
  let ranges = $state<Range[]>([]);
  let current = $state(0);
  let input: HTMLInputElement | undefined;

  const count = $derived(ranges.length);

  $effect(() => {
    input?.focus();
    input?.select();
  });

  $effect(() => {
    const element = root;
    const text = query;
    void revision;

    ranges = element ? findRanges(element, text) : [];
    current = 0;
  });

  $effect(() => {
    const found = ranges;
    const index = current;
    const text = query;

    if (!text.trim() || found.length === 0) {
      clearHighlights();
      return;
    }

    showHighlights(found, index);

    const active = found[index];
    if (active) scrollToRange(active);
  });

  onDestroy(clearHighlights);

  function step(delta: number) {
    if (ranges.length < 2) return;

    current = (current + delta + ranges.length) % ranges.length;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      step(event.shiftKey ? -1 : 1);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }
</script>

<div class="search-bar" role="search">
  <input
    bind:this={input}
    bind:value={query}
    class="input"
    type="search"
    placeholder="Find in document"
    aria-label="Find in document"
    spellcheck="false"
    autocomplete="off"
    onkeydown={handleKeydown}
  />

  <span class="count" aria-live="polite" aria-atomic="true">
    {#if !query.trim()}
      {count} {count === 1 ? "match" : "matches"}
    {:else if count === 0}
      No results
    {:else}
      {current + 1} of {count}
    {/if}
  </span>

  <button class="icon" title="Previous match" onclick={() => step(-1)} disabled={count === 0}>
    ↑
  </button>
  <button class="icon" title="Next match" onclick={() => step(1)} disabled={count === 0}>
    ↓
  </button>
  <button class="icon" title="Close find bar" onclick={onClose}>✕</button>
</div>

<style>
  .search-bar {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-left: auto;
    padding: 0.4rem 0.6rem;
    width: fit-content;
    border: 1px solid var(--border);
    border-top: none;
    border-radius: 0 0 8px 8px;
    background: var(--bg-popover);
    color: var(--text);
    box-shadow: var(--shadow-popover);
    font-size: 0.8125rem;
  }

  .input {
    width: 12rem;
    padding: 0.25rem 0.45rem;
    border: 1px solid var(--border-strong);
    border-radius: 6px;
    background: var(--bg);
    color: var(--text);
    font: inherit;
  }

  .count {
    min-width: 6.5rem;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .icon {
    padding: 0.2rem 0.45rem;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: var(--text);
    font: inherit;
    cursor: pointer;
  }

  .icon:hover:not(:disabled) {
    background: var(--bg-hover);
  }

  .icon:disabled {
    color: var(--text-faint);
    cursor: default;
  }
</style>
