import React from 'react';
import type { EmailThread } from '../types';

interface InboxFeedProps {
  emails: EmailThread[];
  selectedId: string | null;
  onSelect: (email: EmailThread) => void;
}

export const InboxFeed: React.FC<InboxFeedProps> = ({
  emails,
  selectedId,
  onSelect,
}) => {
  if (emails.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
        <p className="text-[14px] font-medium text-[#d1d1d6]">No Messages</p>
        <p className="text-[12px] text-[#636366] mt-1">Click ↻ in the toolbar to sync your Gmail</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
      {emails.map((item) => {
        const isSelected = item.id === selectedId;
        const senderName = item.sender.split('<')[0].trim();

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
  );
};
