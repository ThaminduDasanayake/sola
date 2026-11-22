import React, { useState } from 'react';
import {
  MagnifyingGlass as MagnifyingGlassIcon,
  Plus as PlusIcon,
  SidebarSimple as SidebarSimpleIcon,
  ArrowsClockwise as ArrowsClockwiseIcon,
  UserCircle as UserCircleIcon,
  CaretDown as CaretDownIcon,
  Tray as TrayIcon,
  Check as CheckIcon,
} from '@phosphor-icons/react';
import type { ActiveTab } from '../types';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenQuickAdd: () => void;
  onToggleSidebar: () => void;
  onSyncInbox: () => void;
  isSyncing: boolean;
  activeTab: ActiveTab;
  lastSyncText?: string;
  accounts?: string[];
  selectedAccount?: string;
  onSelectAccount?: (acc: string) => void;
  emailCountsByAccount?: Record<string, { total: number; unread: number }>;
}

export const TopBar: React.FC<TopBarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenQuickAdd,
  onToggleSidebar,
  onSyncInbox,
  isSyncing,
  activeTab,
  lastSyncText,
  accounts = [],
  selectedAccount = 'all',
  onSelectAccount,
  emailCountsByAccount = {},
}) => {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  return (
    <header
      data-tauri-drag-region
      className="h-11 bg-[#1c1c1e] border-b border-white/[0.08] flex items-center justify-between px-3 select-none shrink-0 cursor-default"
    >
      {/* Left side: macOS traffic lights clearance + sidebar toggle + sync + account switcher */}
      <div data-tauri-drag-region className="flex items-center gap-2 shrink-0">
        <div data-tauri-drag-region className="w-[76px] shrink-0 h-full" />

        <button
          onClick={onToggleSidebar}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-7 h-7 rounded-full bg-white/[0.08] border border-white/[0.06] hover:bg-white/[0.14] flex items-center justify-center text-white/90 transition-colors shadow-sm"
          title="Toggle Sidebar"
        >
          <SidebarSimpleIcon className="w-3.5 h-3.5" />
        </button>

        {activeTab === 'inbox' && (
          <>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={onSyncInbox}
                disabled={isSyncing}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-7 h-7 rounded-full bg-white/[0.08] border border-white/[0.06] hover:bg-white/[0.14] flex items-center justify-center text-white/90 transition-colors shadow-sm disabled:opacity-50"
                title={`Sync Inbox (${isSyncing ? 'Syncing...' : `Last: ${lastSyncText || 'Never'}`})`}
              >
                <ArrowsClockwiseIcon className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#e5a93c]' : ''}`} />
              </button>
              {lastSyncText && (
                <span
                  className="text-[11px] font-mono text-[#8e8e93] select-none hidden sm:inline-block pr-1"
                  title={`Last synced: ${lastSyncText}`}
                >
                  {isSyncing ? 'Syncing...' : lastSyncText}
                </span>
              )}
            </div>

            {/* User Account Switcher */}
            <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
              <button
                onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                className={`h-7 px-2.5 rounded-full border flex items-center gap-1.5 text-[12px] font-medium transition-all shadow-sm ${
                  selectedAccount !== 'all'
                    ? 'bg-[#e5a93c]/20 border-[#e5a93c]/50 text-white'
                    : 'bg-white/[0.08] border-white/[0.06] hover:bg-white/[0.14] text-white/90'
                }`}
                title="Switch User Account"
              >
                <UserCircleIcon
                  className={`w-3.5 h-3.5 ${selectedAccount !== 'all' ? 'text-[#e5a93c]' : 'text-[#8e8e93]'}`}
                  weight={selectedAccount !== 'all' ? 'fill' : 'regular'}
                />
                <span className="max-w-[110px] truncate text-[11px]">
                  {selectedAccount === 'all'
                    ? 'All Inboxes'
                    : selectedAccount.split('@')[0]}
                </span>
                <CaretDownIcon className="w-2.5 h-2.5 text-[#8e8e93]" />
              </button>

              {isAccountMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsAccountMenuOpen(false)}
                  />
                  <div className="absolute left-0 mt-1.5 w-64 bg-[#222224] border border-white/10 rounded-xl shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2.5 py-1.5 text-[10px] font-semibold text-[#8e8e93] uppercase tracking-wider">
                      Switch Mailbox
                    </div>

                    {/* All Inboxes Option */}
                    <button
                      onClick={() => {
                        onSelectAccount?.('all');
                        setIsAccountMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12px] transition-colors ${
                        selectedAccount === 'all'
                          ? 'bg-white/[0.12] text-[#f5f5f7] font-medium'
                          : 'text-[#d1d1d6] hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <TrayIcon className="w-4 h-4 text-[#e5a93c] shrink-0" />
                        <span className="truncate">All Inboxes</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {emailCountsByAccount['all']?.unread > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#e5a93c] text-black font-semibold">
                            {emailCountsByAccount['all'].unread}
                          </span>
                        )}
                        {selectedAccount === 'all' && (
                          <CheckIcon className="w-3.5 h-3.5 text-[#e5a93c]" weight="bold" />
                        )}
                      </div>
                    </button>

                    {accounts.length > 0 && (
                      <div className="my-1 border-t border-white/[0.06]" />
                    )}

                    {/* User Accounts list */}
                    {accounts.map((acc) => {
                      const isSelected = selectedAccount === acc;
                      const unread = emailCountsByAccount[acc]?.unread ?? 0;
                      return (
                        <button
                          key={acc}
                          onClick={() => {
                            onSelectAccount?.(acc);
                            setIsAccountMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12px] transition-colors ${
                            isSelected
                              ? 'bg-white/[0.12] text-[#f5f5f7] font-medium'
                              : 'text-[#d1d1d6] hover:bg-white/[0.06]'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <UserCircleIcon className="w-4 h-4 text-[#e5a93c] shrink-0" weight="fill" />
                            <span className="truncate text-left">{acc}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {unread > 0 && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#e5a93c] text-black font-semibold">
                                {unread}
                              </span>
                            )}
                            {isSelected && (
                              <CheckIcon className="w-3.5 h-3.5 text-[#e5a93c]" weight="bold" />
                            )}
                          </div>
                        </button>
                      );
                    })}

                    {accounts.length === 0 && (
                      <div className="px-2.5 py-2 text-[11px] text-[#8e8e93] leading-snug">
                        Sync your inboxes to see separate accounts.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Center: Apple-style full-rounded Pill Search Bar */}
      <div
        className="flex-1 max-w-xs mx-auto"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center">
          <MagnifyingGlassIcon className="w-3.5 h-3.5 absolute left-3 text-[#8e8e93] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search"
            className="w-full bg-[#28282b] text-[13px] text-[#f5f5f7] placeholder-[#8e8e93] pl-8 pr-8 py-1 rounded-full border border-white/[0.05] focus:outline-none focus:bg-[#323236] focus:ring-1 focus:ring-white/20 transition-all"
          />
          {searchQuery ? (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 text-[12px] text-[#8e8e93] hover:text-white"
            >
              ×
            </button>
          ) : (
            <kbd className="absolute right-2.5 text-[10px] text-[#636366] font-mono">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Right side: Action buttons */}
      <div
        className="flex items-center gap-1.5 shrink-0"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={onOpenQuickAdd}
          className="w-7 h-7 rounded-full bg-white/[0.08] border border-white/[0.06] hover:bg-white/[0.14] flex items-center justify-center text-white/90 transition-colors shadow-sm"
          title="New bookmark (⌘B)"
        >
          <PlusIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
