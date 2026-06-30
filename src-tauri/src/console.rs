//! Ensures the iii console worker is installed so the engine serves the
//! harness console UI at `127.0.0.1:<port>`. The desktop is a thin native
//! wrapper around that UI and vendors no frontend. Installing other workers
//! (harness and the rest) is the console's own job via its Workers page; this
//! only guarantees the console worker itself is present so there is a UI to
//! show. The worker is owned by the engine, not the shell, so nothing here
//! needs tearing down on exit.

use std::process::Command;

/// Best-effort `iii worker add console` so the engine serves the UI. Idempotent
/// (a no-op when the worker is already in config), fire-and-forget, and skipped
/// when `III_CONSOLE_AUTOSTART=0`. Requires a running engine; if none is up the
/// command fails quietly and the window waits for the console to appear.
pub fn ensure() {
    let enabled = std::env::var("III_CONSOLE_AUTOSTART")
        .map(|v| v != "0" && !v.eq_ignore_ascii_case("false"))
        .unwrap_or(true);
    if !enabled {
        tracing::info!("III_CONSOLE_AUTOSTART disabled; expecting console worker already added");
        return;
    }

    let bin = std::env::var("III_BIN").unwrap_or_else(|_| "iii".into());
    match Command::new(&bin)
        .arg("worker")
        .arg("add")
        .arg("console")
        .spawn()
    {
        Ok(_) => tracing::info!("ensuring iii console worker (worker add console)"),
        Err(err) => {
            tracing::warn!(%err, "could not run `iii worker add console`; expecting an external console")
        }
    }
}
