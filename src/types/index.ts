export interface Bookmark {
  id: number;
  url: string;
  title: string;
  description?: string;
  tags?: string[]; // stored as JSON string in sqlite
  ai_notes?: string;
  created_at: string;
}

export interface EmailThread {
  id: string;
  thread_id: string;
  sender: string;
  subject: string;
  snippet: string;
  ai_summary?: string;
  category: 'Action' | 'Newsletter' | 'Dev' | 'Receipt' | 'Uncategorized';
  is_read: boolean;
  received_at: string;
  account_email?: string;
  action_items?: string[];
  due_date?: string;
}

export interface ProjectTelemetry {
  id: number;
  name: string;
  repo_slug?: string;
  vercel_project_id?: string;
  last_status: 'healthy' | 'building' | 'failed' | 'warning' | 'unknown';
  last_checked_at: string;
  open_prs?: number;
  db_storage_used_pct?: number;
  metrics?: {
    latency_ms: number;
    error_rate: number;
  };
}

export type ActiveTab = 'vault' | 'inbox' | 'pulse';
