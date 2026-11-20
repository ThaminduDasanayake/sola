import React from 'react';
import { ExternalLink, Tag, Sparkles, Clock, Globe } from 'lucide-react';
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
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-500">
        <Globe className="w-8 h-8 stroke-[1.5] mb-2 text-neutral-600" />
        <p className="text-xs">No bookmarks found matching your search query.</p>
        <p className="text-[11px] text-neutral-600 mt-1">Press ⌘⇧S or click "Capture URL" to add a link.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto divide-y divide-white/5">
      {bookmarks.map((item) => {
        const isSelected = item.id === selectedId;
        const host = new URL(item.url.startsWith('http') ? item.url : `https://${item.url}`).hostname;

        return (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            className={`p-3 cursor-pointer transition-colors ${
              isSelected
                ? 'bg-blue-600/10 border-l-2 border-blue-500'
                : 'hover:bg-white/[0.03] border-l-2 border-transparent'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-mono text-neutral-400 flex items-center gap-1 truncate">
                <Globe className="w-3 h-3 text-neutral-500 shrink-0" />
                {host}
              </span>
              <span className="text-[10px] text-neutral-500 shrink-0">
                {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </span>
            </div>

            <h3 className="text-xs font-medium text-neutral-200 line-clamp-1 mb-1">
              {item.title}
            </h3>

            {item.description && (
              <p className="text-[11px] text-neutral-400 line-clamp-2 mb-2 leading-relaxed">
                {item.description}
              </p>
            )}

            {/* Tag Pills */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {item.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-[9px] bg-white/5 text-neutral-400 px-1.5 py-0.5 rounded border border-white/5 font-mono"
                  >
                    #{tag}
                  </span>
                ))}
                {item.tags.length > 3 && (
                  <span className="text-[9px] text-neutral-500 px-1 py-0.5">
                    +{item.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
