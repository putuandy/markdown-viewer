mod file;
pub(crate) mod folder;
pub(crate) mod recent;

pub use file::{read_image_file, read_markdown_file};
pub use folder::{list_markdown_files, path_kind};
pub use recent::{add_recent_file, clear_recent_files, recent_files};

use tauri::State;

use crate::PendingOpen;

/// Hands the frontend a document that arrived before it was listening.
#[tauri::command]
pub fn take_pending_open(state: State<'_, PendingOpen>) -> Option<String> {
    state.0.lock().ok().and_then(|mut pending| pending.take())
}

#[cfg(test)]
mod ipc_tests {
    use serde_json::{json, Value};
    use std::fs;
    use std::path::PathBuf;
    use tauri::ipc::{CallbackFn, InvokeBody, InvokeResponseBody};
    use tauri::test::{get_ipc_response, mock_builder, mock_context, noop_assets, INVOKE_KEY};
    use tauri::webview::InvokeRequest;
    use tauri::{App, Manager, WebviewUrl, WebviewWindowBuilder};

    type MockApp = App<tauri::test::MockRuntime>;

    /// The origin the webview uses in production, which is what the runtime
    /// treats as a trusted local source.
    const LOCAL_URL: &str = if cfg!(any(windows, target_os = "android")) {
        "http://tauri.localhost"
    } else {
        "tauri://localhost"
    };

    fn sandbox(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("markdown-viewer-ipc-{name}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    /// Boots the same set of commands the application registers, without a window.
    fn app() -> MockApp {
        let app = mock_builder()
            .invoke_handler(tauri::generate_handler![
                super::file::read_markdown_file,
                super::file::read_image_file,
                super::folder::list_markdown_files,
                super::folder::path_kind,
                super::recent::recent_files,
                super::recent::add_recent_file,
                super::recent::clear_recent_files,
                super::take_pending_open
            ])
            .build(mock_context(noop_assets()))
            .unwrap();

        WebviewWindowBuilder::new(&app, "main", WebviewUrl::default())
            .build()
            .unwrap();

        app
    }

    fn call(app: &MockApp, cmd: &str, args: Value) -> Result<InvokeResponseBody, Value> {
        let webview = app.get_webview_window("main").unwrap();

        get_ipc_response(
            &webview,
            InvokeRequest {
                cmd: cmd.to_string(),
                callback: CallbackFn(0),
                error: CallbackFn(1),
                url: LOCAL_URL.parse().unwrap(),
                body: InvokeBody::Json(args),
                headers: Default::default(),
                invoke_key: INVOKE_KEY.to_string(),
            },
        )
    }

    #[test]
    fn lists_documents_over_ipc() {
        let root = sandbox("list");
        fs::create_dir_all(root.join("docs")).unwrap();
        fs::write(root.join("README.md"), "# readme\n").unwrap();
        fs::write(root.join("docs/a.md"), "# a\n").unwrap();

        let app = app();
        let response = call(
            &app,
            "list_markdown_files",
            json!({ "root": root.to_string_lossy() }),
        )
        .unwrap();

        let listing: Value = response.deserialize().unwrap();

        assert_eq!(listing["files"], json!(["README.md", "docs/a.md"]));
        assert_eq!(listing["truncated"], json!(false));
    }

    #[test]
    fn reads_a_document_over_ipc() {
        let root = sandbox("read");
        fs::write(root.join("README.md"), "# hello\n").unwrap();

        let app = app();
        let response = call(
            &app,
            "read_markdown_file",
            json!({ "path": root.join("README.md").to_string_lossy() }),
        )
        .unwrap();

        let text: String = response.deserialize().unwrap();

        assert_eq!(text, "# hello\n");
    }

    #[test]
    fn reads_an_image_over_ipc() {
        let root = sandbox("image");
        fs::write(root.join("README.md"), "![pixel](pic.png)\n").unwrap();
        fs::write(root.join("pic.png"), b"\x89PNG\r\n\x1a\n data").unwrap();

        let app = app();
        let response = call(
            &app,
            "read_image_file",
            json!({
                "documentPath": root.join("README.md").to_string_lossy(),
                "source": "pic.png",
            }),
        )
        .unwrap();

        match response {
            InvokeResponseBody::Raw(bytes) => assert_eq!(bytes, b"\x89PNG\r\n\x1a\n data"),
            other => panic!("expected raw bytes, got {other:?}"),
        }
    }

    #[test]
    fn reports_the_kind_of_a_path_over_ipc() {
        let root = sandbox("kind");
        fs::write(root.join("doc.md"), "# doc\n").unwrap();

        let app = app();
        let folder = call(&app, "path_kind", json!({ "path": root.to_string_lossy() })).unwrap();
        let document = call(
            &app,
            "path_kind",
            json!({ "path": root.join("doc.md").to_string_lossy() }),
        )
        .unwrap();

        assert_eq!(folder.deserialize::<String>().unwrap(), "directory");
        assert_eq!(document.deserialize::<String>().unwrap(), "markdown");
    }

    #[test]
    fn surfaces_command_errors_over_ipc() {
        let app = app();
        let error = call(
            &app,
            "read_markdown_file",
            json!({ "path": "/definitely/not/here.md" }),
        )
        .unwrap_err();

        assert!(
            error.to_string().contains("Could not open"),
            "unexpected error: {error}"
        );
    }
}
