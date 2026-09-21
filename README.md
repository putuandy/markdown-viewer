# Markdown Viewer

A small, fast, local-first Markdown reader for the desktop. Open a `.md` file and read it.

No account, no server, no cloud, no telemetry.

## Status

**v0.3 — folder navigation.** Read a single document, or browse a project.

Implemented:

- Open `.md` / `.markdown` files through the native file picker
- Open with `Cmd/Ctrl+O`, or a whole folder with `Cmd/Ctrl+Shift+O`
- Drop a `.md` file or a folder onto the window
- Sidebar file tree of Markdown documents, with nested folders, the current
  document highlighted, and the path to it expanded automatically
- The tree refreshes when the window regains focus, or from the refresh button
- Render headings, paragraphs, emphasis, strong, links, images, blockquotes,
  ordered/unordered lists, code blocks, inline code, horizontal rules and tables
- System, light and dark theme
- Configurable content width and text size (from the toolbar)
- Local images referenced by relative paths, plus remote images
- Open links in the default browser

Not implemented yet: editing, search, syntax highlighting, footnotes, file
associations, recent files.

### What folder browsing skips

Only `.md` and `.markdown` files are listed. Hidden files and folders (starting
with `.`), plus `node_modules`, `target`, `dist`, `build`, `out`, `venv` and
`__pycache__`, are ignored, and symlinked folders are not followed. A folder
with more than 5,000 documents is truncated with a notice.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Cmd/Ctrl+O` | Open a Markdown file |
| `Cmd/Ctrl+Shift+O` | Open a folder |
| `Escape` | Close the toolbar menu |

## Settings

Theme, content width and text size are remembered locally in the application's
webview storage. Nothing leaves the machine.

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
npm test        # Markdown rendering smoke test
cd src-tauri && cargo test && cargo clippy --all-targets -- -D warnings
```

## Architecture

```text
Svelte UI  ──Tauri IPC──  Rust (thin: file reading, native dialogs, opener)
```

- `src/lib/markdown.ts` — markdown-it configuration and rendering
- `src/lib/filesystem.ts` — Tauri IPC calls for reading files and folders
- `src/lib/tree.ts` — builds and flattens the sidebar file tree
- `src/lib/images.ts` — loads images that live next to the document
- `src/lib/settings.ts` — theme, layout and text-size preferences
- `src/components/Toolbar.svelte` — open, theme and reading options
- `src/components/FileExplorer.svelte` — folder tree sidebar
- `src/components/DocumentView.svelte` — rendered document and link handling
- `src-tauri/src/commands/file.rs` — reading documents and images from disk
- `src-tauri/src/commands/folder.rs` — scanning folders for Markdown documents

Markdown is treated as untrusted input: raw HTML in Markdown is escaped, not
rendered, and `javascript:` links are rejected by markdown-it.

## License

MIT
