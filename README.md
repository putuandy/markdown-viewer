# Markdown Viewer

A small, fast, local-first Markdown reader for the desktop. Open a `.md` file and read it.

No account, no server, no cloud, no telemetry.

## Status

**v0.5 — search and navigation.** Find your way around long documents.

Implemented:

- Open `.md` / `.markdown` files through the native file picker
- Open with `Cmd/Ctrl+O`, or a whole folder with `Cmd/Ctrl+Shift+O`
- Drop a `.md` file or a folder onto the window
- Sidebar file tree of Markdown documents, with nested folders, the current
  document highlighted, and the path to it expanded automatically
- The tree refreshes when the window regains focus, or from the refresh button
- GitHub flavoured Markdown: tables, task lists, strikethrough, autolinks
- Footnotes, automatic heading anchors, and working in-page links
- Find in document with `Cmd/Ctrl+F`: match count, next/previous, and matches
  highlighted without touching the document
- Sidebar with Files and Outline tabs; the outline highlights the section you
  are reading and scrolls to any heading
- Sidebar can be hidden from the toolbar
- Syntax highlighting through Shiki, loaded only when a document needs it
- System, light and dark theme; configurable content width and text size
- Local images referenced by relative paths, plus remote images
- Open links in the default browser

Not implemented yet: editing, search, file associations, recent files. Mermaid
and KaTeX are deliberately out of scope: both would add a large rendering
engine for a small gain.

### Syntax highlighting

Fenced code blocks are highlighted with Shiki using the GitHub light and dark
themes, so highlighting follows the application theme without re-rendering.

Shiki, its themes and every grammar are loaded lazily and per language, so
documents without code blocks never pay for the highlighter. Recognised
languages include bash, C, C++, C#, CSS, diff, Docker, Go, HTML, Java,
JavaScript, JSON, JSX, Kotlin, Markdown, PHP, Python, Ruby, Rust, SQL, Swift,
TOML, TSX, TypeScript, XML and YAML, plus common aliases. Unknown languages
fall back to a plain code block.

### What folder browsing skips

Only `.md` and `.markdown` files are listed. Hidden files and folders (starting
with `.`), plus `node_modules`, `target`, `dist`, `build`, `out`, `venv` and
`__pycache__`, are ignored, and symlinked folders are not followed. A folder
with more than 5,000 documents is truncated with a notice.

### Security

Markdown is treated as untrusted input:

- Raw HTML is escaped rather than rendered
- `javascript:`, `vbscript:`, `file:` and `data:text/html` destinations are
  rejected for links and images, including obfuscated spellings
- Event handler and `style` attributes are dropped from every token
- A sanitising pass runs after all other rendering rules, so plugin output is
  covered too, and it neutralises raw HTML even if HTML rendering were enabled

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Cmd/Ctrl+O` | Open a Markdown file |
| `Cmd/Ctrl+Shift+O` | Open a folder |
| `Cmd/Ctrl+F` | Find in the document |
| `Enter` / `Shift+Enter` | Next / previous match |
| `Escape` | Close the find bar or toolbar menu |

## Settings

Theme, content width, text size and sidebar visibility are remembered locally in
the application's webview storage. Nothing leaves the machine.

## Requirements

- [Node.js](https://nodejs.org) 22.18 or newer
- [Rust](https://rustup.rs) stable
- Platform toolchain for Tauri 2: Xcode Command Line Tools (macOS),
  WebView2 + MSVC (Windows), `webkit2gtk` + `libayatana-appindicator` (Linux)

## Development

```sh
npm install
npm run tauri dev
```

## Build

```sh
npm run tauri build
```

Installers and application bundles are written to `src-tauri/target/release/bundle/`.

On macOS, DMG packaging drives Finder through AppleScript. If it fails with an
`AppleEvent timed out (-1712)` error, allow your terminal to control Finder under
System Settings → Privacy & Security → Automation, or build the app bundle only:

```sh
npm run tauri build -- --bundles app
```

## Checks

```sh
npm run check   # Svelte + TypeScript
npm test        # Markdown, settings and folder logic tests
cd src-tauri && cargo test && cargo clippy --all-targets -- -D warnings
```

## Architecture

```text
Svelte UI  ──Tauri IPC──  Rust (thin: file reading, folder scanning, native dialogs, opener)
```

- `src/lib/markdown.ts` — markdown-it configuration, anchors, task lists, sanitising
- `src/lib/highlight.ts` — lazy Shiki syntax highlighting
- `src/lib/search.ts` — finding text in the rendered document
- `src/lib/filesystem.ts` — Tauri IPC calls for reading files and folders
- `src/lib/tree.ts` — builds and flattens the sidebar file tree
- `src/lib/images.ts` — loads images that live next to the document
- `src/lib/settings.ts` — theme, layout and text-size preferences
- `src/components/Toolbar.svelte` — open, theme and reading options
- `src/components/FileExplorer.svelte` — folder tree sidebar
- `src/components/Outline.svelte` — heading outline with scroll tracking
- `src/components/SearchBar.svelte` — find bar
- `src/components/DocumentView.svelte` — rendered document and link handling
- `src-tauri/src/commands/file.rs` — reading documents and images from disk
- `src-tauri/src/commands/folder.rs` — scanning folders for Markdown documents

## License

MIT
