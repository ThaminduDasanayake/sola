import React from 'react';
import {
  ArrowSquareOut as ArrowSquareOutIcon,
  SpeakerHigh as SpeakerHighIcon,
  Copy as CopyIcon,
  Check as CheckIcon,
  Sparkle as SparkleIcon,
} from '@phosphor-icons/react';
import { ttsService } from '../services/tts';
import type { Bookmark, EmailThread, ProjectTelemetry } from '../types';

interface DetailPaneProps {
  item: Bookmark | EmailThread | ProjectTelemetry | null;
  type: 'bookmark' | 'email' | 'project' | null;
}

export const DetailPane: React.FC<DetailPaneProps> = ({ item, type }) => {
  const [copied, setCopied] = React.useState(false);

  if (!item || !type) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-500">
        <SparkleIcon className="w-8 h-8 stroke-[1.5] mb-2 text-neutral-600" />
        <p className="text-xs">Select an item from the feed to inspect details</p>
      </div>
    );
  }

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    return (
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-blue-400 font-mono">
              Bookmark / Vault
            </span>
            <h2 className="text-base font-semibold text-neutral-100 mt-1 leading-snug">
              {bookmark.title}
            </h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => handleCopyUrl(bookmark.url)}
              className="p-1.5 rounded-md hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
              title="Copy URL"
            >
              {copied ? <CheckIcon className="w-4 h-4 text-emerald-400" /> : <CopyIcon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => handleOpenBrowser(bookmark.url)}
              className="p-1.5 rounded-md hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
              title="Open in Browser"
            >
              <ArrowSquareOutIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="text-xs font-mono text-neutral-400 bg-black/30 p-2 rounded border border-white/5 break-all">
          {bookmark.url}
        </div>

        {bookmark.description && (
          <div>
            <h4 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Description
            </h4>
            <p className="text-xs text-neutral-300 leading-relaxed bg-[#141820] p-3 rounded-md border border-white/5">
              {bookmark.description}
            </p>
          </div>
        )}

        {bookmark.ai_notes && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-[11px] font-semibold text-blue-400 flex items-center gap-1.5 uppercase tracking-wider">
                <SparkleIcon className="w-3.5 h-3.5" />
                <span>AI Auto-Enrichment Notes</span>
              </h4>
              <button
                onClick={() => ttsService.speak(bookmark.ai_notes || '')}
                className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-white"
              >
                <SpeakerHighIcon className="w-3 h-3 text-blue-400" />
                <span>Read Notes</span>
              </button>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed bg-blue-950/20 p-3 rounded-md border border-blue-500/20">
              {bookmark.ai_notes}
            </p>
          </div>
        )}

        {bookmark.tags && bookmark.tags.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Indexed Tags (FTS5)
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {bookmark.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-white/5 text-neutral-300 px-2 py-0.5 rounded border border-white/10 font-mono"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (type === 'email') {
    const email = item as EmailThread;
    return (
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-wider text-purple-400 font-mono bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                {email.category}
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">
                {new Date(email.received_at).toLocaleString()}
              </span>
            </div>
            <h2 className="text-base font-semibold text-neutral-100 leading-snug">
              {email.subject}
            </h2>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">{email.sender}</p>
          </div>
          <button
            onClick={() => ttsService.speak(`Subject: ${email.subject}. Summary: ${email.ai_summary || email.snippet}`)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border border-blue-500/30 rounded-md shrink-0 transition-colors"
          >
            <SpeakerHighIcon className="w-3.5 h-3.5 text-blue-400" />
            <span>Read Audio</span>
          </button>
        </div>

        {email.ai_summary && (
          <div className="bg-blue-950/20 border border-blue-500/20 p-3.5 rounded-lg space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400">
              <SparkleIcon className="w-3.5 h-3.5" />
              <span>Structured Gemini Summary</span>
            </div>
            <p className="text-xs text-neutral-200 leading-relaxed">{email.ai_summary}</p>
          </div>
        )}

        {email.action_items && email.action_items.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Action Items
            </h4>
            <div className="space-y-1.5">
              {email.action_items.map((act, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-xs text-neutral-300 bg-[#141820] p-2.5 rounded border border-white/5"
                >
                  <input type="checkbox" className="rounded border-white/20 text-blue-600 focus:ring-0 cursor-pointer" />
                  <span>{act}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
            Original Snippet
          </h4>
          <p className="text-xs text-neutral-400 leading-relaxed bg-[#111419] p-3 rounded border border-white/5 font-mono">
            {email.snippet}
          </p>
        </div>
      </div>
    );
  }

  return null;
};
