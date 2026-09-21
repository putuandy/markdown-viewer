mod commands;

use commands::{list_markdown_files, path_kind, read_image_file, read_markdown_file};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            read_markdown_file,
            read_image_file,
            list_markdown_files,
            path_kind
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
