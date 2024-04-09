// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod net;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tauri::Builder
        ::default()
        .plugin(net::TauriLanChat::new())
        .run(tauri::generate_context!())
        .expect("Error while running Tauri application");

    Ok(())
}
