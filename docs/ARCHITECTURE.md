# Architecture

## Layers

```text
┌───────────────────────────────────────────────┐
│                  Svelte UI                    │
│                                               │
│  Toolbar    FileExplorer / Outline   Find bar │
│            DocumentView (rendered HTML)       │
└───────────────────────┬───────────────────────┘
                        │  Tauri IPC (JSON, raw bytes, events)
┌───────────────────────▼───────────────────────┐
│                 Rust / Tauri                  │
│                                               │
│  commands/file.rs    reading documents/images │
│  commands/folder.rs  scanning folders         │
│  commands/recent.rs  recent document store    │
│  watcher.rs          debounced folder watching│
│  menu.rs             native application menu  │
└───────────────────────┬───────────────────────┘
                        │
                        ▼
                  Local filesystem
```

The Rust layer stays thin on purpose: it reads what the interface asks for,
watches a folder, and owns the native surfaces. All Markdown knowledge lives in
the frontend.

## IPC surface

| Command | Purpose |
| --- | --- |
| `read_markdown_file` | Read a document, replacing invalid UTF-8 instead of failing |
| `read_image_file` | Read an image relative to its document (32 MB cap, image extensions only) |
| `list_markdown_files` | Scan a folder for documents (5,000 cap, ignores hidden and build folders) |
| `path_kind` | Classify a dropped path as folder, document or other |
| `recent_files` / `add_recent_file` / `clear_recent_files` | Recent documents |
| `take_pending_open` | A document handed over by the system before the interface was ready |
| `watch_folder` | Watch a folder for document changes |

Events: `open-path` (a document arrived from outside), `menu-action` (a menu
item was chosen), `folder-changed` (a watched folder changed).

## Data flow

1. A document arrives from the file picker, the file tree, a drop, a menu item
   or the system. It is read through `read_markdown_file`.
2. `renderDocument()` parses it once and returns both the HTML and the outline.
   Rendering waits a frame so a slow document shows its loading state first.
3. `DocumentView` inserts the HTML, then two effects run in the browser:
   local images are fetched through `read_image_file` and turned into blob URLs,
   and code blocks are upgraded by Shiki, one language at a time.
4. Theme, width, text size and sidebar visibility are React state persisted in
   the webview's local storage; recent documents live in the platform config
   folder so the native menu can list them.

## Security model

Markdown is untrusted input. The guarantees, in order:

1. `markdown-it` runs with `html: false`, so raw HTML in a document is escaped.
2. A sanitising core rule runs **last**, after every plugin, and:
   - turns `html_block`/`html_inline` tokens into escaped text, so a future
     change that enables HTML still cannot inject,
   - drops `on*`, `style`, `srcdoc` and `srcset` attributes,
   - restricts `href`, `src` and friends to an allow-list: relative paths,
   fragments, `http(s)`, `mailto`, `tel`, `blob`, and `data:image/*;base64` for
     images only. Obfuscated spellings (`JaVaScRiPt:`, embedded whitespace and
     control characters) are normalised before the check.
3. Link clicks are intercepted: fragments scroll, `http(s)`/`mailto`/`tel` go to
   the system handler through the opener plugin, everything else is ignored.
4. Image bytes never reach the webview as filesystem URLs; they are read through
   a command that resolves paths against the document folder, refuses anything
   that is not an image, and caps the size.
5. The webview runs with a Content Security Policy that allows only same-origin
   scripts, styles and assets, plus image data/blob/remote sources.
6. The asset protocol is not enabled, and the capability file grants only
   `core:default`, `core:window:allow-set-title`, `dialog:allow-open` and
   `opener:default`.
