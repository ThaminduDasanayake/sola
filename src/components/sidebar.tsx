import React from 'react';
import {
  BookmarkSimple as BookmarkSimpleIcon,
  Envelope as EnvelopeIcon,
  Pulse as PulseIcon,
  HardDrive as HardDriveIcon,
} from '@phosphor-icons/react';
import type { ActiveTab } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  bookmarkCount: number;
  unreadEmailCount: number;
  healthyProjectsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  bookmarkCount,
  unreadEmailCount,
  healthyProjectsCount,
}) => {
  return (
    <aside className="w-56 bg-[#111419] border-r border-white/8 flex flex-col justify-between select-none shrink-0 h-[calc(100vh-3rem)]">
      <div className="p-3 space-y-4">
        {/* Navigation Section */}
        <div>
          <div className="px-2.5 mb-1.5 text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
            Workspace
          </div>
          <nav className="space-y-1">
            <button
              onClick={() => onTabChange('vault')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'vault'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <BookmarkSimpleIcon className="w-3.5 h-3.5" />
                <span>Link & Repo Vault</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.2 bg-white/5 rounded-full text-neutral-400 font-mono">
                {bookmarkCount}
              </span>
            </button>

            <button
              onClick={() => onTabChange('inbox')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'inbox'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <EnvelopeIcon className="w-3.5 h-3.5" />
                <span>Smart Inbox</span>
              </div>
              {unreadEmailCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full font-mono">
                  {unreadEmailCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onTabChange('pulse')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'pulse'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <PulseIcon className="w-3.5 h-3.5" />
                <span>Dev & Ops Pulse</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></span>
            </button>
          </nav>
        </div>

        {/* Global Shortcuts Reference */}
        <div className="pt-2 border-t border-white/5 px-2">
          <div className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase mb-2">
            Quick Keys
          </div>
          <div className="space-y-1.5 text-[11px] text-neutral-400">
            <div className="flex justify-between items-center">
              <span>Quick Capture</span>
              <kbd className="font-mono text-[9px] bg-white/5 px-1 rounded text-neutral-400">⌘⇧S</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span>Toggle App</span>
              <kbd className="font-mono text-[9px] bg-white/5 px-1 rounded text-neutral-400">⌘⇧Space</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span>Instant Search</span>
              <kbd className="font-mono text-[9px] bg-white/5 px-1 rounded text-neutral-400">⌘K</kbd>
            </div>
          </div>
        </div>
      </div>

      {/* Footer System Telemetry Badge */}
      <div className="p-3 border-t border-white/8 bg-[#0e1014]">
        <div className="flex items-center gap-2 text-[11px] text-neutral-400 mb-1">
          <HardDriveIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-medium text-neutral-300">Local-First Engine</span>
        </div>
        <div className="text-[10px] text-neutral-500 flex justify-between font-mono">
          <span>RAM: ~34 MB</span>
          <span className="text-emerald-400/80">SQLite FTS5</span>
        </div>
      </div>
    </aside>
  );
};
