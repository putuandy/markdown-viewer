# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims
at [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-22

First stable release. No functional changes since 0.9.0: the feature set is
frozen and documented.

### The feature set

- Open Markdown documents and folders, from the picker, the keyboard, a drop,
  the command line or the file manager
- GitHub flavoured Markdown, footnotes, heading anchors, task lists, tables
- Syntax highlighting for 26 languages, loaded on demand, following the theme
- System, light and dark theme; configurable content width and text size
- Find in document, document outline, folder tree
- Recent documents, file associations, native menu, remembered window geometry
- Markdown treated as untrusted input throughout

### Release artifacts

macOS disk images and app bundles for Apple silicon and Intel are attached to
the [1.0.0 release](https://github.com/putuandy/markdown-viewer/releases/tag/v1.0.0),
along with a `SHA256SUMS` file. Windows and Linux installers are not published
yet; the release workflow that builds them needs `workflow` token scope before
it can be pushed.

## [0.9.0] - 2026-09-22

Release candidate. Feature freeze: no new functionality, hardening and
documentation only.

### Added

- LICENSE, CONTRIBUTING.md, this changelog and docs/ARCHITECTURE.md

### Fixed

- Folder watching canonicalises its root, so symlinked folders (such as `/var`
  on macOS) match the paths the watcher reports

## [0.8.0] - 2026-09-22

### Added

- Keyboard navigation for the file tree and outline, with tree roles and roving
  tabindex; `Cmd/Ctrl+B` toggles the sidebar
- Window title follows the open document
- Dismissible error notices, `aria-busy` while loading or rendering, and a
  rendering indicator for slow documents

### Changed

- Focus rings, reduced-motion support, non-selectable chrome, consistent control
  sizes and transitions
- Narrow windows shrink the sidebar and hide it below 560px

## [0.7.0] - 2026-09-22

### Added

- Folder watching with a debounce, filtered to Markdown documents outside
  ignored folders
- `scripts/measure.mjs` (`npm run measure`), stress tests for pathological
  documents, and an ignored live watcher test

### Changed

- Large documents paint a loading state before the parser takes the main thread
- Render failures are reported instead of blanking the interface
- Search input is debounced
- `maxNesting` raised to 100 so unusual documents keep parsing

### Fixed

- A document that exceeded the nesting limit used to stop the whole parse; the
  behaviour is now bounded and documented

## [0.6.0] - 2026-09-22

### Added

- File associations for `.md` and `.markdown`, plus documents handed over by the
  system: Finder, "Open With", a command-line path or the Dock
- Recent documents, listed on the empty screen and in File → Open Recent
- Native application menu with accelerators
- Window size and position are remembered
- About panel

## [0.5.0] - 2026-09-22

### Added

- Find in document: match count, next/previous, highlighted without touching the
  document
- Sidebar with Files and Outline tabs; the outline tracks the section being read
- Sidebar visibility toggle, remembered with the other settings

## [0.4.0] - 2026-09-22

### Added

- GitHub flavoured Markdown: task lists, strikethrough, autolinks
- Footnotes, automatic heading anchors, working in-page links
- Syntax highlighting with Shiki, lazy per language, following the theme
- Sanitising pass: raw HTML neutralised, dangerous attributes dropped, URL
  destinations allow-listed

### Fixed

- An accidental O(n²) scan in the task list rule

## [0.3.0] - 2026-09-22

### Added

- Open a folder, with a sidebar file tree, current-document indicator,
  automatic ancestor expansion and refresh on focus
- `path_kind` so dropped paths open as files or folders
- IPC tests on a mock runtime

## [0.2.0] - 2026-09-22

### Added

- System, light and dark theme
- Configurable content width and text size, remembered between launches
- Minimal toolbar, typography pass, code/table/image styling, smooth scrolling
- Local images read relative to the document
- Settings, image classification and rendering tests

## [0.1.0] - 2026-09-22

### Added

- Open and render Markdown: file picker, `Cmd/Ctrl+O`, drag and drop
- markdown-it rendering with raw HTML escaped and unsafe links rejected
- Rust command for reading documents, plus its tests
