use std::env;
use std::sync::Arc;
use tauri::AppHandle;
use tokio::sync::mpsc;

pub struct WorkerHandle {
    pub shutdown: mpsc::Sender<()>,
}

/// Spawn the iii-sdk worker that registers `desktop::*` functions on the
/// backend engine (port 49134 by default). The web UI keeps its own
/// browser-side connection on port 49135 via `iii-browser-sdk`; this
/// worker is what exposes native capabilities (file dialogs, deep links,
/// window focus) to the rest of the iii ecosystem.
pub fn spawn(app: AppHandle) -> WorkerHandle {
    let (tx, mut rx) = mpsc::channel::<()>(1);
    let engine_url = env::var("III_URL").unwrap_or_else(|_| "ws://127.0.0.1:49134".into());

    tokio::spawn(async move {
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
    use iii_sdk::{
        register_worker, IIIError, InitOptions, RegisterFunctionMessage, WorkerMetadata,
    };
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

    let _status = iii.register_function((
        RegisterFunctionMessage::with_id("desktop::status".into())
            .with_description("Liveness probe for the desktop worker.".into()),
        |_payload: Value| async move {
            Ok::<_, IIIError>(json!({
                "ok": true,
                "name": "iii-desktop",
                "version": env!("CARGO_PKG_VERSION"),
            }))
        },
    ));

    let app_focus = app.clone();
    let _focus = iii.register_function((
        RegisterFunctionMessage::with_id("desktop::window::focus".into())
            .with_description("Bring the desktop window to the front.".into()),
        move |_payload: Value| {
            let app = app_focus.clone();
            async move {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
                Ok::<_, IIIError>(json!({ "ok": true }))
            }
        },
    ));

    tracing::info!("desktop worker registered; awaiting shutdown");
    let _ = shutdown.recv().await;
    iii.shutdown_async().await;
    Ok(())
}
