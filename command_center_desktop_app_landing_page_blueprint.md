# Project Blueprint: Local-First macOS Command Center + Showcase Landing Page

App Name: Sola

A lightweight, native-feeling macOS desktop workspace built with **Tauri v2**, **React**, **TypeScript**, and **SQLite**—paired with a zero-backend **showcase landing page** designed to convert recruiter clicks into interviews without requiring binary downloads.

---

## 1. Architecture Overview

Instead of maintaining cloud servers or paying for database hosting, everything runs **locally on your Mac** with direct API calls to your existing services:

- **Desktop Shell:** Tauri v2 (Rust backend + macOS `WKWebView` frontend, ~30 MB idle RAM)
- **Frontend UI:** Vite + React + TypeScript + Tailwind CSS + your existing UI component library
- **Local Storage:** SQLite (`@tauri-apps/plugin-sql`) with `FTS5` Full-Text Search for instant sub-10ms filtering
- **AI & TTS Engine:**
  - **Categorization & Summaries:** Google Gemini API (`@ai-sdk/google` with structured Zod schemas)
  - **Text-to-Speech (TTS):** Native macOS speech synthesis (`window.speechSynthesis` or `tauri-plugin-tts`) for zero-cost offline audio briefings
- **Showcase Website:** Next.js or Astro static site deployed free on Vercel/Cloudflare Pages featuring an interactive UI demo, 45-second video walkthrough, and architecture breakdown.

---

## 2. Core Desktop Features (Scoped for Completion)

### Module A: Smart Inbox & Newsletter Digest

- **Hybrid Filtering:** Deterministic rules catch automated notifications (GitHub, Vercel, receipts) first so only human threads and long newsletters hit Gemini.
- **Structured AI Triage:** Summarizes long threads into 3-bullet TL;DRs, assigns categories (`Action Required`, `Newsletter`, `Dev Alerts`, `Receipts`), and extracts due dates.
- **Audio Morning Briefing:** Click **"Read Digest"** to have macOS Text-to-Speech read through your top priority emails and newsletter summaries hands-free while you drink coffee.

### Module B: Global-Hotkey Link & Repo Vault

- **Instant Capture (`Cmd + Shift + S`):** Triggered from anywhere on macOS via `@tauri-apps/plugin-global-shortcut`. Grabs the clipboard or active browser URL automatically.
- **Auto-Enrichment:** Fetches OpenGraph metadata and GitHub README snippets in the background, auto-tags by topic via Gemini, and indexes into local SQLite `FTS5`.

### Module C: Live Dev & Deployment Pulse

- **Unified Status Bar:** Polls GitHub (open PRs, review requests) and Vercel/Neon APIs on a background interval.
- **Native Notifications:** Fires a macOS system alert only when a production build fails or a database approaches free-tier limits.

---

## 3. Local SQLite Database Schema

Create a migration file (`src-tauri/migrations/001_init.sql`) to initialize your local tables:

```sql
-- 1. Triaged Emails & Newsletters
CREATE TABLE IF NOT EXISTS emails (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    sender TEXT NOT NULL,
    subject TEXT NOT NULL,
    snippet TEXT,
    ai_summary TEXT,
    category TEXT DEFAULT 'Uncategorized', -- 'Action', 'Newsletter', 'Dev', 'Receipt'
    is_read INTEGER DEFAULT 0,
    received_at DATETIME NOT NULL
);

-- 2. Saved Bookmarks & GitHub Repos
CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    tags TEXT, -- JSON array of tags e.g. '["react", "performance"]'
    ai_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Full-Text Search Virtual Table for Instant Search
CREATE VIRTUAL TABLE IF NOT EXISTS bookmarks_fts USING fts5(
    title,
    description,
    tags,
    content='bookmarks',
    content_rowid='id'
);

-- 3. Monitored Projects & Deployments
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    repo_slug TEXT, -- e.g. 'username/repo'
    vercel_project_id TEXT,
    last_status TEXT DEFAULT 'unknown',
    last_checked_at DATETIME
);
```

---

## 4. Step-by-Step Build Roadmap

### Phase 1: Project Scaffold & macOS Window Polish (Days 1–2)

1. **Initialize Tauri v2 + React + TypeScript:**

   ```bash
   pnpm create tauri-app command-center --template react-ts
   cd command-center
   pnpm install
   ```
2. **Install Essential Tauri Plugins:**

   ```bash
   pnpm tauri add sql global-shortcut notification http os
   ```
3. **Configure Native macOS Styling (`src-tauri/tauri.conf.json`):**
   - Set `"titleBarStyle": "Overlay"` and `"hiddenTitle": true` on the main window for a modern, frameless macOS look (like Linear or Raycast).
   - Add a `32px` top drag region (`data-tauri-drag-region`) in your React header so you can move the window seamlessly.
4. **Integrate Your UI Library:** Drop in Tailwind CSS and your existing React component library. Build the main 3-pane layout (Sidebar navigation, List feed, Detail/Reader pane).

### Phase 2: Link Vault + Global Hotkey + TTS (Days 3–5)

1. **Register Global Shortcut:** Bind `Cmd + Shift + Space` to toggle window visibility and `Cmd + Shift + S` to quick-save a URL from your clipboard.
2. **Build Metadata Scraper & AI Tagger:** When a URL is saved, fetch the HTML `<title>` and `<meta name="description">`, pass it to Gemini with a Zod schema to generate 3–5 clean tags, and save to SQLite.
3. **Wire Up Text-to-Speech:**

   ```typescript
   export function speakText(text: string, rate = 1.05) {
     window.speechSynthesis.cancel();
     const utterance = new SpeechSynthesisUtterance(text);
     const voices = window.speechSynthesis.getVoices();
     // Prefer high-quality macOS voices like Samantha, Daniel, or Ava
     utterance.voice =
       voices.find(
         (v) => v.name.includes("Ava") || v.name.includes("Samantha"),
       ) || voices[0];
     utterance.rate = rate;
     window.speechSynthesis.speak(utterance);
   }
   ```

### Phase 3: Project Telemetry & Email Triage (Days 6–10)

1. **GitHub & Vercel Polling:** Store personal access tokens securely (or in a local `.env` / macOS Keychain). Poll endpoints every 10 minutes via a React hook or Rust background task and update the `projects` SQLite table.
2. **Gmail / IMAP Sync:**
   - Connect via Google OAuth (desktop loopback flow) to fetch unread messages from the past 7 days.
   - Run rule-based matching first (e.g., `from:notifications@github.com` → `Dev`).
   - Batch remaining unread threads to Gemini to generate 1-sentence summaries and extract action items.

### Phase 4: Build the Showcase Landing Page (Days 11–12)

Since recruiters won't download a `.dmg` file during a 30-second resume scan, build a single-page showcase site (`apps/landing` or a separate repo) and deploy it to Vercel:

1. **Hero Section:** Crisp headline (_"A local-first macOS command center for inbox triage, link indexing, and deployment telemetry"_), tech badges (`Tauri v2`, `Rust`, `React`, `SQLite`, `Gemini`), and a **GitHub Source** button.
2. **45-Second Demo Video (Crucial):** Record a high-DPI (`1080p 60fps`) screen capture using macOS QuickTime or Screen Studio showing:
   - Triggering the app via global hotkey
   - Saving a link and searching it instantaneously
   - Clicking **"Read Morning Digest"** and hearing the TTS summary
   - Inspecting a live GitHub/Vercel deployment status
3. **Interactive Web Preview (Optional High-Impact Touch):** Embed a read-only React mockup of your desktop UI pre-loaded with realistic dummy data so visitors can click tabs and test the interface directly in their browser.
4. **Architecture & Performance Benchmarks:** Display real metrics from Activity Monitor (e.g., _~34 MB idle RAM vs. 160 MB Electron_, _<8ms SQLite FTS5 search latency_).

---

## 5. Resume Bullet Points (Ready to Customize)

- **Engineered a local-first macOS desktop workspace** using **Tauri v2, Rust, React, and TypeScript**, achieving an idle memory footprint under **40 MB** (75% lighter than comparable Electron applications).
- **Implemented an offline-capable SQLite (`FTS5`) storage engine** with global OS hotkeys and native macOS Text-to-Speech synthesis to index bookmarks and deliver hands-free daily email briefings.
- **Built an automated AI triage pipeline** combining deterministic regex rules with structured **Gemini** outputs to classify incoming email threads, summarize newsletters, and monitor live GitHub/Vercel deployment statuses.
