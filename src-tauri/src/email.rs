use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EmailItem {
    pub id: String,
    pub thread_id: String,
    pub sender: String,
    pub subject: String,
    pub snippet: String,
    pub ai_summary: Option<String>,
    pub category: String,
    pub is_read: bool,
    pub received_at: String,
    pub account_email: String,
}

fn categorize_email(sender: &str, subject: &str) -> String {
    let lower_sender = sender.to_lowercase();
    let lower_subj = subject.to_lowercase();

    if lower_sender.contains("linkedin")
        || lower_sender.contains("twitter")
        || lower_sender.contains("facebook")
        || lower_sender.contains("instagram")
    {
        return "Social".to_string();
    }

    if lower_sender.contains("github")
        || lower_sender.contains("vercel")
        || lower_sender.contains("neon")
        || lower_sender.contains("gitlab")
        || lower_sender.contains("aws")
        || lower_sender.contains("docker")
        || lower_sender.contains("stripe")
        || lower_sender.contains("invoice")
        || lower_sender.contains("billing")
        || lower_sender.contains("receipt")
        || lower_subj.contains("invoice")
        || lower_subj.contains("receipt")
        || lower_subj.contains("your order")
        || lower_subj.contains("security alert")
        || lower_subj.contains("notification")
    {
        return "Updates".to_string();
    }

    if lower_sender.contains("newsletter")
        || lower_sender.contains("substack")
        || lower_subj.contains("digest")
        || lower_subj.contains("weekly")
        || lower_subj.contains("edition")
        || lower_subj.contains("sale")
        || lower_subj.contains("discount")
    {
        return "Promotions".to_string();
    }

    "Primary".to_string()
}

pub fn fetch_account_emails(
    email: &str,
    app_password: &str,
    limit: usize,
) -> Result<Vec<EmailItem>, String> {
    let clean_password = app_password.replace(' ', "");

    let tls = native_tls::TlsConnector::builder()
        .build()
        .map_err(|e| format!("TLS build error: {}", e))?;

    let client = imap::connect(("imap.gmail.com", 993), "imap.gmail.com", &tls)
        .map_err(|e| format!("Failed to connect to imap.gmail.com: {}", e))?;

    let mut session = client
        .login(email, &clean_password)
        .map_err(|(e, _)| format!("IMAP login failed for {}: {}", email, e))?;

    let mailbox = session
        .select("INBOX")
        .map_err(|e| format!("Failed to select INBOX: {}", e))?;

    let total = mailbox.exists;
    if total == 0 {
        let _ = session.logout();
        return Ok(Vec::new());
    }

    // Determine the sequence range for the most recent emails across all categories
    let start = if total > limit as u32 {
        total - limit as u32 + 1
    } else {
        1
    };
    let sequence_set = format!("{}:{}", start, total);

    // Query Gmail's categories by UID search for accurate classification
    let primary_uids: std::collections::HashSet<u32> = session
        .uid_search("X-GM-RAW \"category:primary\"")
        .unwrap_or_default();
    let updates_uids: std::collections::HashSet<u32> = session
        .uid_search("X-GM-RAW \"category:updates\"")
        .unwrap_or_default();
    let promo_uids: std::collections::HashSet<u32> = session
        .uid_search("X-GM-RAW \"category:promotions\"")
        .unwrap_or_default();
    let social_uids: std::collections::HashSet<u32> = session
        .uid_search("X-GM-RAW \"category:social\"")
        .unwrap_or_default();

    let messages = session
        .fetch(&sequence_set, "(UID RFC822.HEADER BODY[TEXT] FLAGS)")
        .map_err(|e| format!("Failed to fetch messages: {}", e))?;

    let mut items = Vec::new();

    for msg in messages.iter().rev() {
        let header_bytes = msg.header().unwrap_or_default();
        let parsed_headers = mailparse::parse_mail(header_bytes)
            .map_err(|e| format!("Failed to parse headers: {}", e))?;

        let mut subject = String::from("(No Subject)");
        let mut from = String::from("Unknown");
        let mut date_str = String::new();
        let mut message_id = format!("msg-{}", msg.message);

        for header in parsed_headers.headers {
            match header.get_key().to_lowercase().as_str() {
                "subject" => subject = header.get_value(),
                "from" => from = header.get_value(),
                "date" => date_str = header.get_value(),
                "message-id" => message_id = header.get_value(),
                _ => {}
            }
        }

        // Get preview snippet from message body
        let body_bytes = msg.text().unwrap_or_default();
        let raw_text = String::from_utf8_lossy(body_bytes);
        let snippet: String = raw_text
            .lines()
            .map(|l| l.trim())
            .filter(|l| !l.is_empty() && !l.starts_with('>') && !l.starts_with('-'))
            .take(3)
            .collect::<Vec<&str>>()
            .join(" ");

        let clean_snippet = if snippet.is_empty() {
            subject.clone()
        } else if snippet.len() > 160 {
            format!("{}...", &snippet[..160])
        } else {
            snippet
        };

        let is_seen = msg.flags().iter().any(|f| matches!(f, imap::types::Flag::Seen));

        // Assign category via Gmail UID category search, or fallback to heuristics
        let category = if let Some(uid) = msg.uid {
            if primary_uids.contains(&uid) {
                "Primary".to_string()
            } else if updates_uids.contains(&uid) {
                "Updates".to_string()
            } else if promo_uids.contains(&uid) {
                "Promotions".to_string()
            } else if social_uids.contains(&uid) {
                "Social".to_string()
            } else {
                categorize_email(&from, &subject)
            }
        } else {
            categorize_email(&from, &subject)
        };

        items.push(EmailItem {
            id: message_id.clone(),
            thread_id: format!("th-{}", msg.message),
            sender: from,
            subject,
            snippet: clean_snippet,
            ai_summary: None,
            category,
            is_read: is_seen,
            received_at: date_str,
            account_email: email.to_string(),
        });
    }

    let _ = session.logout();
    Ok(items)
}

#[tauri::command]
pub async fn sync_gmail_emails(limit: Option<usize>) -> Result<Vec<EmailItem>, String> {
    let _ = dotenvy::dotenv();
    let _ = dotenvy::from_filename("../.env");

    let fetch_limit = limit.unwrap_or(40);
    let mut all_emails = Vec::new();

    // Account 1
    if let (Ok(email), Ok(pass)) = (
        env::var("GMAIL_1_EMAIL"),
        env::var("GMAIL_1_APP_PASSWORD"),
    ) {
        if !email.trim().is_empty() && !pass.trim().is_empty() {
            match fetch_account_emails(email.trim(), pass.trim(), fetch_limit) {
                Ok(mut list) => all_emails.append(&mut list),
                Err(err) => eprintln!("Error fetching emails for {}: {}", email, err),
            }
        }
    }

    // Account 2
    if let (Ok(email), Ok(pass)) = (
        env::var("GMAIL_2_EMAIL"),
        env::var("GMAIL_2_APP_PASSWORD"),
    ) {
        if !email.trim().is_empty() && !pass.trim().is_empty() {
            match fetch_account_emails(email.trim(), pass.trim(), fetch_limit) {
                Ok(mut list) => all_emails.append(&mut list),
                Err(err) => eprintln!("Error fetching emails for {}: {}", email, err),
            }
        }
    }

    if all_emails.is_empty() {
        return Err("No Gmail accounts configured in .env or login failed. Check .env for GMAIL_1_EMAIL and GMAIL_1_APP_PASSWORD.".to_string());
    }

    Ok(all_emails)
}
