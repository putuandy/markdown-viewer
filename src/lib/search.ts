const MATCH_HIGHLIGHT = "markdown-viewer-match";
const CURRENT_HIGHLIGHT = "markdown-viewer-current";

/** Upper bound on matches per document, so a huge document cannot lock the UI. */
const MAX_MATCHES = 2000;

/** Case-insensitive, non-overlapping offsets of `query` inside `text`. */
export function findMatchIndices(text: string, query: string): Array<[number, number]> {
  const matches: Array<[number, number]> = [];
  const needle = query.toLowerCase();

  if (!needle) return matches;

  const haystack = text.toLowerCase();
  let index = haystack.indexOf(needle);

  while (index >= 0 && matches.length < MAX_MATCHES) {
    matches.push([index, index + needle.length]);
    index = haystack.indexOf(needle, index + needle.length);
  }

  return matches;
}

export function supportsHighlights(): boolean {
  return (
    typeof CSS !== "undefined" &&
    "highlights" in CSS &&
    typeof Highlight !== "undefined"
  );
}

/** Every match of `query` in the visible text below `root`. */
export function findRanges(root: HTMLElement, query: string): Range[] {
  if (!query.trim()) return [];

  const ranges: Range[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = (node as Text).parentElement;
      if (!parent || parent.closest("script, style, title")) {
        return NodeFilter.FILTER_REJECT;
      }
      return node.nodeValue ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  let node = walker.nextNode();

  while (node) {
    for (const [start, end] of findMatchIndices(node.nodeValue ?? "", query)) {
      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, end);
      ranges.push(range);

      if (ranges.length >= MAX_MATCHES) return ranges;
    }

    node = walker.nextNode();
  }

  return ranges;
}

/**
 * Paints every match, with the current one standing out. Uses the CSS Custom
 * Highlight API, so the document itself is never modified.
 */
export function showHighlights(ranges: Range[], current: number): void {
  if (!supportsHighlights()) return;

  CSS.highlights.set(MATCH_HIGHLIGHT, new Highlight(...ranges));

  const active = ranges[current];
  if (active) {
    CSS.highlights.set(CURRENT_HIGHLIGHT, new Highlight(active));
  } else {
    CSS.highlights.delete(CURRENT_HIGHLIGHT);
  }
}

export function clearHighlights(): void {
  if (!supportsHighlights()) return;

  CSS.highlights.delete(MATCH_HIGHLIGHT);
  CSS.highlights.delete(CURRENT_HIGHLIGHT);
}

export function scrollToRange(range: Range): void {
  const container = range.startContainer;
  const element =
    container instanceof Element ? container : container.parentElement;

  element?.scrollIntoView({ block: "center" });
}
