import React, { useMemo, useState, useEffect } from 'react';
import {
  UserCircle as UserCircleIcon,
  Trash as TrashIcon,
  Check as CheckIcon,
  CheckSquare as CheckSquareIcon,
  Checks as ChecksIcon,
  X as XIcon,
} from '@phosphor-icons/react';
import type { EmailThread, EmailCategoryTab } from '../types';

interface InboxFeedProps {
  emails: EmailThread[];
  selectedId: string | null;
  onSelect: (email: EmailThread) => void;
  selectedAccount?: string;
  accounts?: string[];
  onSelectAccount?: (acc: string) => void;
  lastSyncText?: string;
  isSyncing?: boolean;
  categoryTab?: EmailCategoryTab;
  onCategoryChange?: (tab: EmailCategoryTab) => void;
  onDeleteEmail?: (id: string) => void;
  onDeleteEmails?: (ids: string[]) => void;
}

export const InboxFeed: React.FC<InboxFeedProps> = ({
  emails,
  selectedId,
  onSelect,
  selectedAccount = 'all',
  accounts = [],
  onSelectAccount,
  lastSyncText,
  isSyncing = false,
  categoryTab = 'Primary',
  onCategoryChange,
  onDeleteEmail,
  onDeleteEmails,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);

  // Categorize emails (supports both Gmail categories and legacy tags)
  const isPrimary = (e: EmailThread) =>
    e.category === 'Primary' || e.category === 'Action';
  const isUpdates = (e: EmailThread) =>
    e.category === 'Updates' || e.category === 'Dev' || e.category === 'Receipt';

  const primaryEmails = useMemo(() => emails.filter(isPrimary), [emails]);
  const updatesEmails = useMemo(() => emails.filter(isUpdates), [emails]);
  const allEmails = emails;

  const displayedEmails = useMemo(() => {
    if (categoryTab === 'Primary') return primaryEmails;
    if (categoryTab === 'Updates') return updatesEmails;
    return allEmails;
  }, [categoryTab, primaryEmails, updatesEmails, allEmails]);

  // Prune any selected IDs that were deleted or removed from emails
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const currentIdSet = new Set(emails.map((e) => e.id));
      const next = new Set<string>();
      for (const id of prev) {
        if (currentIdSet.has(id)) next.add(id);
      }
      if (next.size === 0) setIsSelectMode(false);
      return next;
    });
  }, [emails]);

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    const displayedIdList = displayedEmails.map((e) => e.id);
    const allSelected = displayedIdList.length > 0 && displayedIdList.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedIdList));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (onDeleteEmails) {
      onDeleteEmails(ids);
    } else if (onDeleteEmail) {
      ids.forEach((id) => onDeleteEmail(id));
    }
  };

  const primaryUnread = primaryEmails.filter((e) => !e.is_read).length;
  const updatesUnread = updatesEmails.filter((e) => !e.is_read).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#18181a]">
      {/* Subheader: Selection Toggle, Message Count & Last Sync */}
      <div className="h-8 px-3 border-b border-white/[0.06] flex items-center justify-between text-[11px] shrink-0 bg-[#161618]">
        <div className="flex items-center gap-2">
          {displayedEmails.length > 0 && (
            <button
              onClick={() => {
                if (isSelectMode) {
                  setIsSelectMode(false);
                  setSelectedIds(new Set());
                } else {
                  setIsSelectMode(true);
                }
              }}
              className={`w-5 h-5 rounded flex items-center justify-center transition-colors cursor-pointer ${
                isSelectMode
                  ? 'bg-[#e5a93c]/20 text-[#e5a93c]'
                  : 'hover:text-[#f5f5f7] hover:bg-white/[0.06] text-[#8e8e93]'
              }`}
              title={isSelectMode ? 'Exit selection' : 'Select emails'}
            >
              <ChecksIcon className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="font-mono text-[10.5px] text-[#d1d1d6] whitespace-nowrap">
            {displayedEmails.length} {categoryTab === 'All' ? (displayedEmails.length === 1 ? 'msg' : 'msgs') : `in ${categoryTab}`}
          </span>
        </div>

        {lastSyncText && (
          <div className="flex items-center gap-1.5 text-[#8e8e93] shrink-0 text-[10px] font-mono">
            <span>{isSyncing ? 'Syncing...' : lastSyncText}</span>
          </div>
        )}
      </div>

      {/* Category Tabs: Primary (Default), Updates (2nd Tab), All Mail */}
      <div className="px-2 pt-2 pb-1.5 shrink-0 bg-[#161618] border-b border-white/[0.04]">
        <div className="p-0.5 bg-[#202023] rounded-full border border-white/[0.06] flex items-center">
          <button
            onClick={() => onCategoryChange?.('Primary')}
            className={`flex-1 py-1 px-1.5 rounded-full text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
              categoryTab === 'Primary'
                ? 'bg-white/[0.14] text-[#f5f5f7] shadow-sm font-semibold'
                : 'text-[#8e8e93] hover:text-[#d1d1d6]'
            }`}
          >
            <span>Primary</span>
            {primaryUnread > 0 ? (
              <span className="w-1.5 h-1.5 rounded-full bg-[#e5a93c]" />
            ) : (
              <span className="text-[9.5px] text-[#636366] font-mono">({primaryEmails.length})</span>
            )}
          </button>

          <button
            onClick={() => onCategoryChange?.('Updates')}
            className={`flex-1 py-1 px-1.5 rounded-full text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
              categoryTab === 'Updates'
                ? 'bg-white/[0.14] text-[#f5f5f7] shadow-sm font-semibold'
                : 'text-[#8e8e93] hover:text-[#d1d1d6]'
            }`}
          >
            <span>Updates</span>
            {updatesUnread > 0 ? (
              <span className="w-1.5 h-1.5 rounded-full bg-[#e5a93c]" />
            ) : (
              <span className="text-[9.5px] text-[#636366] font-mono">({updatesEmails.length})</span>
            )}
          </button>

          <button
            onClick={() => onCategoryChange?.('All')}
            className={`flex-1 py-1 px-1.5 rounded-full text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
              categoryTab === 'All'
                ? 'bg-white/[0.14] text-[#f5f5f7] shadow-sm font-semibold'
                : 'text-[#8e8e93] hover:text-[#d1d1d6]'
            }`}
          >
            <span>All Mail</span>
            <span className="text-[9.5px] text-[#636366] font-mono">({allEmails.length})</span>
          </button>
        </div>
      </div>

      {/* Multi-Select Action Bar (Pure Icon-Based) */}
      {(isSelectMode || selectedIds.size > 0) && (
        <div className="h-8 px-3 bg-[#1e1e22] border-b border-white/[0.08] flex items-center justify-between shrink-0 animate-fade-in">
          {/* Left: Select All toggle icon + compact counter */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleSelectAll}
              className={`w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer ${
                displayedEmails.length > 0 &&
                displayedEmails.every((e) => selectedIds.has(e.id))
                  ? 'bg-[#e5a93c]/20 text-[#e5a93c]'
                  : 'text-[#8e8e93] hover:text-[#f5f5f7] hover:bg-white/[0.06]'
              }`}
              title={
                displayedEmails.length > 0 &&
                displayedEmails.every((e) => selectedIds.has(e.id))
                  ? 'Deselect all'
                  : 'Select all'
              }
            >
              <CheckSquareIcon
                className="w-4 h-4"
                weight={
                  displayedEmails.length > 0 &&
                  displayedEmails.every((e) => selectedIds.has(e.id))
                    ? 'fill'
                    : 'regular'
                }
              />
            </button>

            {selectedIds.size > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#e5a93c]/15 text-[#e5a93c] text-[10.5px] font-mono font-medium whitespace-nowrap">
                {selectedIds.size}
              </span>
            )}
          </div>

          {/* Right: Trash delete icon + Close cancel icon */}
          <div className="flex items-center gap-1">
            {selectedIds.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="w-6 h-6 rounded flex items-center justify-center bg-[#ff453a]/20 hover:bg-[#ff453a]/30 active:bg-[#ff453a]/40 text-[#ff453a] transition-colors cursor-pointer"
                title={`Delete ${selectedIds.size} selected`}
              >
                <TrashIcon className="w-3.5 h-3.5" weight="bold" />
              </button>
            )}
            <button
              onClick={() => {
                setIsSelectMode(false);
                setSelectedIds(new Set());
              }}
              className="w-6 h-6 rounded flex items-center justify-center text-[#8e8e93] hover:text-[#f5f5f7] hover:bg-white/[0.08] transition-colors cursor-pointer"
              title="Cancel selection"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Messages Feed */}
      {displayedEmails.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
          <p className="text-[13.5px] font-medium text-[#d1d1d6]">
            No {categoryTab === 'All' ? '' : categoryTab} Messages
          </p>
          <p className="text-[11.5px] text-[#636366] mt-1 max-w-[200px] leading-relaxed">
            {emails.length === 0
              ? 'Click ↻ in the toolbar to sync your Gmail'
              : `Switch to ${categoryTab === 'Primary' ? 'Updates or All Mail' : 'Primary'} to view other messages`}
          </p>
          {categoryTab !== 'All' && emails.length > 0 && (
            <button
              onClick={() => onCategoryChange?.('All')}
              className="mt-3 px-3 py-1 rounded-full text-[11px] font-medium bg-white/[0.08] hover:bg-white/[0.14] text-[#e5a93c] transition-colors cursor-pointer"
            >
              View All Mail ({emails.length})
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {displayedEmails.map((item) => {
            const isSelected = item.id === selectedId;
            const isMultiSelected = selectedIds.has(item.id);
            const senderName = item.sender.split('<')[0].trim();
            const accountLabel = item.account_email ? item.account_email.split('@')[0] : null;

            return (
              <div
                key={item.id}
                onClick={(e) => {
                  if (isSelectMode || e.metaKey || e.ctrlKey) {
                    e.stopPropagation();
                    toggleSelectItem(item.id);
                  } else {
                    onSelect(item);
                  }
                }}
                className={`group px-3 py-2.5 rounded-xl cursor-pointer transition-colors relative ${
                  isMultiSelected
                    ? 'bg-[#e5a93c]/15 text-[#f5f5f7] ring-1 ring-[#e5a93c]/30'
                    : isSelected
                    ? 'bg-white/[0.12] text-[#f5f5f7]'
                    : 'hover:bg-white/[0.05] text-[#d1d1d6]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <div className="flex items-center gap-1.5 truncate">
                    {/* Checkbox button */}
                    {isSelectMode || isMultiSelected ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectItem(item.id);
                        }}
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                          isMultiSelected
                            ? 'bg-[#e5a93c] text-black shadow-sm font-bold'
                            : 'border border-white/30 bg-white/[0.04] hover:border-white/60'
                        }`}
                      >
                        {isMultiSelected && <CheckIcon className="w-2.5 h-2.5" weight="bold" />}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSelectMode(true);
                          toggleSelectItem(item.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 w-3.5 h-3.5 rounded border border-white/25 hover:border-white/60 bg-white/[0.04] flex items-center justify-center shrink-0 transition-all cursor-pointer"
                        title="Select email"
                      >
                        <CheckIcon className="w-2.5 h-2.5 text-transparent hover:text-white/40" />
                      </button>
                    )}

                    {!item.is_read && (
                      <span className="w-2 h-2 rounded-full bg-[#e5a93c] shrink-0" />
                    )}
                    <span
                      className={`text-[12px] font-semibold truncate ${
                        isSelected || isMultiSelected ? 'text-[#f5f5f7]' : 'text-[#f0f0f3]'
                      }`}
                    >
                      {senderName}
                    </span>
                    {/* Account badge when viewing All Inboxes with multiple accounts */}
                    {selectedAccount === 'all' && accounts.length > 1 && accountLabel && (
                      <span
                        className="text-[9.5px] font-medium px-1.5 py-0.2 rounded-full bg-white/[0.08] text-[#8e8e93] shrink-0 truncate max-w-[70px]"
                        title={`Account: ${item.account_email}`}
                      >
                        {accountLabel}
                      </span>
                    )}
                    {/* Category tag when viewing All Mail */}
                    {categoryTab === 'All' && item.category && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/[0.06] text-[#8e8e93] shrink-0 font-medium">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDeleteEmails) {
                          onDeleteEmails([item.id]);
                        } else {
                          onDeleteEmail?.(item.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full flex items-center justify-center text-[#8e8e93] hover:text-[#ff453a] hover:bg-white/[0.1] transition-all cursor-pointer"
                      title="Delete email"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>
                    <span className="text-[11px] text-[#8e8e93]">
                      {new Date(item.received_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <h3 className="text-[13px] font-medium line-clamp-1 leading-snug text-[#f5f5f7]">
                  {item.subject}
                </h3>

                <p className="text-[12px] line-clamp-2 mt-0.5 leading-normal text-[#8e8e93]">
                  {item.ai_summary || item.snippet}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
