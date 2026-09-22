use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use notify::{Event, RecommendedWatcher, RecursiveMode, Watcher};
use tauri::{AppHandle, Emitter, Runtime, State};

use crate::commands::folder::{has_markdown_extension, is_ignored_directory};

/// Emitted when documents below the watched folder change.
pub const FOLDER_CHANGED_EVENT: &str = "folder-changed";

/// How long to wait after the last change before telling the interface, so a
/// burst of writes only triggers one refresh.
const DEBOUNCE: Duration = Duration::from_millis(400);

#[derive(Default)]
pub struct FolderWatcher(Mutex<Option<RecommendedWatcher>>);

/// True when a change to `path` can affect the file tree: it lives inside the
/// watched folder, is not inside an ignored or hidden folder, and is either a
/// Markdown document or something without an extension (a new folder, say).
pub fn path_is_relevant(path: &Path, root: &Path) -> bool {
    let Ok(relative) = path.strip_prefix(root) else {
        return false;
    };

    if relative.as_os_str().is_empty() {
        return true;
    }

    let ignored = relative
        .components()
        .any(|component| is_ignored_directory(&component.as_os_str().to_string_lossy()));

    if ignored {
        return false;
    }

    match path.extension() {
        Some(_) => has_markdown_extension(path),
        None => true,
    }
}

#[tauri::command]
pub fn watch_folder<R: Runtime>(
    app: AppHandle<R>,
    root: String,
    state: State<'_, FolderWatcher>,
) -> Result<(), String> {
    let mut watcher_slot = state
        .0
        .lock()
        .map_err(|_| "Could not lock the folder watcher".to_string())?;

    // Dropping the previous watcher stops it.
    watcher_slot.take();

    // Canonicalised, because the paths reported by the watcher are, and a
    // symlinked folder such as /var on macOS would otherwise never match.
    let root_path = PathBuf::from(&root)
        .canonicalize()
        .map_err(|error| format!("Could not watch {root}: {error}"))?;

    if !root_path.is_dir() {
        return Err(format!("{root} is not a folder"));
    }

    let pending = Arc::new(Mutex::new(false));
    let handle = app.clone();
    let watched = root_path.clone();

    let mut watcher = notify::recommended_watcher(move |result: notify::Result<Event>| {
        let Ok(event) = result else {
            return;
        };

        if !event
            .paths
            .iter()
            .any(|path| path_is_relevant(path, &watched))
        {
            return;
        }

        let Ok(mut waiting) = pending.lock() else {
            return;
        };

        if *waiting {
            return;
        }

        *waiting = true;
        drop(waiting);

        let handle = handle.clone();
        let pending = Arc::clone(&pending);

        std::thread::spawn(move || {
            std::thread::sleep(DEBOUNCE);

            if let Ok(mut waiting) = pending.lock() {
                *waiting = false;
            }

            let _ = handle.emit(FOLDER_CHANGED_EVENT, ());
        });
    })
    .map_err(|error| format!("Could not watch {root}: {error}"))?;

    watcher
        .watch(&root_path, RecursiveMode::Recursive)
        .map_err(|error| format!("Could not watch {root}: {error}"))?;

    *watcher_slot = Some(watcher);

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::path_is_relevant;
    use std::path::Path;

    #[test]
    fn reacts_to_documents_inside_the_folder() {
        let root = Path::new("/project");

        assert!(path_is_relevant(Path::new("/project/README.md"), root));
        assert!(path_is_relevant(
            Path::new("/project/docs/a.markdown"),
            root
        ));
        assert!(path_is_relevant(Path::new("/project/notes.MD"), root));
    }

    #[test]
    fn reacts_to_new_folders() {
        let root = Path::new("/project");

        assert!(path_is_relevant(Path::new("/project/docs"), root));
    }

    #[test]
    fn ignores_other_files_and_outside_changes() {
        let root = Path::new("/project");

        assert!(!path_is_relevant(Path::new("/project/image.png"), root));
        assert!(!path_is_relevant(Path::new("/elsewhere/README.md"), root));
    }

    #[test]
    #[ignore = "waits on filesystem notifications"]
    fn delivers_an_event_for_a_new_document() {
        use notify::{RecursiveMode, Watcher};
        use std::sync::mpsc;
        use std::time::Duration;

        let root = std::env::temp_dir().join("markdown-viewer-watcher-live");
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        let root = root.canonicalize().unwrap();

        let (sender, receiver) = mpsc::channel();
        let watched = root.clone();

        let mut watcher =
            notify::recommended_watcher(move |result: notify::Result<notify::Event>| {
                let Ok(event) = result else {
                    return;
                };

                if event
                    .paths
                    .iter()
                    .any(|path| super::path_is_relevant(path, &watched))
                {
                    let _ = sender.send(());
                }
            })
            .unwrap();

        watcher.watch(&root, RecursiveMode::Recursive).unwrap();

        std::fs::write(root.join("note.md"), "# hi").unwrap();

        assert!(
            receiver.recv_timeout(Duration::from_secs(10)).is_ok(),
            "expected an event for a new Markdown document"
        );

        while receiver.try_recv().is_ok() {}

        std::fs::write(root.join("image.png"), b"not a document").unwrap();

        assert!(
            receiver.recv_timeout(Duration::from_millis(700)).is_err(),
            "other files must not trigger a refresh"
        );

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn ignores_hidden_and_build_folders() {
        let root = Path::new("/project");

        assert!(!path_is_relevant(
            Path::new("/project/.git/README.md"),
            root
        ));
        assert!(!path_is_relevant(Path::new("/project/.hidden.md"), root));
        assert!(!path_is_relevant(
            Path::new("/project/node_modules/pkg/readme.md"),
            root
        ));
        assert!(!path_is_relevant(Path::new("/project/target/doc.md"), root));
    }
}
