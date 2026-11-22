import React from 'react';
import { UserCircle as UserCircleIcon } from '@phosphor-icons/react';
import type { EmailThread } from '../types';

interface InboxFeedProps {
  emails: EmailThread[];
  selectedId: string | null;
  onSelect: (email: EmailThread) => void;
  selectedAccount?: string;
  accounts?: string[];
  onSelectAccount?: (acc: string) => void;
}

export const InboxFeed: React.FC<InboxFeedProps> = ({
  emails,
  selectedId,
  onSelect,
  selectedAccount = 'all',
  accounts = [],
  onSelectAccount,
}) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Subheader: Active Account Context */}
      <div className="h-8 px-3.5 border-b border-white/[0.06] flex items-center justify-between text-[11px] shrink-0 bg-[#161618]">
        <div className="flex items-center gap-1.5 min-w-0">
          <UserCircleIcon className="w-3.5 h-3.5 text-[#e5a93c] shrink-0" weight="fill" />
          <span className="font-medium text-[#f5f5f7] truncate">
            {selectedAccount === 'all' ? 'All Inboxes' : selectedAccount}
          </span>
        </div>
        <span className="text-[#8e8e93] shrink-0 text-[10.5px] font-mono">
          {emails.length} {emails.length === 1 ? 'message' : 'messages'}
        </span>
      </div>

      {emails.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
          <p className="text-[14px] font-medium text-[#d1d1d6]">
            {selectedAccount === 'all' ? 'No Messages' : 'No Messages in this Account'}
          </p>
          <p className="text-[12px] text-[#636366] mt-1 max-w-[200px]">
            {selectedAccount === 'all'
              ? 'Click ↻ in the toolbar to sync your Gmail'
              : 'Switch to All Inboxes or another user to see more'}
          </p>
          {selectedAccount !== 'all' && (
            <button
              onClick={() => onSelectAccount?.('all')}
              className="mt-3 px-3 py-1 rounded-full text-[11.5px] font-medium bg-white/[0.08] hover:bg-white/[0.14] text-[#e5a93c] transition-colors"
            >
              View All Inboxes
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {emails.map((item) => {
            const isSelected = item.id === selectedId;
            const senderName = item.sender.split('<')[0].trim();
            const accountLabel = item.account_email ? item.account_email.split('@')[0] : null;

            return (
              <div
                key={item.id}
                onClick={() => onSelect(item)}
                className={`px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-white/[0.12] text-[#f5f5f7]'
                    : 'hover:bg-white/[0.05] text-[#d1d1d6]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <div className="flex items-center gap-1.5 truncate">
                    {!item.is_read && (
                      <span className="w-2 h-2 rounded-full bg-[#e5a93c] shrink-0" />
                    )}
                    <span
                      className={`text-[12px] font-semibold truncate ${
                        isSelected ? 'text-[#f5f5f7]' : 'text-[#f0f0f3]'
                      }`}
                    >
                      {senderName}
                    </span>
                    {/* Account badge when viewing All Inboxes with multiple accounts */}
                    {selectedAccount === 'all' && accounts.length > 1 && accountLabel && (
                      <span
                        className="text-[9.5px] font-medium px-1.5 py-0.2 rounded-full bg-white/[0.08] text-[#8e8e93] shrink-0 truncate max-w-[80px]"
                        title={`Account: ${item.account_email}`}
                      >
                        {accountLabel}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] shrink-0 text-[#8e8e93]">
                    {new Date(item.received_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
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
