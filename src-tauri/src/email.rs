use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EmailItem {
    pub id: String,
    pub thread_id: String,
    pub sender: String,
    pub subject: String,
    pub snippet: String,
    pub body_html: Option<String>,
    pub ai_summary: Option<String>,
    pub category: String,
    pub is_read: bool,
    pub received_at: String,
    pub account_email: String,
}

fn strip_html_tags(html: &str) -> String {
    let mut result = String::with_capacity(html.len());
    let mut in_tag = false;
    let mut in_script_or_style = false;
    let mut tag_buffer = String::new();

    for c in html.chars() {
        if c == '<' {
            in_tag = true;
            tag_buffer.clear();
        } else if c == '>' {
            in_tag = false;
            let tag_name = tag_buffer.trim().to_lowercase();
            if tag_name.starts_with("script") || tag_name.starts_with("style") {
                in_script_or_style = true;
            } else if tag_name.starts_with("/script") || tag_name.starts_with("/style") {
                in_script_or_style = false;
            } else if tag_name.starts_with("br")
                || tag_name.starts_with("/p")
                || tag_name.starts_with("/div")
                || tag_name.starts_with("/tr")
                || tag_name.starts_with("/li")
                || tag_name.starts_with("/h")
            {
                result.push('\n');
            }
            tag_buffer.clear();
        } else if in_tag {
            if tag_buffer.len() < 30 {
                tag_buffer.push(c);
            }
        } else if !in_script_or_style {
            result.push(c);
        }
    }

    let decoded = result
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&apos;", "'");

    decoded
        .lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .collect::<Vec<_>>()
        .join("\n")
}

pub fn extract_clean_body(mail: &mailparse::ParsedMail) -> String {
    fn find_text(part: &mailparse::ParsedMail, prefer_plain: bool) -> Option<String> {
        let mime = part.ctype.mimetype.to_lowercase();

        if part.subparts.is_empty() {
            if prefer_plain && mime.starts_with("text/plain") {
                if let Ok(body) = part.get_body() {
                    let trimmed = body.trim().to_string();
                    if !trimmed.is_empty() {
                        return Some(trimmed);
                    }
                }
            } else if !prefer_plain && mime.starts_with("text/html") {
                if let Ok(body) = part.get_body() {
                    let cleaned = strip_html_tags(&body);
                    if !cleaned.is_empty() {
                        return Some(cleaned);
                    }
                }
            }
            return None;
        }

        // Search subparts
        for sub in &part.subparts {
            if let Some(text) = find_text(sub, prefer_plain) {
                return Some(text);
            }
        }

        None
    }

    // 1. Try finding text/plain first
    if let Some(plain) = find_text(mail, true) {
        return plain;
    }

    // 2. Try finding text/html and strip tags
    if let Some(html) = find_text(mail, false) {
        return html;
    }

    // 3. Fallback: single-part body direct decode
    if let Ok(body) = mail.get_body() {
        let trimmed = body.trim();
        if !trimmed.is_empty() {
            if mail.ctype.mimetype.starts_with("text/html") {
                return strip_html_tags(trimmed);
            }
            return trimmed.to_string();
        }
    }

    String::new()
}

pub fn extract_html_body(mail: &mailparse::ParsedMail) -> Option<String> {
    fn find_html(part: &mailparse::ParsedMail) -> Option<String> {
        let mime = part.ctype.mimetype.to_lowercase();
        if part.subparts.is_empty() {
            if mime.starts_with("text/html") {
                if let Ok(body) = part.get_body() {
                    let trimmed = body.trim().to_string();
                    if !trimmed.is_empty() {
                        return Some(trimmed);
                    }
                }
            }
            return None;
        }

        for sub in &part.subparts {
            if let Some(html) = find_html(sub) {
                return Some(html);
            }
        }

        None
    }

    if let Some(html) = find_html(mail) {
        return Some(html);
    }

    if mail.ctype.mimetype.to_lowercase().starts_with("text/html") {
        if let Ok(body) = mail.get_body() {
            let trimmed = body.trim().to_string();
            if !trimmed.is_empty() {
                return Some(trimmed);
            }
        }
    }

    None
}

pub fn parse_email_message(
    uid: u32,
    header_bytes: &[u8],
    body_bytes: &[u8],
) -> (String, String, String, String, String, Option<String>) {
    let mut full_msg = Vec::with_capacity(header_bytes.len() + 4 + body_bytes.len());
    full_msg.extend_from_slice(header_bytes);
    full_msg.extend_from_slice(b"\r\n\r\n");
    full_msg.extend_from_slice(body_bytes);

    let (subject, from, date_str, message_id, clean_body, body_html) =
        if let Ok(parsed_mail) = mailparse::parse_mail(&full_msg) {
            let mut subject = String::from("(No Subject)");
            let mut from = String::from("Unknown");
            let mut date_str = String::new();
            let mut message_id = format!("uid-{}", uid);

            for header in &parsed_mail.headers {
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

            let body = extract_clean_body(&parsed_mail);
            let html = extract_html_body(&parsed_mail);
            (subject, from, date_str, message_id, body, html)
        } else {
            let parsed_headers = mailparse::parse_mail(header_bytes).ok();
            let mut subject = String::from("(No Subject)");
            let mut from = String::from("Unknown");
            let mut date_str = String::new();
            let mut message_id = format!("uid-{}", uid);

            if let Some(h) = parsed_headers {
                for header in h.headers {
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
            }

            let raw = String::from_utf8_lossy(body_bytes);
            (subject, from, date_str, message_id, raw.to_string(), None)
        };

    let clean_snippet = {
        let cleaned_lines: Vec<&str> = clean_body
            .lines()
            .map(|l| l.trim())
            .filter(|l| {
                !l.is_empty()
                    && !l.starts_with("--")
                    && !l.starts_with("Content-Type:")
                    && !l.starts_with("Content-Transfer-Encoding:")
                    && !l.starts_with("charset=")
            })
            .collect();

        if cleaned_lines.is_empty() {
            subject.clone()
        } else {
            let full_text = cleaned_lines.join("\n");
            if full_text.len() > 3000 {
                format!("{}...", &full_text[..3000])
            } else {
                full_text
            }
        }
    };

    (
        subject,
        from,
        date_str,
        message_id,
        clean_snippet,
        body_html,
    )
}

pub fn categorize_email(from: &str, subject: &str) -> String {
    let lower_sender = from.to_lowercase();
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

    let socket_addr = std::net::ToSocketAddrs::to_socket_addrs(&("imap.gmail.com", 993))
        .map_err(|e| format!("DNS lookup failed for imap.gmail.com: {}", e))?
        .next()
        .ok_or_else(|| "No IP addresses found for imap.gmail.com".to_string())?;

    let stream =
        std::net::TcpStream::connect_timeout(&socket_addr, std::time::Duration::from_secs(8))
            .map_err(|e| format!("Failed to connect to imap.gmail.com: {}", e))?;

    let _ = stream.set_read_timeout(Some(std::time::Duration::from_secs(12)));
    let _ = stream.set_write_timeout(Some(std::time::Duration::from_secs(12)));

    let tls_stream = tls
        .connect("imap.gmail.com", stream)
        .map_err(|e| format!("TLS connection failed: {}", e))?;

    let client = imap::Client::new(tls_stream);

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
                let body_bytes = msg.text().unwrap_or_default();

                let (subject, from, date_str, message_id, clean_snippet, body_html) =
                    parse_email_message(uid, header_bytes, body_bytes);

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

                let is_seen = msg
                    .flags()
                    .iter()
                    .any(|f| matches!(f, imap::types::Flag::Seen));

                let item = EmailItem {
                    id: message_id,
                    thread_id: format!("th-{}", uid),
                    sender: from,
                    subject,
                    snippet: clean_snippet,
                    body_html,
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
            let body_bytes = msg.text().unwrap_or_default();

            let (subject, from, date_str, message_id, clean_snippet, body_html) =
                parse_email_message(uid, header_bytes, body_bytes);

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

            let is_seen = msg
                .flags()
                .iter()
                .any(|f| matches!(f, imap::types::Flag::Seen));

            let item = EmailItem {
                id: message_id,
                thread_id: format!("th-{}", uid),
                sender: from,
                subject,
                snippet: clean_snippet,
                body_html,
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
    let deleted_set: std::collections::HashSet<String> =
        deleted_ids.unwrap_or_default().into_iter().collect();

    let mut all_emails = Vec::new();
    let mut errors = Vec::new();

    // Account 1
    if let (Ok(email), Ok(pass)) = (env::var("GMAIL_1_EMAIL"), env::var("GMAIL_1_APP_PASSWORD")) {
        if !email.trim().is_empty() && !pass.trim().is_empty() {
            match fetch_account_emails(email.trim(), pass.trim(), fetch_limit, &deleted_set) {
                Ok(mut list) => all_emails.append(&mut list),
                Err(err) => {
                    eprintln!("Error fetching emails for {}: {}", email, err);
                    errors.push(format!("{}: {}", email, err));
                }
            }
        }
    }

    // Account 2
    if let (Ok(email), Ok(pass)) = (env::var("GMAIL_2_EMAIL"), env::var("GMAIL_2_APP_PASSWORD")) {
        if !email.trim().is_empty() && !pass.trim().is_empty() {
            match fetch_account_emails(email.trim(), pass.trim(), fetch_limit, &deleted_set) {
                Ok(mut list) => all_emails.append(&mut list),
                Err(err) => {
                    eprintln!("Error fetching emails for {}: {}", email, err);
                    errors.push(format!("{}: {}", email, err));
                }
            }
        }
    }

    if all_emails.is_empty() {
        if !errors.is_empty() {
            return Err(errors.join(" | "));
        }
        return Err(
            "No Gmail accounts configured in .env. Check GMAIL_1_EMAIL and GMAIL_1_APP_PASSWORD."
                .to_string(),
        );
    }

    Ok(all_emails)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_multipart_email_parsing() {
        let raw = b"From: vercel@example.com\r\n\
Subject: Preview deployment failed\r\n\
Content-Type: multipart/alternative; boundary=\"boundary123\"\r\n\
\r\n\
--boundary123\r\n\
Content-Type: text/plain; charset=UTF-8\r\n\
Content-Transfer-Encoding: 7bit\r\n\
\r\n\
Preview deployment failed for your project sola on commit abc1234.\r\n\
Please check the logs.\r\n\
\r\n\
--boundary123\r\n\
Content-Type: text/html; charset=utf-8\r\n\
Content-Transfer-Encoding: quoted-printable\r\n\
\r\n\
<html><body><p>Preview deployment failed</p></body></html>\r\n\
--boundary123--\r\n";

        let parsed = mailparse::parse_mail(raw).unwrap();
        let body = extract_clean_body(&parsed);
        let html = extract_html_body(&parsed);
        eprintln!("Extracted body:\n{}", body);
        assert!(!body.contains("Content-Type"));
        assert!(!body.contains("Content-Transfer-Encoding"));
        assert!(body.contains("Preview deployment failed for your project sola"));
        assert!(html.is_some());
        assert!(html.unwrap().contains("<p>Preview deployment failed</p>"));
    }
}
