mod commands;
mod menu;
mod recent;
mod watcher;

use std::sync::Mutex;

use commands::{
    add_recent_file, clear_recent_files, list_markdown_files, path_kind, read_image_file,
    read_markdown_file, recent_files, take_pending_open,
};
use serde_json::json;
use tauri::{AppHandle, Emitter, Manager, RunEvent, Runtime};
use watcher::{watch_folder, FolderWatcher};

/// Emitted when a document is opened from outside the application.
pub const OPEN_PATH_EVENT: &str = "open-path";

/// A document queued by the file manager before the interface was ready.
#[derive(Default)]
pub struct PendingOpen(Mutex<Option<String>>);

fn queue_open<R: Runtime>(app: &AppHandle<R>, path: String) {
    if let Some(state) = app.try_state::<PendingOpen>() {
        if let Ok(mut pending) = state.0.lock() {
            *pending = Some(path.clone());
        }
    }

    let _ = app.emit(OPEN_PATH_EVENT, json!(path));
}

fn focus_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_focus();
    }
}

pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .manage(PendingOpen::default())
        .manage(FolderWatcher::default())
        .invoke_handler(tauri::generate_handler![
            read_markdown_file,
            read_image_file,
            list_markdown_files,
            path_kind,
            recent_files,
            add_recent_file,
            clear_recent_files,
            take_pending_open,
            watch_folder
        ])
        .setup(|app| {
            let handle = app.handle();

            // A document passed on the command line, from `open -a` or a
            // desktop shortcut.
            if let Some(path) = recent::path_from_args(std::env::args().skip(1)) {
                queue_open(handle, path.to_string_lossy().into_owned());
            }

            menu::install(handle).map_err(std::io::Error::other)?;

            Ok(())
        })
        .on_menu_event(|app, event| {
            menu::handle_event(app, event.id().as_ref());
        })
        .build(tauri::generate_context!())
        .expect("error while building the application");

    app.run(|handle, event| {
        // macOS delivers files opened through the Finder or the Dock here.
        if let RunEvent::Opened { urls } = event {
            for url in urls {
                if let Ok(path) = url.to_file_path() {
                    queue_open(handle, path.to_string_lossy().into_owned());
                    focus_main_window(handle);
                    break;
                }
            }
        }
    });
}
