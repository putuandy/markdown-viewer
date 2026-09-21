use std::path::PathBuf;

use tauri::{AppHandle, Manager, Runtime};

use crate::recent;

/// Where the recent list lives, inside the platform configuration folder.
pub(crate) fn store_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("Could not locate the configuration folder: {error}"))?;

    Ok(directory.join("recent-files.json"))
}

pub(crate) fn read<R: Runtime>(app: &AppHandle<R>) -> Vec<String> {
    store_path(app)
        .map(|path| recent::load(&path))
        .unwrap_or_default()
}

fn write<R: Runtime>(app: &AppHandle<R>, files: &[String]) -> Result<(), String> {
    recent::save(&store_path(app)?, files)
}

#[tauri::command]
pub fn recent_files<R: Runtime>(app: AppHandle<R>) -> Vec<String> {
    read(&app)
}

/// Records a document as recently opened and returns the updated list, so the
/// caller and the native menu stay in step.
#[tauri::command]
pub fn add_recent_file<R: Runtime>(app: AppHandle<R>, path: String) -> Vec<String> {
    let files = recent::push(&read(&app), &path);
    let _ = write(&app, &files);

    crate::menu::refresh(&app);

    files
}

#[tauri::command]
pub fn clear_recent_files<R: Runtime>(app: AppHandle<R>) -> Vec<String> {
    let _ = write(&app, &[]);

    crate::menu::refresh(&app);

    Vec::new()
}
