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
import { fetchBookmarks, fetchEmails, fetchProjects, addBookmark, deleteEmails } from './services/db';
import { DeleteConfirmDialog } from './components/delete-confirm-dialog';
import { syncManager } from './services/sync-manager';
import type { Bookmark, EmailThread, ProjectTelemetry, ActiveTab, EmailCategoryTab } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [emails, setEmails] = useState<EmailThread[]>([]);
  const [projects, setProjects] = useState<ProjectTelemetry[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sola_selected_account') || 'all';
    }
    return 'all';
  });
  const [categoryTab, setCategoryTab] = useState<EmailCategoryTab>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sola_category_tab');
      if (saved === 'Primary' || saved === 'Updates' || saved === 'All') return saved;
    }
    return 'Primary';
  });

  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailThread | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectTelemetry | null>(null);

  const handleSelectEmail = (email: EmailThread | null) => {
    setSelectedEmail(email);
    if (typeof window !== 'undefined') {
      if (email) {
        localStorage.setItem('sola_selected_email_id', email.id);
      } else {
        localStorage.removeItem('sola_selected_email_id');
      }
    }
  };

  const handleCategoryChange = (tab: EmailCategoryTab) => {
    setCategoryTab(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sola_category_tab', tab);
    }
  };

  const handleSelectAccount = (acc: string) => {
    setSelectedAccount(acc);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sola_selected_account', acc);
    }
  };

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
        setSelectedEmail((prev) => {
          if (prev && updated.some((e) => e.id === prev.id)) {
            return updated.find((e) => e.id === prev.id) || prev;
          }
          const savedId = typeof window !== 'undefined' ? localStorage.getItem('sola_selected_email_id') : null;
          const target = (savedId && updated.find((e) => e.id === savedId)) || updated[0];
          if (typeof window !== 'undefined' && target) {
            localStorage.setItem('sola_selected_email_id', target.id);
          }
          return target;
        });
      }
    } catch (err: any) {
      setSyncError(typeof err === 'string' ? err : err?.message || 'Sync failed. Check .env');
    }
  };

  useEffect(() => {
    syncManager.init((updatedEmails) => {
      setEmails(updatedEmails);
      setSelectedEmail((prev) => {
        if (prev && updatedEmails.some((e) => e.id === prev.id)) {
          return updatedEmails.find((e) => e.id === prev.id) || prev;
        }
        const savedId = typeof window !== 'undefined' ? localStorage.getItem('sola_selected_email_id') : null;
        const target = (savedId && updatedEmails.find((e) => e.id === savedId)) || updatedEmails[0] || null;
        if (typeof window !== 'undefined' && target) {
          localStorage.setItem('sola_selected_email_id', target.id);
        }
        return target;
      });
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
      if (eList.length > 0) {
        const savedId = typeof window !== 'undefined' ? localStorage.getItem('sola_selected_email_id') : null;
        const target = (savedId && eList.find((e) => e.id === savedId)) || eList[0];
        setSelectedEmail(target);
      }
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

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    ids: string[];
  } | null>(null);
  const [isDeletingEmail, setIsDeletingEmail] = useState(false);

  const requestDeleteEmails = (target: string | string[]) => {
    const ids = Array.isArray(target) ? target : [target];
    if (ids.length === 0) return;
    setDeleteConfirm({
      isOpen: true,
      ids,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm || deleteConfirm.ids.length === 0) return;
    setIsDeletingEmail(true);
    try {
      const ids = deleteConfirm.ids;
      const idSet = new Set(ids);
      setEmails((prev) => prev.filter((e) => !idSet.has(e.id)));
      if (selectedEmail && idSet.has(selectedEmail.id)) {
        const remaining = displayedCategoryEmails.filter((e) => !idSet.has(e.id));
        const nextSelected = remaining[0] ?? null;
        handleSelectEmail(nextSelected);
      }
      await deleteEmails(ids);
      setDeleteConfirm(null);
      syncManager.triggerSync().catch((err) => {
        console.warn('Backfill sync error:', err);
      });
    } finally {
      setIsDeletingEmail(false);
    }
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
        const savedId = typeof window !== 'undefined' ? localStorage.getItem('sola_selected_email_id') : null;
        const matchingSaved = savedId ? displayedCategoryEmails.find((e) => e.id === savedId) : null;
        const next = matchingSaved || displayedCategoryEmails[0];
        setSelectedEmail(next);
        if (typeof window !== 'undefined' && next) {
          localStorage.setItem('sola_selected_email_id', next.id);
        }
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
        onSelectAccount={handleSelectAccount}
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
                  onSelect={handleSelectEmail}
                  selectedAccount={selectedAccount}
                  accounts={accounts}
                  onSelectAccount={handleSelectAccount}
                  lastSyncText={lastSyncText}
                  isSyncing={isSyncing}
                  categoryTab={categoryTab}
                  onCategoryChange={handleCategoryChange}
                  onDeleteEmail={requestDeleteEmails}
                  onDeleteEmails={requestDeleteEmails}
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
                <DetailPane item={selectedEmail} type="email" onDeleteEmail={requestDeleteEmails} />
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

      {/* Delete Verification Dialog */}
      <DeleteConfirmDialog
        isOpen={Boolean(deleteConfirm?.isOpen)}
        count={deleteConfirm?.ids.length ?? 0}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm(null)}
        isDeleting={isDeletingEmail}
      />
    </div>
  );
}

export default App;
