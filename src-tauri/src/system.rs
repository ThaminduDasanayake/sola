use tauri::Manager;

#[tauri::command]
pub fn get_database_path(app: tauri::AppHandle) -> Result<String, String> {
    app.path()
        .app_data_dir()
        .map(|p| p.join("sola.db").to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reveal_database(app: tauri::AppHandle) -> Result<(), String> {
    if let Ok(path) = app.path().app_data_dir() {
        let db = path.join("sola.db");
        #[cfg(target_os = "macos")]
        {
            let _ = std::process::Command::new("open")
                .args(["-R", db.to_str().unwrap_or_default()])
                .spawn();
        }
    }
    Ok(())
}
