use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    App, Emitter, Manager,
};

pub fn install(app: &mut App) -> tauri::Result<()> {
    let handle = app.handle();

    let app_submenu = Submenu::with_items(
        handle,
        "iii",
        true,
        &[
            &PredefinedMenuItem::about(handle, Some("About iii"), None)?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::services(handle, None)?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::hide(handle, None)?,
            &PredefinedMenuItem::hide_others(handle, None)?,
            &PredefinedMenuItem::show_all(handle, None)?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::quit(handle, None)?,
        ],
    )?;

    let edit_submenu = Submenu::with_items(
        handle,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(handle, None)?,
            &PredefinedMenuItem::redo(handle, None)?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::cut(handle, None)?,
            &PredefinedMenuItem::copy(handle, None)?,
            &PredefinedMenuItem::paste(handle, None)?,
            &PredefinedMenuItem::select_all(handle, None)?,
        ],
    )?;

    let session_submenu = Submenu::with_items(
        handle,
        "Session",
        true,
        &[
            &MenuItem::with_id(
                handle,
                "session.new",
                "New session",
                true,
                Some("CmdOrCtrl+N"),
            )?,
            &MenuItem::with_id(
                handle,
                "session.open",
                "Open session…",
                true,
                Some("CmdOrCtrl+O"),
            )?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItem::with_id(
                handle,
                "session.export.md",
                "Export as Markdown",
                true,
                Some("CmdOrCtrl+Shift+M"),
            )?,
            &MenuItem::with_id(
                handle,
                "session.export.json",
                "Export as JSON",
                true,
                Some("CmdOrCtrl+Shift+J"),
            )?,
        ],
    )?;

    let view_submenu = Submenu::with_items(
        handle,
        "View",
        true,
        &[
            &MenuItem::with_id(handle, "view.chat", "Chat", true, Some("CmdOrCtrl+1"))?,
            &MenuItem::with_id(handle, "view.cost", "Cost", true, Some("CmdOrCtrl+2"))?,
            &MenuItem::with_id(handle, "view.files", "Files", true, Some("CmdOrCtrl+3"))?,
            &MenuItem::with_id(handle, "view.status", "Status", true, Some("CmdOrCtrl+4"))?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::fullscreen(handle, None)?,
        ],
    )?;

    let menu = Menu::with_items(
        handle,
        &[&app_submenu, &edit_submenu, &session_submenu, &view_submenu],
    )?;
    app.set_menu(menu)?;

    app.on_menu_event(|app, event| {
        let id = event.id().as_ref();
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.emit("desktop::menu", id);
        }
    });

    Ok(())
}
