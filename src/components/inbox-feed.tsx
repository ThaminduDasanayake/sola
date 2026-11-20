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
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#86868b]">
        <p className="text-[13px]">No messages</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-1">
      {emails.map((item) => {
        const isSelected = item.id === selectedId;
        const senderName = item.sender.split('<')[0].trim();

        return (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            className={`px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
              isSelected
                ? 'bg-[#2a2417] border border-amber-500/35 shadow-sm'
                : 'hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 truncate">
                {!item.is_read && (
                  <span className="w-2 h-2 rounded-full bg-[#f59e0b] shrink-0 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
                )}
                <span
                  className={`text-[12px] font-semibold truncate ${
                    isSelected ? 'text-amber-300' : 'text-[#f0f0f3]'
                  }`}
                >
                  {senderName}
                </span>
              </div>
              <span
                className={`text-[11px] shrink-0 ${
                  isSelected ? 'text-amber-300/80' : 'text-[#86868b]'
                }`}
              >
                {new Date(item.received_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <h3
              className={`text-[13px] font-medium line-clamp-1 leading-snug ${
                isSelected ? 'text-[#fbfbfb] font-semibold' : 'text-[#f0f0f3]'
              }`}
            >
              {item.subject}
            </h3>

            <p
              className={`text-[12px] line-clamp-2 mt-1 leading-normal ${
                isSelected ? 'text-[#d6d6dc]' : 'text-[#9e9ea7]'
              }`}
            >
              {item.ai_summary || item.snippet}
            </p>
          </div>
        );
      })}
    </div>
  );
};
