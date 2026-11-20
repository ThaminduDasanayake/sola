import React, { useState, useEffect } from 'react';
import './app.css';
import { TopBar } from './components/top-bar';
import { Sidebar } from './components/sidebar';
import { VaultFeed } from './components/vault-feed';
import { InboxFeed } from './components/inbox-feed';
import { PulseFeed } from './components/pulse-feed';
import { DetailPane } from './components/detail-pane';
import { QuickAddModal } from './components/quick-add-modal';
import { fetchBookmarks, fetchEmails, fetchProjects, addBookmark } from './services/db';
import type { Bookmark, EmailThread, ProjectTelemetry, ActiveTab } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('vault');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [emails, setEmails] = useState<EmailThread[]>([]);
  const [projects, setProjects] = useState<ProjectTelemetry[]>([]);

  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailThread | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectTelemetry | null>(null);

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Load initial data
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

  // Global Keyboard Shortcuts (⌘K, ⌘⇧S)
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

  const unreadCount = emails.filter((e) => !e.is_read).length;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0d0f12] text-neutral-200">
      {/* Frameless macOS Top Bar with Drag Region */}
      <TopBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        emails={emails}
      />

      {/* Main 3-Pane Desktop Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Pane 1: Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          bookmarkCount={bookmarks.length}
          unreadEmailCount={unreadCount}
          healthyProjectsCount={projects.length}
        />

        {/* Pane 2: Feed / List View */}
        <div className="w-80 border-r border-white/8 bg-[#101318] flex flex-col shrink-0">
          <div className="p-3 border-b border-white/5 flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-300 capitalize">
              {activeTab === 'vault' ? 'Bookmarks & Repos' : activeTab === 'inbox' ? 'Triage Feed' : 'Telemetry Status'}
            </span>
            <span className="text-[10px] text-neutral-500 font-mono">
              {activeTab === 'vault' ? `${bookmarks.length} items` : activeTab === 'inbox' ? `${emails.length} threads` : `${projects.length} nodes`}
            </span>
          </div>

          {activeTab === 'vault' && (
            <VaultFeed
              bookmarks={bookmarks}
              selectedId={selectedBookmark?.id ?? null}
              onSelect={setSelectedBookmark}
            />
          )}

          {activeTab === 'inbox' && (
            <InboxFeed
              emails={emails}
              selectedId={selectedEmail?.id ?? null}
              onSelect={setSelectedEmail}
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

        {/* Pane 3: Detail / Action Inspector */}
        <div className="flex-1 bg-[#0d0f12] flex flex-col overflow-hidden">
          {activeTab === 'vault' && (
            <DetailPane item={selectedBookmark} type="bookmark" />
          )}
          {activeTab === 'inbox' && (
            <DetailPane item={selectedEmail} type="email" />
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
    </div>
  );
}

export default App;
