export interface Bookmark {
  id: number;
  url: string;
  title: string;
  description?: string;
  tags?: string[]; // stored as JSON string in sqlite
  ai_notes?: string;
  created_at: string;
}

export type EmailCategoryTab = 'Primary' | 'Updates' | 'All';

export interface EmailThread {
  id: string;
  thread_id: string;
  sender: string;
  subject: string;
  snippet: string;
  body_html?: string;
  ai_summary?: string;
  category: 'Primary' | 'Updates' | 'Promotions' | 'Social' | string;
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
  framework?: string;
  live_url?: string;
  deployment_url?: string;
  last_commit_message?: string;
  last_commit_branch?: string;
  last_commit_author?: string;
  last_deployment_at?: string;
  latest_build_state?: string;
  last_status: 'healthy' | 'building' | 'failed' | 'warning' | 'unknown';
  last_checked_at: string;
  open_prs?: number;
  db_storage_used_pct?: number;
  metrics?: {
    latency_ms: number;
    error_rate: number;
  };
}

export type ActiveTab = 'inbox' | 'vault' | 'vercel' | 'settings';
