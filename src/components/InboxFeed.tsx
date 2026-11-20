import React from 'react';
import { Mail, Clock, AlertCircle, Newspaper, Terminal, Receipt, CheckCircle2 } from 'lucide-react';
import type { EmailThread } from '../types';

interface InboxFeedProps {
  emails: EmailThread[];
  selectedId: string | null;
  onSelect: (email: EmailThread) => void;
}

const CategoryIcon: React.FC<{ category: EmailThread['category'] }> = ({ category }) => {
  switch (category) {
    case 'Action':
      return <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    case 'Newsletter':
      return <Newspaper className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
    case 'Dev':
      return <Terminal className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    case 'Receipt':
      return <Receipt className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    default:
      return <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />;
  }
};

export const InboxFeed: React.FC<InboxFeedProps> = ({
  emails,
  selectedId,
  onSelect,
}) => {
  if (emails.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-500">
        <CheckCircle2 className="w-8 h-8 stroke-[1.5] mb-2 text-emerald-500/80" />
        <p className="text-xs">Inbox zero! All threads and newsletters are triaged.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto divide-y divide-white/5">
      {emails.map((item) => {
        const isSelected = item.id === selectedId;

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
              <div className="flex items-center gap-1.5 truncate">
                <CategoryIcon category={item.category} />
                <span className="text-[11px] font-medium text-neutral-300 truncate">
                  {item.sender.split('<')[0].trim()}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {!item.is_read && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                )}
                <span className="text-[10px] text-neutral-500 font-mono">
                  {new Date(item.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            <h3 className="text-xs font-semibold text-neutral-200 line-clamp-1 mb-1">
              {item.subject}
            </h3>

            {item.ai_summary ? (
              <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                <span className="text-blue-400/90 font-medium">TL;DR: </span>
                {item.ai_summary}
              </p>
            ) : (
              <p className="text-[11px] text-neutral-500 line-clamp-2">
                {item.snippet}
              </p>
            )}

            <div className="flex items-center gap-2 mt-2">
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-neutral-400 border border-white/5 uppercase tracking-wide font-mono">
                {item.category}
              </span>
              {item.due_date && (
                <span className="text-[9px] text-amber-400/90 flex items-center gap-1 font-mono">
                  <Clock className="w-2.5 h-2.5" />
                  Due: {item.due_date}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
