import React, { useState } from 'react';
import {
  ArrowSquareOut as ArrowSquareOutIcon,
  SpeakerHigh as SpeakerHighIcon,
  Copy as CopyIcon,
  Check as CheckIcon,
} from '@phosphor-icons/react';
import { ttsService } from '../services/tts';
import type { Bookmark, EmailThread, ProjectTelemetry } from '../types';

interface DetailPaneProps {
  item: Bookmark | EmailThread | ProjectTelemetry | null;
  type: 'bookmark' | 'email' | 'project' | null;
}

export const DetailPane: React.FC<DetailPaneProps> = ({ item, type }) => {
  const [copied, setCopied] = useState(false);

  if (!item || !type) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#86868b]">
        <p className="text-[13px]">No item selected</p>
      </div>
    );
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleOpenBrowser = async (url: string) => {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
    } catch {
      window.open(url, '_blank');
    }
  };

  if (type === 'bookmark') {
    const bookmark = item as Bookmark;
    const host = new URL(
      bookmark.url.startsWith('http') ? bookmark.url : `https://${bookmark.url}`
    ).hostname.replace('www.', '');

    return (
      <div className="flex-1 overflow-y-auto flex flex-col bg-[#141417]">
        {/* Detail Action Bar */}
        <div className="h-10 border-b border-white/[0.06] flex items-center justify-between px-6 shrink-0">
          <span className="text-[12px] text-[#86868b]">{host}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleCopy(bookmark.url)}
              className="h-7 px-2 rounded flex items-center gap-1 text-[12px] text-[#9e9ea7] hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
              title="Copy URL"
            >
              {copied ? <CheckIcon className="w-3.5 h-3.5 text-amber-400" /> : <CopyIcon className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={() => handleOpenBrowser(bookmark.url)}
              className="h-7 w-7 rounded flex items-center justify-center text-[#9e9ea7] hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
              title="Open in Safari"
            >
              <ArrowSquareOutIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content View */}
        <div className="max-w-2xl w-full mx-auto px-8 py-6 space-y-6">
          <div>
            <h1 className="text-[20px] font-semibold text-[#f7f7f8] leading-tight tracking-tight">
              {bookmark.title}
            </h1>
            <p className="text-[12px] text-[#86868b] mt-1.5 font-normal">
              Added {new Date(bookmark.created_at).toLocaleDateString([], {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>

          {bookmark.description && (
            <p className="text-[14px] text-[#d6d6dc] leading-relaxed">
              {bookmark.description}
            </p>
          )}

          {bookmark.ai_notes && (
            <div className="pt-4 border-t border-white/[0.06] space-y-2">
              <h3 className="text-[12px] font-medium text-amber-400/90">Notes</h3>
              <p className="text-[13px] text-[#d6d6dc] leading-relaxed">
                {bookmark.ai_notes}
              </p>
            </div>
          )}

          {bookmark.tags && bookmark.tags.length > 0 && (
            <div className="pt-4 border-t border-white/[0.06] flex items-center gap-2">
              <span className="text-[12px] text-[#86868b]">Tags:</span>
              <span className="text-[12px] text-amber-300/80 font-mono">
                {bookmark.tags.join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (type === 'email') {
    const email = item as EmailThread;
    return (
      <div className="flex-1 overflow-y-auto flex flex-col bg-[#141417]">
        {/* Detail Action Bar */}
        <div className="h-10 border-b border-white/[0.06] flex items-center justify-between px-6 shrink-0">
          <span className="text-[12px] text-amber-400/90 font-medium">{email.category}</span>
          <button
            onClick={() =>
              ttsService.speak(
                `${email.subject}. ${email.ai_summary || email.snippet}`
              )
            }
            className="h-7 px-2.5 rounded flex items-center gap-1.5 text-[12px] text-[#9e9ea7] hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
          >
            <SpeakerHighIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Listen</span>
          </button>
        </div>

        {/* Content View */}
        <div className="max-w-2xl w-full mx-auto px-8 py-6 space-y-6">
          <div>
            <h1 className="text-[20px] font-semibold text-[#f7f7f8] leading-tight tracking-tight">
              {email.subject}
            </h1>
            <div className="flex items-center justify-between text-[12px] text-[#86868b] mt-2">
              <span>{email.sender}</span>
              <span>{new Date(email.received_at).toLocaleString([], {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}</span>
            </div>
          </div>

          {email.ai_summary && (
            <div className="p-3.5 rounded-lg bg-amber-500/[0.05] border border-amber-500/20">
              <p className="text-[13px] text-[#f0f0f3] leading-relaxed">
                {email.ai_summary}
              </p>
            </div>
          )}

          {email.action_items && email.action_items.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[12px] font-medium text-amber-400/90">Action Items</h3>
              <ul className="space-y-1.5">
                {email.action_items.map((action, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-[13px] text-[#d6d6dc]"
                  >
                    <span className="text-amber-400">•</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-4 border-t border-white/[0.06]">
            <p className="text-[13px] text-[#9e9ea7] leading-relaxed whitespace-pre-wrap">
              {email.snippet}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'project') {
    const project = item as ProjectTelemetry;
    return (
      <div className="flex-1 overflow-y-auto flex flex-col bg-[#141417]">
        <div className="h-10 border-b border-white/[0.06] flex items-center justify-between px-6 shrink-0">
          <span className="text-[12px] text-[#86868b]">Telemetry</span>
          <span className="text-[12px] text-[#30d158] capitalize">
            {project.last_status}
          </span>
        </div>

        <div className="max-w-2xl w-full mx-auto px-8 py-6 space-y-6">
          <div>
            <h1 className="text-[20px] font-semibold text-[#f7f7f8] tracking-tight">
              {project.name}
            </h1>
            {project.repo_slug && (
              <p className="text-[13px] text-amber-400/90 mt-1">{project.repo_slug}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              <div className="text-[11px] text-[#86868b]">Pull Requests</div>
              <div className="text-[20px] font-semibold text-[#f7f7f8] mt-1">
                {project.open_prs ?? 0}
              </div>
            </div>
            <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              <div className="text-[11px] text-[#86868b]">Storage Used</div>
              <div className="text-[20px] font-semibold text-[#f7f7f8] mt-1">
                {project.db_storage_used_pct ?? 0}%
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
