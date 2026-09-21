# Markdown Viewer

A small, fast, local-first Markdown reader for the desktop. Open a `.md` file and read it.

No account, no server, no cloud, no telemetry.

## Status

**v0.1 — MVP.** Open and render a single Markdown file.

Implemented:

- Open `.md` / `.markdown` files through the native file picker
- Open with `Cmd/Ctrl+O`
- Drop a `.md` file onto the window
- Render headings, paragraphs, emphasis, strong, links, images, blockquotes,
  ordered/unordered lists, code blocks, inline code, horizontal rules and tables
- Open links in the default browser
- Open another file at any time

Not implemented yet: editing, themes, folder navigation, search, syntax
highlighting, file associations, recent files.

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
- `src/lib/filesystem.ts` — Tauri IPC calls for reading files
- `src/components/DocumentView.svelte` — rendered document and link handling
- `src-tauri/src/lib.rs` — `read_markdown_file` command and application setup

Markdown is treated as untrusted input: raw HTML in Markdown is escaped, not
rendered, and `javascript:` links are rejected by markdown-it.

## License

MIT
