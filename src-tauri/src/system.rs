use tauri::Manager;

#[derive(serde::Serialize, serde::Deserialize, Default)]
pub struct VercelConfig {
    pub token: Option<String>,
    pub team_id: Option<String>,
}

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

#[tauri::command]
pub fn get_vercel_credentials() -> Result<VercelConfig, String> {
    let _ = dotenvy::dotenv();
    let _ = dotenvy::from_filename("../.env");

    let token = std::env::var("VERCEL_API_TOKEN")
        .ok()
        .or_else(|| std::env::var("VERCEL_TOKEN").ok())
        .filter(|t| !t.trim().is_empty());

    let team_id = std::env::var("VERCEL_TEAM_ID")
        .ok()
        .filter(|t| !t.trim().is_empty());

    Ok(VercelConfig { token, team_id })
}
