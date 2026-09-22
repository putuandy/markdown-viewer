use serde_json::{json, Value};
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::{AppHandle, Emitter, Runtime};

use crate::commands::recent;

/// Emitted to the frontend when a menu item is chosen.
pub const MENU_EVENT: &str = "menu-action";

const SIMPLE_ITEMS: [&str; 4] = ["open-file", "open-folder", "find", "toggle-sidebar"];

/// Builds the application menu, including the current recent documents.
fn build<R: Runtime>(
    app: &AppHandle<R>,
    recent_files: &[String],
) -> tauri::Result<tauri::menu::Menu<R>> {
    let mut recent_menu = SubmenuBuilder::new(app, "Open Recent");

    if recent_files.is_empty() {
        recent_menu = recent_menu.item(
            &MenuItemBuilder::with_id("recent-empty", "No Recent Documents")
                .enabled(false)
                .build(app)?,
        );
    } else {
        for (index, path) in recent_files.iter().enumerate() {
            let name = std::path::Path::new(path)
                .file_name()
                .map(|value| value.to_string_lossy().into_owned())
                .unwrap_or_else(|| path.clone());

            recent_menu = recent_menu
                .item(&MenuItemBuilder::with_id(format!("recent:{index}"), name).build(app)?);
        }

        recent_menu = recent_menu
            .separator()
            .item(&MenuItemBuilder::with_id("clear-recent", "Clear Menu").build(app)?);
    }

    let recent_menu = recent_menu.build()?;

    let file_menu = SubmenuBuilder::new(app, "File")
        .item(
            &MenuItemBuilder::with_id("open-file", "Open…")
                .accelerator("CmdOrCtrl+O")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("open-folder", "Open Folder…")
                .accelerator("CmdOrCtrl+Shift+O")
                .build(app)?,
        )
        .separator()
        .item(&recent_menu)
        .separator()
        .item(&PredefinedMenuItem::close_window(app, None)?)
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .item(&PredefinedMenuItem::copy(app, None)?)
        .item(&PredefinedMenuItem::select_all(app, None)?)
        .build()?;

    let view_menu = SubmenuBuilder::new(app, "View")
        .item(
            &MenuItemBuilder::with_id("find", "Find…")
                .accelerator("CmdOrCtrl+F")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("toggle-sidebar", "Toggle Sidebar")
                .accelerator("CmdOrCtrl+B")
                .build(app)?,
        )
        .separator()
        .item(&PredefinedMenuItem::fullscreen(app, None)?)
        .build()?;

    let window_menu = SubmenuBuilder::new(app, "Window")
        .item(&PredefinedMenuItem::minimize(app, None)?)
        .item(&PredefinedMenuItem::maximize(app, None)?)
        .build()?;

    let _help_menu = SubmenuBuilder::new(app, "Help")
        .item(&MenuItemBuilder::with_id("about", "About Markdown Viewer").build(app)?)
        .build()?;

    let app_menu = SubmenuBuilder::new(app, "Markdown Viewer")
        .item(&PredefinedMenuItem::about(app, None, None)?)
        .separator()
        .item(&PredefinedMenuItem::services(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::hide(app, None)?)
        .item(&PredefinedMenuItem::hide_others(app, None)?)
        .item(&PredefinedMenuItem::show_all(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::quit(app, None)?)
        .build()?;

    #[cfg(target_os = "macos")]
    let menu = MenuBuilder::new(app)
        .items(&[&app_menu, &file_menu, &edit_menu, &view_menu, &window_menu])
        .build()?;

    #[cfg(not(target_os = "macos"))]
    let menu = MenuBuilder::new(app)
        .items(&[
            &file_menu,
            &edit_menu,
            &view_menu,
            &window_menu,
            &_help_menu,
        ])
        .build()?;

    Ok(menu)
}

pub fn install<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let menu = build(app, &recent::read(app)).map_err(|error| error.to_string())?;

    app.set_menu(menu).map_err(|error| error.to_string())?;

    Ok(())
}

/// Rebuilds the menu so recent documents reflect the current list.
pub fn refresh<R: Runtime>(app: &AppHandle<R>) {
    let _ = install(app);
}

fn payload<R: Runtime>(app: &AppHandle<R>, id: &str) -> Option<Value> {
    if SIMPLE_ITEMS.contains(&id) || id == "clear-recent" {
        return Some(json!(id));
    }

    let index = id.strip_prefix("recent:")?.parse::<usize>().ok()?;
    let path = recent::read(app).into_iter().nth(index)?;

    Some(json!({ "openPath": path }))
}

pub fn handle_event<R: Runtime>(app: &AppHandle<R>, id: &str) {
    if id == "about" {
        let _ = app.emit(MENU_EVENT, json!("about"));
        return;
    }

    if let Some(action) = payload(app, id) {
        let _ = app.emit(MENU_EVENT, action);
    }
}
