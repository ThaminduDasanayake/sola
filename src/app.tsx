import React, { useState, useEffect, useMemo } from 'react';
import './app.css';
import { TopBar } from './components/top-bar';
import { Sidebar } from './components/sidebar';
import { VaultFeed } from './components/vault-feed';
import { InboxFeed } from './components/inbox-feed';
import { PulseFeed } from './components/pulse-feed';
import { DetailPane } from './components/detail-pane';
import { QuickAddModal } from './components/quick-add-modal';
import { SettingsPage } from './components/settings-page';
import { fetchBookmarks, fetchEmails, fetchProjects, addBookmark, deleteEmail } from './services/db';
import { syncManager } from './services/sync-manager';
import type { Bookmark, EmailThread, ProjectTelemetry, ActiveTab, EmailCategoryTab } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [emails, setEmails] = useState<EmailThread[]>([]);
  const [projects, setProjects] = useState<ProjectTelemetry[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [categoryTab, setCategoryTab] = useState<EmailCategoryTab>('Primary');

  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailThread | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectTelemetry | null>(null);

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sola_sidebar_collapsed') === 'true';
    }
    return false;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncText, setLastSyncText] = useState<string>(syncManager.formatRelativeLastSync());

  const handleSync = async () => {
    setSyncError(null);
    try {
      const updated = await syncManager.triggerSync();
      if (updated.length > 0) {
        setEmails(updated);
        setSelectedEmail(updated[0]);
      }
    } catch (err: any) {
      setSyncError(typeof err === 'string' ? err : err?.message || 'Sync failed. Check .env');
    }
  };

  useEffect(() => {
    syncManager.init((updatedEmails) => {
      setEmails(updatedEmails);
      if (updatedEmails.length > 0 && !selectedEmail) {
        setSelectedEmail(updatedEmails[0]);
      }
    });

    const unsubscribe = syncManager.subscribe((syncing) => {
      setIsSyncing(syncing);
      setLastSyncText(syncManager.formatRelativeLastSync());
    });

    const interval = setInterval(() => {
      setLastSyncText(syncManager.formatRelativeLastSync());
    }, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    async function loadData() {
      const [bList, eList, pList] = await Promise.all([
        fetchBookmarks(searchQuery),
        fetchEmails(),
        fetchProjects(),
      ]);

      setBookmarks(bList);
      setEmails(eList);
      setProjects(pList);

      if (bList.length > 0 && !selectedBookmark) setSelectedBookmark(bList[0]);
      if (eList.length > 0 && !selectedEmail) setSelectedEmail(eList[0]);
      if (pList.length > 0 && !selectedProject) setSelectedProject(pList[0]);

      // If local emails are empty, run an automatic initial sync in the background
      if (eList.length === 0) {
        syncManager.triggerSync().catch((err) => {
          console.warn('Initial background sync error:', err);
        });
      }
    }

    loadData();
  }, [searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[type="text"]');
        searchInput?.focus();
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsQuickAddOpen(true);
      }

      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setActiveTab((prev) => (prev === 'settings' ? 'inbox' : 'settings'));
      }

      if (e.key === 'Escape') {
        setIsQuickAddOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAddBookmark = async (newBookmark: Omit<Bookmark, 'id' | 'created_at'>) => {
    const created = await addBookmark(newBookmark);
    setBookmarks((prev) => [created, ...prev]);
    setSelectedBookmark(created);
    setActiveTab('vault');
  };

  const handleDeleteEmail = async (id: string) => {
    setEmails((prev) => prev.filter((e) => e.id !== id));
    if (selectedEmail?.id === id) {
      const remaining = displayedCategoryEmails.filter((e) => e.id !== id);
      setSelectedEmail(remaining[0] ?? null);
    }
    await deleteEmail(id);
    syncManager.triggerSync().catch((err) => {
      console.warn('Backfill sync error:', err);
    });
  };

  const accounts = useMemo(() => {
    const set = new Set<string>();
    emails.forEach((e) => {
      if (e.account_email) set.add(e.account_email);
    });
    return Array.from(set);
  }, [emails]);

  const emailCountsByAccount = useMemo(() => {
    const counts: Record<string, { total: number; unread: number }> = {
      all: {
        total: emails.length,
        unread: emails.filter((e) => !e.is_read).length,
      },
    };
    accounts.forEach((acc) => {
      const accEmails = emails.filter((e) => e.account_email === acc);
      counts[acc] = {
        total: accEmails.length,
        unread: accEmails.filter((e) => !e.is_read).length,
      };
    });
    return counts;
  }, [emails, accounts]);

  const filteredEmails = useMemo(() => {
    if (selectedAccount === 'all') return emails;
    return emails.filter((e) => e.account_email === selectedAccount);
  }, [emails, selectedAccount]);

  const displayedCategoryEmails = useMemo(() => {
    const isPrimary = (e: EmailThread) => e.category === 'Primary' || e.category === 'Action';
    const isUpdates = (e: EmailThread) => e.category === 'Updates' || e.category === 'Dev' || e.category === 'Receipt';

    if (categoryTab === 'Primary') return filteredEmails.filter(isPrimary);
    if (categoryTab === 'Updates') return filteredEmails.filter(isUpdates);
    return filteredEmails;
  }, [filteredEmails, categoryTab]);

  useEffect(() => {
    if (displayedCategoryEmails.length > 0) {
      if (!selectedEmail || !displayedCategoryEmails.some((e) => e.id === selectedEmail.id)) {
        setSelectedEmail(displayedCategoryEmails[0]);
      }
    } else {
      setSelectedEmail(null);
    }
  }, [selectedAccount, categoryTab, displayedCategoryEmails]);

  const unreadCount = displayedCategoryEmails.filter((e) => !e.is_read).length;

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('sola_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#18181a] text-[#f5f5f7]">
      {/* Top Bar with 76px clearance for traffic lights & full-rounded controls */}
      <TopBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        onToggleSidebar={handleToggleSidebar}
        onSyncInbox={handleSync}
        isSyncing={isSyncing}
        activeTab={activeTab}
        lastSyncText={lastSyncText}
        accounts={accounts}
        selectedAccount={selectedAccount}
        onSelectAccount={setSelectedAccount}
        emailCountsByAccount={emailCountsByAccount}
      />

      {/* 3-Pane Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Pane 1: Sidebar with full-rounded circular selections */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isCollapsed={isSidebarCollapsed}
          bookmarkCount={bookmarks.length}
          unreadEmailCount={unreadCount}
          healthyProjectsCount={projects.length}
        />

        {/* Main Content Area */}
        {activeTab === 'settings' ? (
          <SettingsPage
            onBack={() => setActiveTab('inbox')}
            onSyncInbox={handleSync}
            isSyncing={isSyncing}
          />
        ) : (
          <>
            {/* Pane 2: List Feed */}
            <div className="w-72 border-r border-white/[0.08] bg-[#18181a] flex flex-col shrink-0">
              {syncError && activeTab === 'inbox' && (
                <div className="px-3 py-1.5 bg-red-500/10 border-b border-red-500/20 text-[11px] text-red-300">
                  {syncError}
                </div>
              )}

              {activeTab === 'inbox' && (
                <InboxFeed
                  emails={filteredEmails}
                  selectedId={selectedEmail?.id ?? null}
                  onSelect={setSelectedEmail}
                  selectedAccount={selectedAccount}
                  accounts={accounts}
                  onSelectAccount={setSelectedAccount}
                  lastSyncText={lastSyncText}
                  isSyncing={isSyncing}
                  categoryTab={categoryTab}
                  onCategoryChange={setCategoryTab}
                  onDeleteEmail={handleDeleteEmail}
                />
              )}

              {activeTab === 'vault' && (
                <VaultFeed
                  bookmarks={bookmarks}
                  selectedId={selectedBookmark?.id ?? null}
                  onSelect={setSelectedBookmark}
                />
              )}

              {activeTab === 'pulse' && (
                <PulseFeed
                  projects={projects}
                  selectedId={selectedProject?.id ?? null}
                  onSelect={setSelectedProject}
                />
              )}
            </div>

            {/* Pane 3: Detail View */}
            <div className="flex-1 bg-[#141416] flex flex-col overflow-hidden">
              {activeTab === 'inbox' && (
                <DetailPane item={selectedEmail} type="email" onDeleteEmail={handleDeleteEmail} />
              )}
              {activeTab === 'vault' && (
                <DetailPane item={selectedBookmark} type="bookmark" />
              )}
              {activeTab === 'pulse' && (
                <DetailPane item={selectedProject} type="project" />
              )}
            </div>
          </>
        )}
      </div>

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onAdd={handleAddBookmark}
      />
    </div>
  );
}

export default App;
