use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

/// How many documents the recent list remembers.
pub const MAX_RECENT: usize = 10;

#[derive(Default, Deserialize, Serialize)]
struct RecentStore {
    files: Vec<String>,
}

/// Moves a path to the top of the list, dropping duplicates and files that no
/// longer exist.
pub fn push(existing: &[String], path: &str) -> Vec<String> {
    let mut files: Vec<String> = existing
        .iter()
        .filter(|candidate| candidate.as_str() != path && Path::new(candidate).is_file())
        .cloned()
        .collect();

    files.insert(0, path.to_string());
    files.truncate(MAX_RECENT);

    files
}

/// Drops entries whose files have since disappeared.
pub fn prune(files: Vec<String>) -> Vec<String> {
    files
        .into_iter()
        .filter(|path| Path::new(path).is_file())
        .take(MAX_RECENT)
        .collect()
}

pub fn load(path: &Path) -> Vec<String> {
    let Ok(text) = std::fs::read_to_string(path) else {
        return Vec::new();
    };

    serde_json::from_str::<RecentStore>(&text)
        .map(|store| prune(store.files))
        .unwrap_or_default()
}

pub fn save(path: &Path, files: &[String]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| format!("Could not create {parent:?}: {error}"))?;
    }

    let store = RecentStore {
        files: files.to_vec(),
    };

    let json = serde_json::to_string_pretty(&store)
        .map_err(|error| format!("Could not encode recent files: {error}"))?;

    std::fs::write(path, json).map_err(|error| format!("Could not save {path:?}: {error}"))
}

/// The first argument that names an existing file, so that opening a document
/// from the shell or a file manager works.
pub fn path_from_args<I: IntoIterator<Item = String>>(args: I) -> Option<PathBuf> {
    args.into_iter().find_map(|argument| {
        if argument.starts_with('-') {
            return None;
        }

        let candidate = PathBuf::from(argument);
        candidate.is_file().then_some(candidate)
    })
}

#[cfg(test)]
mod tests {
    use super::{load, path_from_args, prune, push, save, MAX_RECENT};
    use std::fs;
    use std::path::{Path, PathBuf};

    fn sandbox(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("markdown-viewer-recent-{name}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn document(root: &Path, name: &str) -> String {
        let path = root.join(name);
        fs::write(&path, "# doc\n").unwrap();
        path.to_string_lossy().into_owned()
    }

    #[test]
    fn keeps_the_newest_first() {
        let root = sandbox("order");
        let first = document(&root, "first.md");
        let second = document(&root, "second.md");

        let files = push(&[], &first);
        let files = push(&files, &second);

        assert_eq!(files, vec![second, first]);
    }

    #[test]
    fn moves_an_existing_entry_to_the_top() {
        let root = sandbox("dedupe");
        let first = document(&root, "first.md");
        let second = document(&root, "second.md");

        let files = push(&[second.clone(), first.clone()], &first);

        assert_eq!(files, vec![first, second]);
    }

    #[test]
    fn drops_missing_files_and_caps_the_list() {
        let root = sandbox("prune");
        let existing = document(&root, "existing.md");

        let mut files = push(&[], &existing);
        for index in 0..(MAX_RECENT + 5) {
            files = push(&files, &document(&root, &format!("doc-{index}.md")));
        }

        assert_eq!(files.len(), MAX_RECENT);
        assert!(files.iter().all(|path| Path::new(path).is_file()));

        let pruned = prune(vec!["/nowhere/missing.md".to_string(), existing.clone()]);

        assert_eq!(pruned, vec![existing]);
    }

    #[test]
    fn round_trips_through_disk() {
        let root = sandbox("disk");
        let path = root.join("recent-files.json");
        let document_path = document(&root, "doc.md");

        assert!(load(&path).is_empty());

        save(&path, std::slice::from_ref(&document_path)).unwrap();

        assert_eq!(load(&path), vec![document_path]);
    }

    #[test]
    fn survives_a_corrupt_store() {
        let root = sandbox("corrupt");
        let path = root.join("recent-files.json");
        fs::write(&path, "not json").unwrap();

        assert!(load(&path).is_empty());
    }

    #[test]
    fn reads_a_document_from_the_command_line() {
        let root = sandbox("args");
        let document_path = document(&root, "doc.md");

        assert_eq!(
            path_from_args(vec![
                "markdown-viewer".to_string(),
                "--flag".to_string(),
                document_path.clone(),
            ]),
            Some(PathBuf::from(document_path))
        );

        assert_eq!(path_from_args(vec!["markdown-viewer".to_string()]), None);
    }
}
