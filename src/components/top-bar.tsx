import React from 'react';
import {
  MagnifyingGlass as MagnifyingGlassIcon,
  Plus as PlusIcon,
  SidebarSimple as SidebarSimpleIcon,
  ArrowsClockwise as ArrowsClockwiseIcon,
  GearSix as GearSixIcon,
} from '@phosphor-icons/react';
import type { ActiveTab } from '../types';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenQuickAdd: () => void;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  onSyncInbox: () => void;
  isSyncing: boolean;
  activeTab: ActiveTab;
}

export const TopBar: React.FC<TopBarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenQuickAdd,
  onToggleSidebar,
  onOpenSettings,
  onSyncInbox,
  isSyncing,
  activeTab,
}) => {
  return (
    <header
      data-tauri-drag-region
      className="h-11 bg-[#1c1c1e] border-b border-white/[0.08] flex items-center justify-between px-3 select-none shrink-0 cursor-default"
    >
      {/* Left side: macOS traffic lights clearance + sidebar toggle */}
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
          <button
            onClick={onSyncInbox}
            disabled={isSyncing}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-7 h-7 rounded-full bg-white/[0.08] border border-white/[0.06] hover:bg-white/[0.14] flex items-center justify-center text-white/90 transition-colors shadow-sm disabled:opacity-50"
            title="Sync Inbox"
          >
            <ArrowsClockwiseIcon className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#e5a93c]' : ''}`} />
          </button>
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
          title="New bookmark (⌘⇧S)"
        >
          <PlusIcon className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOpenSettings}
          className="w-7 h-7 rounded-full bg-white/[0.08] border border-white/[0.06] hover:bg-white/[0.14] flex items-center justify-center text-white/90 transition-colors shadow-sm"
          title="Settings (⌘,)"
        >
          <GearSixIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
