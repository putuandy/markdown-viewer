use std::fs;
use std::path::Path;

/// Folders that never hold documents worth browsing in a Markdown reader.
const IGNORED_DIRECTORIES: [&str; 7] = [
    "node_modules",
    "target",
    "dist",
    "build",
    "out",
    "venv",
    "__pycache__",
];

/// Ceiling on how many documents one folder scan returns, so that browsing a
/// huge tree cannot exhaust memory or block the interface.
const MAX_FILES: usize = 5000;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderListing {
    /// Document paths relative to the scanned folder, `/` separated.
    pub files: Vec<String>,
    pub truncated: bool,
}

#[tauri::command(async)]
pub fn list_markdown_files(root: String) -> Result<FolderListing, String> {
    scan_folder(&root)
}

fn scan_folder(root: &str) -> Result<FolderListing, String> {
    let root_path = Path::new(root);

    if !root_path.is_dir() {
        return Err(format!("{root} is not a folder"));
    }

    let canonical = root_path
        .canonicalize()
        .map_err(|error| format!("Could not open {root}: {error}"))?;

    let mut files = Vec::new();
    let mut truncated = false;

    collect_documents(&canonical, &canonical, &mut files, &mut truncated);
    files.sort();

    Ok(FolderListing { files, truncated })
}

/// Reports whether a dropped or selected path is a folder or a document.
#[tauri::command]
pub fn path_kind(path: String) -> Result<String, String> {
    let metadata =
        fs::metadata(&path).map_err(|error| format!("Could not open {path}: {error}"))?;

    Ok(if metadata.is_dir() {
        "directory"
    } else if has_markdown_extension(&path) {
        "markdown"
    } else {
        "other"
    }
    .to_string())
}

fn collect_documents(root: &Path, folder: &Path, files: &mut Vec<String>, truncated: &mut bool) {
    if files.len() >= MAX_FILES {
        *truncated = true;
        return;
    }

    let Ok(entries) = fs::read_dir(folder) else {
        // Unreadable folders are skipped rather than failing the whole scan.
        return;
    };

    for entry in entries.flatten() {
        if files.len() >= MAX_FILES {
            *truncated = true;
            return;
        }

        let path = entry.path();
        let Some(name) = path.file_name().and_then(|value| value.to_str()) else {
            continue;
        };

        if name.starts_with('.') {
            continue;
        }

        // `file_type` does not follow symlinks, which also prevents cycles.
        let Ok(file_type) = entry.file_type() else {
            continue;
        };

        if file_type.is_dir() {
            if IGNORED_DIRECTORIES.contains(&name) {
                continue;
            }

            collect_documents(root, &path, files, truncated);
        } else if file_type.is_file() && has_markdown_extension(name) {
            if let Ok(relative) = path.strip_prefix(root) {
                files.push(relative.to_string_lossy().replace('\\', "/"));
            }
        }
    }
}

fn has_markdown_extension(name: &str) -> bool {
    Path::new(name)
        .extension()
        .and_then(|value| value.to_str())
        .is_some_and(|extension| {
            extension.eq_ignore_ascii_case("md") || extension.eq_ignore_ascii_case("markdown")
        })
}

#[cfg(test)]
mod tests {
    use super::{path_kind, scan_folder, MAX_FILES};
    use std::fs;
    use std::path::{Path, PathBuf};

    fn sandbox(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("markdown-viewer-folder-{name}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn write(root: &Path, relative: &str) {
        let path = root.join(relative);
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(path, "# doc\n").unwrap();
    }

    #[test]
    fn lists_nested_documents() {
        let root = sandbox("nested");
        write(&root, "README.md");
        write(&root, "docs/install.markdown");
        write(&root, "docs/guide/usage.MD");
        write(&root, "notes.txt");

        let listing = scan_folder(&root.to_string_lossy()).unwrap();

        assert_eq!(
            listing.files,
            vec!["README.md", "docs/guide/usage.MD", "docs/install.markdown"]
        );
        assert!(!listing.truncated);
    }

    #[test]
    fn skips_hidden_and_ignored_folders() {
        let root = sandbox("ignored");
        write(&root, "keep.md");
        write(&root, ".hidden/secret.md");
        write(&root, "node_modules/pkg/readme.md");
        write(&root, "target/debug/doc.md");

        let listing = scan_folder(&root.to_string_lossy()).unwrap();

        assert_eq!(listing.files, vec!["keep.md"]);
    }

    #[test]
    fn reports_a_missing_folder() {
        let error = scan_folder(&sandbox("missing").join("nope").to_string_lossy());

        assert!(error.is_err());
    }

    #[test]
    fn truncates_very_large_folders() {
        let root = sandbox("huge");

        for index in 0..(MAX_FILES + 25) {
            fs::write(root.join(format!("doc-{index}.md")), "# doc\n").unwrap();
        }

        let listing = scan_folder(&root.to_string_lossy()).unwrap();

        assert_eq!(listing.files.len(), MAX_FILES);
        assert!(listing.truncated);

        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn describes_paths() {
        let root = sandbox("kinds");
        write(&root, "document.md");
        fs::write(root.join("plain.txt"), "text").unwrap();

        let kind = |path: PathBuf| path_kind(path.to_string_lossy().into_owned());

        assert_eq!(kind(root.clone()).unwrap(), "directory");
        assert_eq!(kind(root.join("document.md")).unwrap(), "markdown");
        assert_eq!(kind(root.join("plain.txt")).unwrap(), "other");
        assert!(kind(root.join("missing.md")).is_err());
    }
}
