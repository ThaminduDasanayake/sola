import React from 'react';
import {
  BookmarkSimple as BookmarkSimpleIcon,
  Envelope as EnvelopeIcon,
  Pulse as PulseIcon,
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
}) => {
  const navItems = [
    {
      id: 'vault' as const,
      label: 'Vault',
      icon: BookmarkSimpleIcon,
      count: bookmarkCount,
    },
    {
      id: 'inbox' as const,
      label: 'Inbox',
      icon: EnvelopeIcon,
      count: unreadEmailCount > 0 ? unreadEmailCount : undefined,
    },
    {
      id: 'pulse' as const,
      label: 'Pulse',
      icon: PulseIcon,
    },
  ];

  return (
    <aside className="w-52 bg-[#18181a] border-r border-white/[0.06] flex flex-col justify-between select-none shrink-0 h-[calc(100vh-2.75rem)] py-3">
      <nav className="space-y-0.5 px-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[13px] font-normal transition-colors ${
                isActive
                  ? 'bg-[#0a84ff] text-white font-medium'
                  : 'text-[#d1d1d6] hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#86868b]'}`} />
                <span>{item.label}</span>
              </div>
              {item.count !== undefined && (
                <span
                  className={`text-[11px] font-mono ${
                    isActive ? 'text-white/80' : 'text-[#86868b]'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
