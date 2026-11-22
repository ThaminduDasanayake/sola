import Database from '@tauri-apps/plugin-sql';
import { invoke } from '@tauri-apps/api/core';
import type { Bookmark, EmailThread, ProjectTelemetry } from '../types';

let dbInstance: Database | null = null;

// Initial starter mock data
const INITIAL_BOOKMARKS: Bookmark[] = [
  {
    id: 1,
    url: 'https://github.com/tauri-apps/tauri',
    title: 'tauri-apps/tauri: Build smaller, faster, and more secure desktop applications',
    description: 'Tauri is a framework to build desktop and mobile applications with web frontends and Rust backends.',
    tags: ['rust', 'desktop', 'tauri', 'native'],
    ai_notes: 'Key architecture reference for WKWebView memory optimization and native IPC protocol.',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 2,
    url: 'https://sqlite.org/fts5.html',
    title: 'SQLite FTS5 Extension Documentation',
    description: 'SQLite full-text search engine module providing sub-millisecond keyword retrieval.',
    tags: ['sqlite', 'database', 'fts5', 'performance'],
    ai_notes: 'FTS5 virtual table implementation notes: BM25 ranking algorithm and prefix queries.',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 3,
    url: 'https://linear.app/method',
    title: 'The Linear Method: Practices for High-Performance Product Teams',
    description: 'Principles for modern, keyboard-first desktop interface design and snappy interactions.',
    tags: ['design', 'ux', 'macOS', 'keyboard-first'],
    ai_notes: 'Inspiration for Sola 3-pane layout, subtle borders, and low-latency interaction loops.',
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
  },
];

const INITIAL_EMAILS: EmailThread[] = [
  {
    id: 'em-1',
    thread_id: 'th-101',
    sender: 'GitHub Notifications <notifications@github.com>',
    subject: '[sola-core] PR #14 Merged: Upgrade WKWebView titleBarStyle overlay',
    snippet: 'All checks passed. 3 reviewers approved. Merged by main maintainer into release-v0.1.',
    ai_summary: 'PR #14 was approved and merged cleanly. Adds overlay title bar support for frameless windowing.',
    category: 'Dev',
    is_read: false,
    received_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    action_items: ['Tag release-v0.1.1 on GitHub', 'Update changelog with WKWebView changes'],
    due_date: 'Today, 6:00 PM',
  },
  {
    id: 'em-2',
    thread_id: 'th-102',
    sender: 'Pragmatic Engineer <newsletter@pragmaticengineer.com>',
    subject: 'Issue #184: The Renaissance of Local-First Software Architectures',
    snippet: 'Why top engineering teams are ditching heavy cloud dependencies in favor of client-side SQLite and CRDTs.',
    ai_summary: 'Deep dive into local-first architecture trends: 90% cloud cost reduction, offline resilience, and instant sub-10ms UI latency.',
    category: 'Newsletter',
    is_read: false,
    received_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    action_items: ['Review SQLite FTS5 synchronization patterns', 'Share with engineering team'],
  },
  {
    id: 'em-3',
    thread_id: 'th-103',
    sender: 'Stripe Billing <invoices@stripe.com>',
    subject: 'Invoice for Anthropic Claude & OpenAI API Usage - October',
    snippet: 'Your monthly invoice of $42.50 has been successfully paid via card ending in 4242.',
    ai_summary: 'Monthly AI inference API charges processed. Total: $42.50. No action required.',
    category: 'Receipt',
    is_read: true,
    received_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

const INITIAL_PROJECTS: ProjectTelemetry[] = [
  {
    id: 1,
    name: 'Sola Command Center',
    repo_slug: 'developer/sola-desktop',
    vercel_project_id: 'prj_sola_core',
    last_status: 'healthy',
    last_checked_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    open_prs: 2,
    db_storage_used_pct: 12,
    metrics: { latency_ms: 18, error_rate: 0.01 },
  },
  {
    id: 2,
    name: 'Neon Database Serverless',
    repo_slug: 'developer/api-service',
    vercel_project_id: 'prj_api_service',
    last_status: 'healthy',
    last_checked_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    open_prs: 0,
    db_storage_used_pct: 38,
    metrics: { latency_ms: 42, error_rate: 0.0 },
  },
];

export async function getDb(): Promise<Database | null> {
  if (dbInstance) return dbInstance;
  try {
    // Only available inside Tauri runtime
    dbInstance = await Database.load('sqlite:sola.db');
    return dbInstance;
  } catch (err) {
    console.info('Running in browser or outside Tauri runtime - using in-memory state.', err);
    return null;
  }
}

// In-memory cache for fast UI updates
let memoryBookmarks = [...INITIAL_BOOKMARKS];
let memoryEmails = [...INITIAL_EMAILS];
let memoryProjects = [...INITIAL_PROJECTS];

export async function fetchBookmarks(searchQuery = ''): Promise<Bookmark[]> {
  const db = await getDb();
  if (db) {
    try {
      if (searchQuery.trim()) {
        const rows = await db.select<any[]>(
          `SELECT b.* FROM bookmarks b
           JOIN bookmarks_fts f ON b.id = f.rowid
           WHERE bookmarks_fts MATCH ?
           ORDER BY b.created_at DESC`,
          [`${searchQuery.trim()}*`]
        );
        return rows.map((r) => ({
          ...r,
          tags: r.tags ? JSON.parse(r.tags) : [],
        }));
      }

      const rows = await db.select<any[]>('SELECT * FROM bookmarks ORDER BY created_at DESC');
      if (rows.length > 0) {
        return rows.map((r) => ({
          ...r,
          tags: r.tags ? JSON.parse(r.tags) : [],
        }));
      }
    } catch (err) {
      console.warn('SQLite read failed, falling back to cache:', err);
    }
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    return memoryBookmarks.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.url.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q) ||
        b.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }
  return memoryBookmarks;
}

export async function addBookmark(item: Omit<Bookmark, 'id' | 'created_at'>): Promise<Bookmark> {
  const newBookmark: Bookmark = {
    ...item,
    id: Date.now(),
    created_at: new Date().toISOString(),
  };

  const db = await getDb();
  if (db) {
    try {
      const res = await db.execute(
        `INSERT INTO bookmarks (url, title, description, tags, ai_notes) VALUES (?, ?, ?, ?, ?)`,
        [item.url, item.title, item.description || '', JSON.stringify(item.tags || []), item.ai_notes || '']
      );
      newBookmark.id = res.lastInsertId;

      // Index into FTS5
      await db.execute(
        `INSERT INTO bookmarks_fts (rowid, title, description, tags) VALUES (?, ?, ?, ?)`,
        [newBookmark.id, item.title, item.description || '', JSON.stringify(item.tags || [])]
      );
    } catch (e) {
      console.warn('SQLite insert failed:', e);
    }
  }

  memoryBookmarks = [newBookmark, ...memoryBookmarks];
  return newBookmark;
}

export async function fetchEmails(): Promise<EmailThread[]> {
  const db = await getDb();
  if (db) {
    try {
      const rows = await db.select<any[]>('SELECT * FROM emails ORDER BY received_at DESC');
      if (rows.length > 0) {
        return rows.map((r) => ({
          ...r,
          is_read: Boolean(r.is_read),
        }));
      }
    } catch (e) {
      console.warn('SQLite emails read failed:', e);
    }
  }
  return memoryEmails;
}

export async function fetchProjects(): Promise<ProjectTelemetry[]> {
  const db = await getDb();
  if (db) {
    try {
      const rows = await db.select<any[]>('SELECT * FROM projects ORDER BY last_checked_at DESC');
      if (rows.length > 0) return rows;
    } catch (e) {
      console.warn('SQLite projects read failed:', e);
    }
  }
  return memoryProjects;
}

export async function syncGmail(): Promise<EmailThread[]> {
  try {
    const fetched = await invoke<any[]>('sync_gmail_emails');
    if (fetched && fetched.length > 0) {
      memoryEmails = fetched;
      const db = await getDb();
      if (db) {
        for (const item of fetched) {
          try {
            await db.execute(
              `INSERT OR REPLACE INTO emails (id, thread_id, sender, subject, snippet, ai_summary, category, is_read, received_at, account_email)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                item.id,
                item.thread_id,
                item.sender,
                item.subject,
                item.snippet,
                item.ai_summary || '',
                item.category,
                item.is_read ? 1 : 0,
                item.received_at,
                item.account_email,
              ]
            );
          } catch (e) {
            console.warn('Error saving synced email to sqlite:', e);
          }
        }
      }
      return fetched;
    }
  } catch (err) {
    console.warn('Gmail sync error:', err);
    throw err;
  }
  return fetchEmails();
}
