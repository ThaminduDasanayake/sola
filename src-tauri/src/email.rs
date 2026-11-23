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
    limit_per_category: usize,
    deleted_ids: &std::collections::HashSet<String>,
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

    // Query Gmail's categories by UID search
    // We only fetch Primary and Updates (strictly 40 each, excluding Promotions, Social, Forums)
    let mut primary_uids: Vec<u32> = session
        .uid_search("X-GM-RAW \"category:primary\"")
        .unwrap_or_default()
        .into_iter()
        .collect();
    primary_uids.sort_unstable(); // Ascending order: highest UID = newest email

    let mut updates_uids: Vec<u32> = session
        .uid_search("X-GM-RAW \"category:updates\"")
        .unwrap_or_default()
        .into_iter()
        .collect();
    updates_uids.sort_unstable();

    let candidate_backfill = deleted_ids.len().min(30);
    let candidate_count = limit_per_category + candidate_backfill;

    let primary_candidates: std::collections::HashSet<u32> = primary_uids
        .iter()
        .rev()
        .take(candidate_count)
        .copied()
        .collect();

    let updates_candidates: std::collections::HashSet<u32> = updates_uids
        .iter()
        .rev()
        .take(candidate_count)
        .copied()
        .collect();

    let mut target_uids: Vec<u32> = primary_candidates
        .iter()
        .chain(updates_candidates.iter())
        .copied()
        .collect();
    target_uids.sort_unstable();
    target_uids.dedup();

    let mut primary_items: Vec<(u32, EmailItem)> = Vec::new();
    let mut updates_items: Vec<(u32, EmailItem)> = Vec::new();

    if !target_uids.is_empty() {
        // Fetch candidates in chunks of 50 UIDs to stay well within IMAP buffer limits
        for chunk in target_uids.chunks(50) {
            let uid_seq = chunk
                .iter()
                .map(|u| u.to_string())
                .collect::<Vec<_>>()
                .join(",");

            let messages = session
                .uid_fetch(&uid_seq, "(UID RFC822.HEADER BODY[TEXT] FLAGS)")
                .map_err(|e| format!("Failed to fetch messages by UID: {}", e))?;

            for msg in messages.iter() {
                let uid = match msg.uid {
                    Some(u) => u,
                    None => continue,
                };

                let category = if primary_candidates.contains(&uid) {
                    "Primary".to_string()
                } else if updates_candidates.contains(&uid) {
                    "Updates".to_string()
                } else {
                    // Strictly exclude Social, Promotions, Forums
                    continue;
                };

                let header_bytes = msg.header().unwrap_or_default();
                let parsed_headers = match mailparse::parse_mail(header_bytes) {
                    Ok(h) => h,
                    Err(_) => continue,
                };

                let mut subject = String::from("(No Subject)");
                let mut from = String::from("Unknown");
                let mut date_str = String::new();
                let mut message_id = format!("uid-{}", uid);

                for header in parsed_headers.headers {
                    match header.get_key().to_lowercase().as_str() {
                        "subject" => subject = header.get_value(),
                        "from" => from = header.get_value(),
                        "date" => date_str = header.get_value(),
                        "message-id" => {
                            let val = header.get_value();
                            if !val.trim().is_empty() {
                                message_id = val.trim().to_string();
                            }
                        }
                        _ => {}
                    }
                }

                let clean_id = message_id.trim();
                let stripped_id = clean_id.trim_matches(['<', '>']);
                let uid_tag = format!("uid-{}", uid);

                // Never re-add an email that the user deleted in Sola
                if deleted_ids.contains(clean_id)
                    || deleted_ids.contains(stripped_id)
                    || deleted_ids.contains(&format!("<{}>", stripped_id))
                    || deleted_ids.contains(&uid_tag)
                {
                    continue;
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

                let item = EmailItem {
                    id: message_id,
                    thread_id: format!("th-{}", uid),
                    sender: from,
                    subject,
                    snippet: clean_snippet,
                    ai_summary: None,
                    category: category.clone(),
                    is_read: is_seen,
                    received_at: date_str,
                    account_email: email.to_string(),
                };

                if category == "Primary" {
                    primary_items.push((uid, item));
                } else {
                    updates_items.push((uid, item));
                }
            }
        }
    } else {
        // Fallback if category search returned no UIDs (e.g. non-Gmail server)
        let fetch_count = ((limit_per_category * 2) + candidate_backfill).min(total as usize);
        let start = if total > fetch_count as u32 {
            total - fetch_count as u32 + 1
        } else {
            1
        };
        let sequence_set = format!("{}:{}", start, total);

        let messages = session
            .fetch(&sequence_set, "(UID RFC822.HEADER BODY[TEXT] FLAGS)")
            .map_err(|e| format!("Failed to fetch messages: {}", e))?;

        for msg in messages.iter().rev() {
            let uid = msg.uid.unwrap_or(msg.message);

            let header_bytes = msg.header().unwrap_or_default();
            let parsed_headers = match mailparse::parse_mail(header_bytes) {
                Ok(h) => h,
                Err(_) => continue,
            };

            let mut subject = String::from("(No Subject)");
            let mut from = String::from("Unknown");
            let mut date_str = String::new();
            let mut message_id = format!("uid-{}", uid);

            for header in parsed_headers.headers {
                match header.get_key().to_lowercase().as_str() {
                    "subject" => subject = header.get_value(),
                    "from" => from = header.get_value(),
                    "date" => date_str = header.get_value(),
                    "message-id" => {
                        let val = header.get_value();
                        if !val.trim().is_empty() {
                            message_id = val.trim().to_string();
                        }
                    }
                    _ => {}
                }
            }

            let clean_id = message_id.trim();
            let stripped_id = clean_id.trim_matches(['<', '>']);
            let uid_tag = format!("uid-{}", uid);

            if deleted_ids.contains(clean_id)
                || deleted_ids.contains(stripped_id)
                || deleted_ids.contains(&format!("<{}>", stripped_id))
                || deleted_ids.contains(&uid_tag)
            {
                continue;
            }

            let category = categorize_email(&from, &subject);
            // Strictly exclude Promotions, Social, Forums
            if category != "Primary" && category != "Updates" {
                continue;
            }

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

            let item = EmailItem {
                id: message_id,
                thread_id: format!("th-{}", uid),
                sender: from,
                subject,
                snippet: clean_snippet,
                ai_summary: None,
                category: category.clone(),
                is_read: is_seen,
                received_at: date_str,
                account_email: email.to_string(),
            };

            if category == "Primary" {
                primary_items.push((uid, item));
            } else {
                updates_items.push((uid, item));
            }
        }
    }

    // Sort each category descending by UID (newest first)
    primary_items.sort_by(|a, b| b.0.cmp(&a.0));
    updates_items.sort_by(|a, b| b.0.cmp(&a.0));

    // Limit to up to limit_per_category each (e.g. 40 each)
    primary_items.truncate(limit_per_category);
    updates_items.truncate(limit_per_category);

    // Combine all and sort chronologically by UID descending
    let mut all_items: Vec<(u32, EmailItem)> = primary_items
        .into_iter()
        .chain(updates_items.into_iter())
        .collect();
    all_items.sort_by(|a, b| b.0.cmp(&a.0));

    let final_items: Vec<EmailItem> = all_items.into_iter().map(|(_, item)| item).collect();

    let _ = session.logout();
    Ok(final_items)
}

#[tauri::command]
pub async fn sync_gmail_emails(
    limit: Option<usize>,
    deleted_ids: Option<Vec<String>>,
) -> Result<Vec<EmailItem>, String> {
    let _ = dotenvy::dotenv();
    let _ = dotenvy::from_filename("../.env");

    let fetch_limit = limit.unwrap_or(40);
    let deleted_set: std::collections::HashSet<String> = deleted_ids
        .unwrap_or_default()
        .into_iter()
        .collect();

    let mut all_emails = Vec::new();

    // Account 1
    if let (Ok(email), Ok(pass)) = (
        env::var("GMAIL_1_EMAIL"),
        env::var("GMAIL_1_APP_PASSWORD"),
    ) {
        if !email.trim().is_empty() && !pass.trim().is_empty() {
            match fetch_account_emails(email.trim(), pass.trim(), fetch_limit, &deleted_set) {
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
            match fetch_account_emails(email.trim(), pass.trim(), fetch_limit, &deleted_set) {
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
