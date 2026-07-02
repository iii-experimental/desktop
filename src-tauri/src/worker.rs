use std::env;
use std::sync::Arc;
use tauri::AppHandle;
use tokio::sync::mpsc;

pub struct WorkerHandle {
    pub shutdown: mpsc::Sender<()>,
}

/// Spawn the iii-sdk worker that registers `desktop::*` functions on the
/// backend engine (port 49134 by default). Tauri 2 owns the tokio runtime
/// at this point in the lifecycle, so spawn through `tauri::async_runtime`
/// rather than `tokio::spawn` (which panics before the main runtime
/// attaches).
pub fn spawn(app: AppHandle) -> WorkerHandle {
    let (tx, mut rx) = mpsc::channel::<()>(1);
    let engine_url = env::var("III_URL").unwrap_or_else(|_| "ws://127.0.0.1:49134".into());

    tauri::async_runtime::spawn(async move {
        if let Err(err) = register_loop(app, engine_url, &mut rx).await {
            tracing::warn!(%err, "iii worker register loop ended");
        }
    });

    WorkerHandle { shutdown: tx }
}

async fn register_loop(
    app: AppHandle,
    engine_url: String,
    shutdown: &mut mpsc::Receiver<()>,
) -> anyhow::Result<()> {
    use iii_sdk::errors::Error;
    use iii_sdk::runtime::WorkerMetadata;
    use iii_sdk::{register_worker, InitOptions, RegisterFunction};
    use serde_json::{json, Value};

    tracing::info!(engine_url, "connecting to iii engine");
    let iii = register_worker(
        &engine_url,
        InitOptions {
            metadata: Some(WorkerMetadata {
                runtime: "rust".into(),
                version: env!("CARGO_PKG_VERSION").into(),
                name: "iii-desktop".into(),
                os: std::env::consts::OS.into(),
                pid: Some(std::process::id()),
                telemetry: None,
                ..WorkerMetadata::default()
            }),
            ..InitOptions::default()
        },
    );
    let iii = Arc::new(iii);

    let _status = iii.register_function(
        "desktop::status",
        RegisterFunction::new_async(|_payload: Value| async move {
            Ok::<_, Error>(json!({
                "ok": true,
                "name": "iii-desktop",
                "version": env!("CARGO_PKG_VERSION"),
            }))
        })
        .description("Liveness probe for the desktop worker."),
    );

    let app_focus = app.clone();
    let _focus = iii.register_function(
        "desktop::window::focus",
        RegisterFunction::new_async(move |_payload: Value| {
            let app = app_focus.clone();
            async move {
                use tauri::Manager;
                let Some(window) = app.get_webview_window("main") else {
                    return Ok::<_, Error>(
                        json!({ "ok": false, "reason": "main window not found" }),
                    );
                };
                let shown = window.show().is_ok();
                let focused = window.set_focus().is_ok();
                Ok::<_, Error>(json!({ "ok": shown && focused }))
            }
        })
        .description("Bring the desktop window to the front."),
    );

    tracing::info!("desktop worker registered; awaiting shutdown");
    let _ = shutdown.recv().await;
    iii.shutdown_async().await;
    Ok(())
}
