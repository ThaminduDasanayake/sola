import { syncGmail } from './db';
import type { EmailThread } from '../types';

type SyncListener = (isSyncing: boolean, lastSyncTime: number | null) => void;

class SyncManager {
  private isSyncing = false;
  private lastSyncTime: number | null = null;
  private listeners: Set<SyncListener> = new Set();
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private onEmailsUpdated: ((emails: EmailThread[]) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sola_last_sync_time');
      if (saved) {
        this.lastSyncTime = parseInt(saved, 10);
      }
    }
  }

  init(onUpdate: (emails: EmailThread[]) => void) {
    this.onEmailsUpdated = onUpdate;
    this.scheduleNext530AM();
    this.checkIfMorningSyncMissed();
  }

  subscribe(listener: SyncListener) {
    this.listeners.add(listener);
    listener(this.isSyncing, this.lastSyncTime);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.isSyncing, this.lastSyncTime);
    }
  }

  getLastSyncTime(): number | null {
    return this.lastSyncTime;
  }

  getIsSyncing(): boolean {
    return this.isSyncing;
  }

  async triggerSync(limit?: number): Promise<EmailThread[]> {
    if (this.isSyncing) return [];
    this.isSyncing = true;
    this.notify();

    try {
      const emails = await syncGmail(limit);
      this.lastSyncTime = Date.now();
      if (typeof window !== 'undefined') {
        localStorage.setItem('sola_last_sync_time', this.lastSyncTime.toString());
      }
      if (this.onEmailsUpdated && emails.length > 0) {
        this.onEmailsUpdated(emails);
      }
      return emails;
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  /**
   * Schedules the next automatic sync at 5:30 AM local time
   */
  private scheduleNext530AM() {
    if (this.timerId) {
      clearTimeout(this.timerId);
    }

    const now = new Date();
    const next530 = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      5,
      30,
      0,
      0
    );

    // If 5:30 AM has already passed today, target tomorrow's 5:30 AM
    if (now.getTime() >= next530.getTime()) {
      next530.setDate(next530.getDate() + 1);
    }

    const msUntil530 = next530.getTime() - now.getTime();
    console.info(`Next 5:30 AM auto-sync scheduled in ${Math.round(msUntil530 / 1000 / 60)} minutes.`);

    this.timerId = setTimeout(async () => {
      console.info('Running scheduled 5:30 AM morning email auto-sync...');
      try {
        await this.triggerSync();
      } catch (err) {
        console.warn('Scheduled morning sync failed:', err);
      }
      // Re-schedule for the next day
      this.scheduleNext530AM();
    }, msUntil530);
  }

  /**
   * If the app starts up after 5:30 AM today, but hasn't synced since before 5:30 AM,
   * run the morning sync immediately.
   */
  private checkIfMorningSyncMissed() {
    const now = new Date();
    const today530 = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      5,
      30,
      0,
      0
    ).getTime();

    // If current time is past 5:30 AM today
    if (now.getTime() > today530) {
      // And we haven't synced today after 5:30 AM
      if (!this.lastSyncTime || this.lastSyncTime < today530) {
        console.info('Missed 5:30 AM sync detected. Running morning sync now...');
        this.triggerSync();
      }
    }
  }

  /**
   * Formats how long ago the last sync occurred (e.g. "Just now", "4m ago", "2h ago")
   */
  formatRelativeLastSync(): string {
    if (!this.lastSyncTime) return 'Never synced';
    const diffSec = Math.max(0, Math.floor((Date.now() - this.lastSyncTime) / 1000));
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }
}

export const syncManager = new SyncManager();
