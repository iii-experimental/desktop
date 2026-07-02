use std::sync::Arc;
use tauri::{AppHandle, Manager, RunEvent};

mod console;
mod functions;
mod menu;
mod worker;

#[derive(Clone)]
pub struct AppState {
    pub worker: Arc<worker::WorkerHandle>,
}

pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "iii_desktop=info,warn".into()),
        )
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_deep_link::init())
        .setup(setup)
        .invoke_handler(tauri::generate_handler![
            functions::engine::engine_status,
            functions::window::window_focus,
            functions::dialog::pick_directory,
        ])
        .build(tauri::generate_context!())
        .expect("build tauri app")
        .run(on_run_event);
}

fn setup(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    menu::install(app)?;

    console::ensure();

    let handle: AppHandle = app.handle().clone();
    let worker = worker::spawn(handle.clone());
    app.manage(AppState {
        worker: Arc::new(worker),
    });

    Ok(())
}

fn on_run_event(_app: &AppHandle, event: RunEvent) {
    if let RunEvent::ExitRequested { .. } = event {
        tracing::info!("exit requested; iii worker will be dropped on process exit");
    }
}
