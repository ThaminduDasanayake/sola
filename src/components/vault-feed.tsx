import React from 'react';
import type { Bookmark } from '../types';

interface VaultFeedProps {
  bookmarks: Bookmark[];
  selectedId: number | null;
  onSelect: (bookmark: Bookmark) => void;
}

export const VaultFeed: React.FC<VaultFeedProps> = ({
  bookmarks,
  selectedId,
  onSelect,
}) => {
  if (bookmarks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#86868b]">
        <p className="text-[13px]">No bookmarks found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-1">
      {bookmarks.map((item) => {
        const isSelected = item.id === selectedId;
        const host = new URL(
          item.url.startsWith('http') ? item.url : `https://${item.url}`
        ).hostname.replace('www.', '');

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
              <span
                className={`text-[11px] font-medium truncate ${
                  isSelected ? 'text-amber-400' : 'text-[#86868b]'
                }`}
              >
                {host}
              </span>
              <span
                className={`text-[11px] shrink-0 font-normal ${
                  isSelected ? 'text-amber-300/80' : 'text-[#86868b]'
                }`}
              >
                {new Date(item.created_at).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>

            <h3
              className={`text-[13px] font-medium line-clamp-1 leading-snug ${
                isSelected ? 'text-[#fbfbfb] font-semibold' : 'text-[#f0f0f3]'
              }`}
            >
              {item.title}
            </h3>

            {item.description && (
              <p
                className={`text-[12px] line-clamp-2 mt-1 leading-normal ${
                  isSelected ? 'text-[#d6d6dc]' : 'text-[#9e9ea7]'
                }`}
              >
                {item.description}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
