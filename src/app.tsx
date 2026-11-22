import React, { useState, useEffect } from 'react';
import './app.css';
import { TopBar } from './components/top-bar';
import { Sidebar } from './components/sidebar';
import { VaultFeed } from './components/vault-feed';
import { InboxFeed } from './components/inbox-feed';
import { PulseFeed } from './components/pulse-feed';
import { DetailPane } from './components/detail-pane';
import { QuickAddModal } from './components/quick-add-modal';
import { SettingsModal } from './components/settings-modal';
import { fetchBookmarks, fetchEmails, fetchProjects, addBookmark, syncGmail } from './services/db';
import type { Bookmark, EmailThread, ProjectTelemetry, ActiveTab } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [emails, setEmails] = useState<EmailThread[]>([]);
  const [projects, setProjects] = useState<ProjectTelemetry[]>([]);

  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailThread | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectTelemetry | null>(null);

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const updated = await syncGmail();
      setEmails(updated);
      if (updated.length > 0) {
        setSelectedEmail(updated[0]);
      }
    } catch (err: any) {
      setSyncError(typeof err === 'string' ? err : err?.message || 'Sync failed. Check .env');
    } finally {
      setIsSyncing(false);
    }
  };

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

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setIsQuickAddOpen(true);
      }

      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(true);
      }

      if (e.key === 'Escape') {
        setIsQuickAddOpen(false);
        setIsSettingsOpen(false);
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

  const unreadCount = emails.filter((e) => !e.is_read).length;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#18181a] text-[#f5f5f7]">
      {/* Top Bar with 76px clearance for traffic lights & full-rounded controls */}
      <TopBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSyncInbox={handleSync}
        isSyncing={isSyncing}
        activeTab={activeTab}
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

        {/* Pane 2: List Feed */}
        <div className="w-72 border-r border-white/[0.08] bg-[#18181a] flex flex-col shrink-0">
          {syncError && activeTab === 'inbox' && (
            <div className="px-3 py-1.5 bg-red-500/10 border-b border-red-500/20 text-[11px] text-red-300">
              {syncError}
            </div>
          )}

          {activeTab === 'inbox' && (
            <InboxFeed
              emails={emails}
              selectedId={selectedEmail?.id ?? null}
              onSelect={setSelectedEmail}
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
            <DetailPane item={selectedEmail} type="email" />
          )}
          {activeTab === 'vault' && (
            <DetailPane item={selectedBookmark} type="bookmark" />
          )}
          {activeTab === 'pulse' && (
            <DetailPane item={selectedProject} type="project" />
          )}
        </div>
      </div>

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onAdd={handleAddBookmark}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
