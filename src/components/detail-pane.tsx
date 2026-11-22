import React, { useState, useEffect } from 'react';
import {
  ArrowSquareOut as ArrowSquareOutIcon,
  SpeakerHigh as SpeakerHighIcon,
  SpeakerSimpleSlash as SpeakerSimpleSlashIcon,
  Copy as CopyIcon,
  Check as CheckIcon,
  User as UserIcon,
} from '@phosphor-icons/react';
import { ttsService, TTSState } from '../services/tts';
import type { Bookmark, EmailThread, ProjectTelemetry } from '../types';

interface DetailPaneProps {
  item: Bookmark | EmailThread | ProjectTelemetry | null;
  type: 'bookmark' | 'email' | 'project' | null;
}

export const DetailPane: React.FC<DetailPaneProps> = ({ item, type }) => {
  const [copied, setCopied] = useState(false);
  const [ttsState, setTtsState] = useState<TTSState>({ isPlaying: false, currentText: null });

  useEffect(() => {
    return ttsService.subscribe(setTtsState);
  }, []);

  if (!item || !type) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
        <p className="text-[14px] font-medium text-[#8e8e93]">No Selection</p>
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
      <div className="flex-1 overflow-y-auto flex flex-col bg-[#141416]">
        {/* Detail Action Bar */}
        <div className="h-10 border-b border-white/[0.06] flex items-center justify-between px-6 shrink-0">
          <span className="text-[12px] text-[#8e8e93]">{host}</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleCopy(bookmark.url)}
              className="h-7 px-3 rounded-full flex items-center gap-1 text-[12px] text-[#8e8e93] hover:text-[#f5f5f7] hover:bg-white/[0.08] transition-colors"
              title="Copy URL"
            >
              {copied ? <CheckIcon className="w-3.5 h-3.5 text-[#30d158]" /> : <CopyIcon className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={() => handleOpenBrowser(bookmark.url)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#8e8e93] hover:text-[#f5f5f7] hover:bg-white/[0.08] transition-colors"
              title="Open in Safari"
            >
              <ArrowSquareOutIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content View */}
        <div className="max-w-2xl w-full mx-auto px-8 py-6 space-y-6">
          <div>
            <h1 className="text-[20px] font-semibold text-[#f5f5f7] leading-tight tracking-tight">
              {bookmark.title}
            </h1>
            <p className="text-[12px] text-[#8e8e93] mt-1.5 font-normal">
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
              <h3 className="text-[12px] font-medium text-[#e5a93c]">Notes</h3>
              <p className="text-[13px] text-[#d6d6dc] leading-relaxed">
                {bookmark.ai_notes}
              </p>
            </div>
          )}

          {bookmark.tags && bookmark.tags.length > 0 && (
            <div className="pt-4 border-t border-white/[0.06] flex items-center gap-2">
              <span className="text-[12px] text-[#8e8e93]">Tags:</span>
              <span className="text-[12px] text-[#e5a93c]/90">
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
    const textToRead = `${email.subject}. ${email.ai_summary || email.snippet}`;
    const isThisPlaying = ttsState.isPlaying && ttsState.currentText === textToRead;

    return (
      <div className="flex-1 overflow-y-auto flex flex-col bg-[#141416]">
        {/* Detail Action Bar */}
        <div className="h-10 border-b border-white/[0.06] flex items-center justify-between px-6 shrink-0">
          <span className="text-[12px] text-[#e5a93c] font-medium">{email.category}</span>
          <button
            onClick={() => ttsService.toggle(textToRead)}
            className={`h-7 px-3 rounded-full flex items-center gap-1.5 text-[12px] font-medium transition-colors ${
              isThisPlaying
                ? 'bg-[#e5a93c] text-[#1a1918]'
                : 'text-[#8e8e93] hover:text-[#f5f5f7] hover:bg-white/[0.08]'
            }`}
          >
            {isThisPlaying ? (
              <SpeakerSimpleSlashIcon className="w-3.5 h-3.5" />
            ) : (
              <SpeakerHighIcon className="w-3.5 h-3.5 text-[#e5a93c]" />
            )}
            <span>{isThisPlaying ? 'Stop' : 'Listen'}</span>
          </button>
        </div>

        {/* Content View */}
        <div className="max-w-2xl w-full mx-auto px-8 py-6 space-y-6">
          <div>
            <h1 className="text-[20px] font-semibold text-[#f5f5f7] leading-tight tracking-tight">
              {email.subject}
            </h1>
            <div className="space-y-1.5 mt-2.5">
              <div className="flex items-center justify-between text-[12px] text-[#8e8e93]">
                <span className="text-[#f5f5f7] font-medium">{email.sender}</span>
                <span>{new Date(email.received_at).toLocaleString([], {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}</span>
              </div>
              {email.account_email && (
                <div className="flex items-center gap-1.5 text-[11.5px] text-[#8e8e93]">
                  <span>To:</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.06] text-[#d1d1d6] font-medium">
                    <UserIcon className="w-3 h-3 text-[#e5a93c]" />
                    {email.account_email}
                  </span>
                </div>
              )}
            </div>
          </div>

          {email.ai_summary && (
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
              <p className="text-[13px] text-[#f5f5f7] leading-relaxed">
                {email.ai_summary}
              </p>
            </div>
          )}

          {email.action_items && email.action_items.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[12px] font-medium text-[#e5a93c]">Action Items</h3>
              <ul className="space-y-1.5">
                {email.action_items.map((action, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-[13px] text-[#d6d6dc]"
                  >
                    <span className="text-[#e5a93c]">•</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-4 border-t border-white/[0.06]">
            <p className="text-[13px] text-[#8e8e93] leading-relaxed whitespace-pre-wrap">
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
      <div className="flex-1 overflow-y-auto flex flex-col bg-[#141416]">
        <div className="h-10 border-b border-white/[0.06] flex items-center justify-between px-6 shrink-0">
          <span className="text-[12px] text-[#8e8e93]">Telemetry</span>
          <span className="text-[12px] text-[#30d158] capitalize">
            {project.last_status}
          </span>
        </div>

        <div className="max-w-2xl w-full mx-auto px-8 py-6 space-y-6">
          <div>
            <h1 className="text-[20px] font-semibold text-[#f5f5f7] tracking-tight">
              {project.name}
            </h1>
            {project.repo_slug && (
              <p className="text-[13px] text-[#e5a93c] mt-1">{project.repo_slug}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.04]">
              <div className="text-[11px] text-[#8e8e93]">Pull Requests</div>
              <div className="text-[20px] font-semibold text-[#f5f5f7] mt-1">
                {project.open_prs ?? 0}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.04]">
              <div className="text-[11px] text-[#8e8e93]">Storage Used</div>
              <div className="text-[20px] font-semibold text-[#f5f5f7] mt-1">
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
