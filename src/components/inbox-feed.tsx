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
    <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-0.5">
      {emails.map((item) => {
        const isSelected = item.id === selectedId;
        const senderName = item.sender.split('<')[0].trim();

        return (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            className={`px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              isSelected
                ? 'bg-[#0a84ff] text-white'
                : 'hover:bg-white/[0.04] text-[#f5f5f7]'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <div className="flex items-center gap-1.5 truncate">
                {!item.is_read && (
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isSelected ? 'bg-white' : 'bg-[#0a84ff]'
                    }`}
                  />
                )}
                <span
                  className={`text-[12px] font-semibold truncate ${
                    isSelected ? 'text-white' : 'text-[#f5f5f7]'
                  }`}
                >
                  {senderName}
                </span>
              </div>
              <span
                className={`text-[11px] shrink-0 ${
                  isSelected ? 'text-white/70' : 'text-[#86868b]'
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
                isSelected ? 'text-white' : 'text-[#f5f5f7]'
              }`}
            >
              {item.subject}
            </h3>

            <p
              className={`text-[12px] line-clamp-2 mt-0.5 leading-normal ${
                isSelected ? 'text-white/80' : 'text-[#86868b]'
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
