use std::fs;

/// Reads a Markdown file from disk and returns it as text.
///
/// Invalid UTF-8 is replaced rather than rejected so that a damaged file can
/// still be read instead of blocking the user with an error.
#[tauri::command]
fn read_markdown_file(path: String) -> Result<String, String> {
    let bytes = fs::read(&path).map_err(|error| format!("Could not open {path}: {error}"))?;
    Ok(String::from_utf8_lossy(&bytes).into_owned())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![read_markdown_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::read_markdown_file;
    use std::fs;
    use std::path::PathBuf;

    fn temp_path(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!("markdown-viewer-test-{name}"))
    }

    #[test]
    fn reads_a_markdown_file() {
        let path = temp_path("valid.md");
        fs::write(&path, "# Title\n\nBody\n").unwrap();

        let contents = read_markdown_file(path.to_string_lossy().into_owned()).unwrap();

        assert_eq!(contents, "# Title\n\nBody\n");

        fs::remove_file(&path).unwrap();
    }

    #[test]
    fn reports_missing_files() {
        let error = read_markdown_file(temp_path("missing.md").to_string_lossy().into_owned());

        assert!(error.is_err());
    }

    #[test]
    fn replaces_invalid_utf8_instead_of_failing() {
        let path = temp_path("invalid.md");
        fs::write(&path, b"# Title\n\xff\xfe\n").unwrap();

        let contents = read_markdown_file(path.to_string_lossy().into_owned()).unwrap();

        assert!(contents.starts_with("# Title\n"));
        assert!(contents.contains('\u{fffd}'));

        fs::remove_file(&path).unwrap();
    }
}
