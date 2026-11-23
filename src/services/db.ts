import Database from '@tauri-apps/plugin-sql';
import { invoke } from '@tauri-apps/api/core';
import type { Bookmark, EmailThread, ProjectTelemetry } from '../types';

let dbInstance: Database | null = null;

// In-memory data collections (starts completely empty, populated via sync/user input)
const INITIAL_BOOKMARKS: Bookmark[] = [];
const INITIAL_EMAILS: EmailThread[] = [];
const INITIAL_PROJECTS: ProjectTelemetry[] = [];

export async function getDb(): Promise<Database | null> {
  if (dbInstance) return dbInstance;
  try {
    // Only available inside Tauri runtime
    dbInstance = await Database.load('sqlite:sola.db');

    // Ensure emails table exists and has all required columns
    await dbInstance.execute(`
      CREATE TABLE IF NOT EXISTS emails (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        sender TEXT NOT NULL,
        subject TEXT NOT NULL,
        snippet TEXT,
        ai_summary TEXT,
        category TEXT DEFAULT 'Primary',
        is_read INTEGER DEFAULT 0,
        received_at DATETIME NOT NULL,
        account_email TEXT
      );
    `);

    // In case the table was created by an older migration without account_email or category
    try {
      await dbInstance.execute('ALTER TABLE emails ADD COLUMN account_email TEXT;');
    } catch {
      // Column already exists
    }

    try {
      await dbInstance.execute('ALTER TABLE emails ADD COLUMN category TEXT DEFAULT "Primary";');
    } catch {
      // Column already exists
    }

    return dbInstance;
  } catch (err) {
    console.info('Running in browser or outside Tauri runtime - using in-memory state.', err);
    return null;
  }
}

// In-memory cache for fast UI updates
let memoryBookmarks: Bookmark[] = [];
let memoryEmails: EmailThread[] = [];
let memoryProjects: ProjectTelemetry[] = [];

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
      const rows = await db.select<any[]>(
        `SELECT * FROM emails ORDER BY received_at DESC`
      );
      if (rows && rows.length > 0) {
        const mapped: EmailThread[] = rows
          .filter((r) => r.category !== 'Promotions' && r.category !== 'Social' && r.category !== 'Forums')
          .map((r) => ({
            id: r.id,
            thread_id: r.thread_id,
            sender: r.sender,
            subject: r.subject,
            snippet: r.snippet || '',
            ai_summary: r.ai_summary || undefined,
            category: r.category || 'Primary',
            is_read: Boolean(r.is_read),
            received_at: r.received_at,
            account_email: r.account_email || '',
          }));
        memoryEmails = mapped;
        // Keep localStorage offline snapshot in sync
        if (typeof window !== 'undefined' && mapped.length > 0) {
          try {
            localStorage.setItem('sola_cached_emails', JSON.stringify(mapped));
          } catch {}
        }
        return mapped;
      }
    } catch (e) {
      console.warn('SQLite emails read failed:', e);
    }
  }

  // Fallback to localStorage offline snapshot
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('sola_cached_emails');
      if (cached) {
        const parsed: EmailThread[] = JSON.parse(cached);
        if (parsed.length > 0) {
          memoryEmails = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to read localStorage cached emails:', e);
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

export async function fetchDeletedEmailIds(): Promise<string[]> {
  const db = await getDb();
  if (db) {
    try {
      await db.execute(
        `CREATE TABLE IF NOT EXISTS deleted_emails (
          id TEXT PRIMARY KEY,
          deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`
      );
      const rows = await db.select<{ id: string }[]>('SELECT id FROM deleted_emails');
      return rows.map((r) => r.id);
    } catch (e) {
      console.warn('Failed to fetch deleted email ids:', e);
    }
  }
  return [];
}

export async function deleteEmail(id: string): Promise<void> {
  await deleteEmails([id]);
}

export async function deleteEmails(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  memoryEmails = memoryEmails.filter((e) => !idSet.has(e.id));
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('sola_cached_emails', JSON.stringify(memoryEmails));
    } catch {}
  }
  const db = await getDb();
  if (db) {
    try {
      const placeholders = ids.map(() => '?').join(',');
      await db.execute(`DELETE FROM emails WHERE id IN (${placeholders})`, ids);
      const now = new Date().toISOString();
      for (const id of ids) {
        await db.execute(
          'INSERT OR REPLACE INTO deleted_emails (id, deleted_at) VALUES (?, ?)',
          [id, now]
        );
      }
    } catch (e) {
      console.warn('Failed to delete emails from SQLite:', e);
    }
  }
}

export async function getDatabasePath(): Promise<string> {
  try {
    return await invoke<string>('get_database_path');
  } catch {
    return 'sola.db (project root)';
  }
}

export async function revealDatabaseInFinder(): Promise<void> {
  try {
    await invoke('reveal_database');
  } catch (e) {
    console.warn('Failed to reveal database:', e);
  }
}

export async function syncGmail(limit?: number): Promise<EmailThread[]> {
  try {
    const savedLimit = typeof window !== 'undefined' ? parseInt(localStorage.getItem('sola_email_limit') || '40', 10) : 40;
    const fetchLimit = limit ?? savedLimit;
    const deletedIds = await fetchDeletedEmailIds();
    const fetched = await invoke<any[]>('sync_gmail_emails', {
      limit: fetchLimit,
      deletedIds: deletedIds,
    });
    if (fetched && fetched.length > 0) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('sola_last_sync_time', Date.now().toString());
      }
      // Normalize dates to ISO-8601 for accurate SQLite sorting
      fetched.forEach((item) => {
        if (!isNaN(Date.parse(item.received_at))) {
          item.received_at = new Date(item.received_at).toISOString();
        }
      });
      // Sort newest first
      fetched.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
      memoryEmails = fetched;

      // Always save to localStorage offline snapshot
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('sola_cached_emails', JSON.stringify(fetched));
        } catch {}
      }

      const db = await getDb();
      if (db) {
        // Clean out any legacy or promotional/social/forum emails
        try {
          await db.execute(
            `DELETE FROM emails WHERE category NOT IN ('Primary', 'Updates', 'Action', 'Dev', 'Receipt')`
          );
        } catch (e) {
          console.warn('Could not prune non-primary categories:', e);
        }

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
                item.category || 'Primary',
                item.is_read ? 1 : 0,
                item.received_at,
                item.account_email || '',
              ]
            );
          } catch (e) {
            console.error('Error saving synced email to sqlite:', e);
          }
        }
      }
      return fetched;
    }
  } catch (err) {
    console.warn('Gmail sync error (offline or network):', err);
    // When offline without WiFi, do NOT throw and lose local emails! Return existing emails!
    const existing = await fetchEmails();
    if (existing.length > 0) {
      return existing;
    }
    throw err;
  }
  return fetchEmails();
}
