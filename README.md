# Markdown Viewer

A small, fast, local-first Markdown reader for the desktop. Open a `.md` file and read it.

No account, no server, no cloud, no telemetry.

## Status

**v1.0 — stable.** The feature set is complete and stable enough to rely on as
a daily Markdown reader.

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
- File associations for `.md` and `.markdown`, so the app can be chosen as the
  default viewer for Markdown documents
- Opens documents handed to it by the system: double-click, "Open With", a
  path on the command line, or the Dock
- Recent documents: remembered between launches, listed on the empty screen and
  in File → Open Recent
- Native application menu with keyboard shortcuts
- Window size and position are remembered
- About panel from the Help menu
- Folder watching: the file tree follows documents appearing, changing and
  disappearing on disk, debounced and filtered to Markdown files
- The window title follows the document you are reading
- Errors appear as a dismissible notice instead of a bare line of text
- Reading progress: the sidebar tracks the section you are in
- Syntax highlighting through Shiki, loaded only when a document needs it
- System, light and dark theme; configurable content width and text size
- Local images referenced by relative paths, plus remote images
- Open links in the default browser

Editing, note-taking, cloud sync and AI features are explicitly out of scope.
Mermaid and KaTeX are not supported: both would add a large rendering engine for
a small gain.

### Syntax highlighting

Fenced code blocks are highlighted with Shiki using the GitHub light and dark
themes, so highlighting follows the application theme without re-rendering.

Shiki, its themes and every grammar are loaded lazily and per language, so
documents without code blocks never pay for the highlighter. Recognised
languages include bash, C, C++, C#, CSS, diff, Docker, Go, HTML, Java,
JavaScript, JSON, JSX, Kotlin, Markdown, PHP, Python, Ruby, Rust, SQL, Swift,
TOML, TSX, TypeScript, XML and YAML, plus common aliases. Unknown languages
fall back to a plain code block.

### Performance

Measured on an Apple Silicon Mac with `npm run measure` and the release build.
Treat these as observations, not guarantees.

| | |
| --- | --- |
| Launch to a ready window | 0.8–1.1 s |
| Idle memory, whole application | ~50 MB (34–38 MB process, ~12 MB WebKit helpers) |
| 100 KB document, render | ~30 ms |
| 1 MB document, render | ~105 ms |
| 5 MB document, render | ~590 ms |
| Sanitising a 1 MB document | ~3 ms |
| First highlight of a code block (grammar load) | ~13 ms |
| Folder scan, 2,000 documents | ~13 ms |
| Frontend bundle (gzipped) | ~80 kB |
| Application bundle | 4.5 MB |

Documents are parsed once, off the first paint, and syntax highlighting loads per
language on demand. Nothing is parsed, scanned or highlighted until it is needed.

### Known limitations

- Nesting deeper than 100 levels stops the parse: markdown-it drops whatever
  follows rather than recursing without bound. Normal documents are unaffected.
- Search matches text inside a single text node, so a match spanning formatting
  (for example `**bold**plain`) is not found as one match.
- Mermaid, KaTeX and other diagram engines are deliberately not supported.
- Very large documents cost real memory: a synthetic 10 MB document rendered in
  about 950 ms and used roughly 580 MB of JavaScript heap in Node. Typical
  documentation is a few hundred kilobytes.
- Windows and Linux are built from the same sources but have not been exercised
  on those platforms yet.

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

## Accessibility

- Full keyboard navigation: in the file tree, `↑`/`↓` move, `→` expands,
  `←` collapses, `Home`/`End` jump; the outline uses the same pattern
- Tree and outline expose the ARIA tree roles, levels and expansion state
- Visible focus rings on every control, and `prefers-reduced-motion` disables
  transitions and smooth scrolling
- The reading area reports `aria-busy` while a document is loading or rendering,
  and the find bar announces its match count
- The browser context menu is suppressed, so the window does not expose
  web-page affordances

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Cmd/Ctrl+O` | Open a Markdown file |
| `Cmd/Ctrl+Shift+O` | Open a folder |
| `Cmd/Ctrl+F` | Find in the document |
| `Cmd/Ctrl+B` | Show or hide the sidebar |
| `Enter` / `Shift+Enter` | Next / previous match |
| `Escape` | Close the find bar or toolbar menu |

## Settings

Theme, content width, text size and sidebar visibility are remembered locally in
the application's webview storage. Recent documents live in the platform
configuration folder (`recent-files.json`); they are pruned as files disappear.
Nothing leaves the machine.

## Requirements

- [Node.js](https://nodejs.org) 22.18 or newer
- [Rust](https://rustup.rs) stable
- Platform toolchain for Tauri 2: Xcode Command Line Tools (macOS),
  WebView2 + MSVC (Windows), `webkit2gtk` + `libayatana-appindicator` (Linux)

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — layers, IPC surface, security model
- [Contributing](CONTRIBUTING.md)
- [Third-party notices](THIRD-PARTY-NOTICES.md)
- [Changelog](CHANGELOG.md)

## Install

Prebuilt macOS disk images and app bundles are attached to the
[latest release](https://github.com/putuandy/markdown-viewer/releases/latest) —
Apple silicon and Intel. Windows and Linux are not published yet, so build from
source there:

```sh
git clone https://github.com/putuandy/markdown-viewer.git
cd markdown-viewer
npm install
npm run tauri build
```

On macOS, open the disk image and drag **Markdown Viewer** onto the
**Applications** shortcut, or drag the built `Markdown Viewer.app` from
`src-tauri/target/release/bundle/macos/`. The bundles are ad-hoc signed rather
than notarised, so the first launch needs right-click → **Open**.

Once installed, `.md` and `.markdown` files can be associated with it from
Finder's *Open With → Other → Always Open With*.

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
npm test        # Markdown, settings, folder, search and stress tests
npm run measure # Render, highlight, search and sanitise timings
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
- `src-tauri/src/commands/recent.rs` — recent documents IPC
- `src-tauri/src/recent.rs` — recent document storage
- `src-tauri/src/menu.rs` — native application menu
- `src-tauri/src/watcher.rs` — debounced folder watching

## License

MIT — see [LICENSE](LICENSE). Copyright (c) 2026 putuandy.

Release builds bundle third-party software; the licences and copyright notices
are reproduced in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md), which
`npm run notices` regenerates.
