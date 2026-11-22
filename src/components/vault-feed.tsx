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
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
        <p className="text-[14px] font-medium text-[#d1d1d6]">No Bookmarks</p>
        <p className="text-[12px] text-[#636366] mt-1">Press ⌘B or click + to add a bookmark</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
      {bookmarks.map((item) => {
        const isSelected = item.id === selectedId;
        const host = new URL(
          item.url.startsWith('http') ? item.url : `https://${item.url}`
        ).hostname.replace('www.', '');

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
              <span className="text-[11px] font-medium truncate text-[#e5a93c]">
                {host}
              </span>
              <span className="text-[11px] shrink-0 text-[#8e8e93]">
                {new Date(item.created_at).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>

            <h3 className="text-[13px] font-medium line-clamp-1 leading-snug text-[#f5f5f7]">
              {item.title}
            </h3>

            {item.description && (
              <p className="text-[12px] line-clamp-2 mt-0.5 leading-normal text-[#8e8e93]">
                {item.description}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
