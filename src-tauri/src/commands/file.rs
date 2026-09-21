use std::fs;
use std::path::{Path, PathBuf};

/// Upper bound for images loaded from disk, so that a stray large file cannot
/// exhaust memory while rendering a document.
const MAX_IMAGE_BYTES: u64 = 32 * 1024 * 1024;

const IMAGE_EXTENSIONS: [&str; 9] = [
    "avif", "bmp", "gif", "ico", "jpeg", "jpg", "png", "svg", "webp",
];

/// Reads a Markdown file from disk and returns it as text.
///
/// Invalid UTF-8 is replaced rather than rejected so that a damaged file can
/// still be read instead of blocking the user with an error.
#[tauri::command]
pub fn read_markdown_file(path: String) -> Result<String, String> {
    let bytes = fs::read(&path).map_err(|error| format!("Could not open {path}: {error}"))?;
    Ok(String::from_utf8_lossy(&bytes).into_owned())
}

/// Reads an image referenced by a document and returns its raw bytes.
///
/// Relative sources are resolved against the folder of the document that
/// references them.
#[tauri::command]
pub fn read_image_file(
    document_path: String,
    source: String,
) -> Result<tauri::ipc::Response, String> {
    load_image_bytes(&document_path, &source).map(tauri::ipc::Response::new)
}

fn load_image_bytes(document_path: &str, source: &str) -> Result<Vec<u8>, String> {
    let path = resolve_image_path(document_path, source)?;

    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    if !IMAGE_EXTENSIONS.contains(&extension.as_str()) {
        return Err(format!("{source} is not a supported image file"));
    }

    let metadata =
        fs::metadata(&path).map_err(|error| format!("Could not open {source}: {error}"))?;

    if metadata.len() > MAX_IMAGE_BYTES {
        return Err(format!("{source} is larger than 32 MB"));
    }

    fs::read(&path).map_err(|error| format!("Could not open {source}: {error}"))
}

fn resolve_image_path(document_path: &str, source: &str) -> Result<PathBuf, String> {
    let source_path = Path::new(source);

    let candidate = if source_path.is_absolute() {
        source_path.to_path_buf()
    } else {
        Path::new(document_path)
            .parent()
            .ok_or_else(|| format!("Could not locate the folder of {document_path}"))?
            .join(source_path)
    };

    candidate
        .canonicalize()
        .map_err(|error| format!("Could not open {source}: {error}"))
}

#[cfg(test)]
mod tests {
    use super::{load_image_bytes, read_markdown_file};
    use std::fs;
    use std::path::PathBuf;

    fn temp_dir() -> PathBuf {
        let dir = std::env::temp_dir().join("markdown-viewer-command-tests");
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn reads_a_markdown_file() {
        let path = temp_dir().join("valid.md");
        fs::write(&path, "# Title\n\nBody\n").unwrap();

        let contents = read_markdown_file(path.to_string_lossy().into_owned()).unwrap();

        assert_eq!(contents, "# Title\n\nBody\n");

        fs::remove_file(&path).unwrap();
    }

    #[test]
    fn reports_missing_markdown_files() {
        let error =
            read_markdown_file(temp_dir().join("missing.md").to_string_lossy().into_owned());

        assert!(error.is_err());
    }

    #[test]
    fn replaces_invalid_utf8_instead_of_failing() {
        let path = temp_dir().join("invalid.md");
        fs::write(&path, b"# Title\n\xff\xfe\n").unwrap();

        let contents = read_markdown_file(path.to_string_lossy().into_owned()).unwrap();

        assert!(contents.starts_with("# Title\n"));
        assert!(contents.contains('\u{fffd}'));

        fs::remove_file(&path).unwrap();
    }

    #[test]
    fn reads_images_relative_to_the_document() {
        let dir = temp_dir().join("docs");
        fs::create_dir_all(dir.join("images")).unwrap();
        fs::write(dir.join("readme.md"), "![pixel](images/pixel.png)").unwrap();
        fs::write(dir.join("images/pixel.png"), b"\x89PNG\r\n\x1a\n...").unwrap();

        let bytes =
            load_image_bytes(&dir.join("readme.md").to_string_lossy(), "images/pixel.png").unwrap();

        assert_eq!(bytes, b"\x89PNG\r\n\x1a\n...");
    }

    #[test]
    fn resolves_parent_directory_traversal() {
        let dir = temp_dir().join("nested/deeper");
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("readme.md"), "![pixel](../pixel.png)").unwrap();
        fs::write(temp_dir().join("nested/pixel.png"), b"png").unwrap();

        let bytes =
            load_image_bytes(&dir.join("readme.md").to_string_lossy(), "../pixel.png").unwrap();

        assert_eq!(bytes, b"png");
    }

    #[test]
    fn rejects_files_that_are_not_images() {
        let dir = temp_dir();
        fs::write(dir.join("readme.md"), "text").unwrap();

        let error = load_image_bytes(&dir.join("readme.md").to_string_lossy(), "readme.md");

        assert!(error.is_err());
    }

    #[test]
    fn rejects_oversized_images() {
        let dir = temp_dir();
        let path = dir.join("huge.png");
        let file = fs::File::create(&path).unwrap();
        file.set_len(super::MAX_IMAGE_BYTES + 1).unwrap();

        let error = load_image_bytes(&dir.join("readme.md").to_string_lossy(), "huge.png");

        assert!(error.unwrap_err().contains("larger than"));

        fs::remove_file(&path).unwrap();
    }

    #[test]
    fn reports_missing_images() {
        let error = load_image_bytes(
            &temp_dir().join("readme.md").to_string_lossy(),
            "missing.png",
        );

        assert!(error.is_err());
    }
}
