# Contributing

Thanks for wanting to help. This project is deliberately small: a Markdown
reader that stays fast and native-feeling. That shapes what belongs here.

## Ground rules

1. **Don't over-engineer.** Prefer the simple implementation.
2. **Don't add dependencies casually.** Ask whether the existing stack can do it.
3. **Preserve the small footprint.** Every dependency needs a reason.
4. **No scope creep.** Editing, note-taking, sync and AI features are out of scope.
5. **Test before you claim it works.**

## Getting set up

```sh
npm install
npm run tauri dev
```

Requirements are listed in the [README](README.md#requirements).

## Before opening a pull request

Run everything, from the repository root:

```sh
npm run check                 # Svelte + TypeScript
npm test                      # frontend tests
npm run build                 # frontend production build
cd src-tauri
cargo test                    # Rust tests
cargo test -- --ignored       # includes the filesystem watcher test
cargo clippy --all-targets -- -D warnings
cargo fmt --check
```

`npm run measure` prints render, highlight and search timings if your change
could affect performance.

## Commit style

Conventional commits, one logical change per commit:

```text
feat: add markdown file opening
fix: sanitize markdown links
perf: avoid re-parsing on theme change
```

## Code style

- TypeScript and Svelte 5 runes; no `any` where a real type fits
- Rust: `cargo fmt` decides, clippy must stay clean
- Comments explain *why*, not *what*
- Prefer small modules in `src/lib/` with tests in `tests/*.test.mjs`

## Where things live

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the layer diagram, the IPC
surface and the security model.

## Reporting bugs

Include:

- what you did, what you expected, what happened
- operating system and version
- whether the document came from the file picker, a folder, a drop, or the menu
- a minimal Markdown snippet when the rendering is at fault
