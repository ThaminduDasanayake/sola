import React from 'react';
import {
  Envelope as EnvelopeIcon,
  BookmarkSimple as BookmarkSimpleIcon,
  Pulse as PulseIcon,
  GearSix as GearSixIcon,
} from '@phosphor-icons/react';
import type { ActiveTab } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isCollapsed: boolean;
  bookmarkCount: number;
  unreadEmailCount: number;
  healthyProjectsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isCollapsed,
  bookmarkCount,
  unreadEmailCount,
}) => {
  const navItems = [
    {
      id: 'inbox' as const,
      label: 'Inbox',
      icon: EnvelopeIcon,
      count: unreadEmailCount > 0 ? unreadEmailCount : undefined,
    },
    {
      id: 'vault' as const,
      label: 'Bookmarks',
      icon: BookmarkSimpleIcon,
      count: bookmarkCount > 0 ? bookmarkCount : undefined,
    },
    {
      id: 'pulse' as const,
      label: 'Pulse',
      icon: PulseIcon,
    },
  ];

  const isSettingsActive = activeTab === 'settings';

  return (
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-56'
      } bg-[#1e1e1e] border-r border-white/[0.08] flex flex-col justify-between select-none shrink-0 h-[calc(100vh-2.75rem)] py-2 transition-all duration-150 ease-out`}
    >
      {/* Top Main Navigation */}
      <nav className="p-2 space-y-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          if (isCollapsed) {
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                title={item.label}
                className="w-full flex items-center justify-center py-1 transition-colors"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center relative transition-colors ${
                    isActive
                      ? 'bg-white/[0.14] text-white shadow-sm'
                      : 'hover:bg-white/[0.06] text-[#8e8e93]'
                  }`}
                >
                  <Icon
                    className="w-[18px] h-[18px] text-[#e5a93c]"
                    weight={isActive ? 'fill' : 'regular'}
                  />
                  {item.count !== undefined && item.count > 0 && (
                    <span className="absolute -top-1 -right-1 text-[9px] font-mono font-bold px-1.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-[#e5a93c] text-[#1a1918] leading-none shadow-sm">
                      {item.count}
                    </span>
                  )}
                </div>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-full text-[13px] transition-colors ${
                isActive
                  ? 'bg-white/[0.12] text-[#f5f5f7] font-medium'
                  : 'text-[#d1d1d6] hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className="w-[18px] h-[18px] text-[#e5a93c] shrink-0"
                  weight={isActive ? 'fill' : 'regular'}
                />
                <span>{item.label}</span>
              </div>
              {item.count !== undefined && item.count > 0 && (
                <span className="text-[12px] font-normal text-[#8e8e93]">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Settings Navigation */}
      <div className="p-2 border-t border-white/[0.06]">
        {isCollapsed ? (
          <button
            onClick={() => onTabChange('settings')}
            title="Settings (⌘,)"
            className="w-full flex items-center justify-center py-1 transition-colors"
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                isSettingsActive
                  ? 'bg-white/[0.14] text-white shadow-sm'
                  : 'hover:bg-white/[0.06] text-[#8e8e93]'
              }`}
            >
              <GearSixIcon
                className="w-[18px] h-[18px] text-[#e5a93c]"
                weight={isSettingsActive ? 'fill' : 'regular'}
              />
            </div>
          </button>
        ) : (
          <button
            onClick={() => onTabChange('settings')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-full text-[13px] transition-colors ${
              isSettingsActive
                ? 'bg-white/[0.12] text-[#f5f5f7] font-medium'
                : 'text-[#d1d1d6] hover:bg-white/[0.06]'
            }`}
          >
            <GearSixIcon
              className="w-[18px] h-[18px] text-[#e5a93c] shrink-0"
              weight={isSettingsActive ? 'fill' : 'regular'}
            />
            <span>Settings</span>
          </button>
        )}
      </div>
    </aside>
  );
};
