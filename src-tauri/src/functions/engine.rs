use serde::Serialize;

#[derive(Serialize)]
pub struct EngineStatus {
    pub url: String,
    pub product_name: &'static str,
    pub product_version: &'static str,
}

#[tauri::command]
pub async fn engine_status() -> Result<EngineStatus, String> {
    let url = std::env::var("III_URL").unwrap_or_else(|_| "ws://127.0.0.1:49134".into());
    Ok(EngineStatus {
        url,
        product_name: "iii-desktop",
        product_version: env!("CARGO_PKG_VERSION"),
    })
}
