use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

mod email;
mod system;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: "
                CREATE TABLE IF NOT EXISTS emails (
                    id TEXT PRIMARY KEY,
                    thread_id TEXT NOT NULL,
                    sender TEXT NOT NULL,
                    subject TEXT NOT NULL,
                    snippet TEXT,
                    ai_summary TEXT,
                    category TEXT DEFAULT 'Uncategorized',
                    is_read INTEGER DEFAULT 0,
                    received_at DATETIME NOT NULL,
                    account_email TEXT
                );

                CREATE TABLE IF NOT EXISTS bookmarks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    url TEXT UNIQUE NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT,
                    tags TEXT,
                    ai_notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE VIRTUAL TABLE IF NOT EXISTS bookmarks_fts USING fts5(
                    title,
                    description,
                    tags,
                    content='bookmarks',
                    content_rowid='id'
                );

                CREATE TABLE IF NOT EXISTS projects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    repo_slug TEXT,
                    vercel_project_id TEXT,
                    last_status TEXT DEFAULT 'unknown',
                    last_checked_at DATETIME
                );
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_deleted_emails_table",
            sql: "
                CREATE TABLE IF NOT EXISTS deleted_emails (
                    id TEXT PRIMARY KEY,
                    deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            ",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .setup(|app| {
            if let Ok(app_data) = app.path().app_data_dir() {
                let db_path = app_data.join("sola.db");
                // In dev mode, symlink sola.db to the project folder for easy inspection
                #[cfg(target_os = "macos")]
                {
                    if let Ok(cwd) = std::env::current_dir() {
                        let link_path = cwd.join("sola.db");
                        if !link_path.exists() && db_path.exists() {
                            let _ = std::os::unix::fs::symlink(&db_path, &link_path);
                        }
                    }
                }
            }
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:sola.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![
            email::sync_gmail_emails,
            system::get_database_path,
            system::reveal_database
        ])
        .run(tauri::generate_context!())
        .expect("error while running Sola desktop application");
}
