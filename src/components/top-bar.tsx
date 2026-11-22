import React, { useEffect, useState } from 'react';
import {
  SpeakerHigh as SpeakerHighIcon,
  SpeakerSimpleSlash as SpeakerSimpleSlashIcon,
  MagnifyingGlass as MagnifyingGlassIcon,
  Plus as PlusIcon,
} from '@phosphor-icons/react';
import { ttsService, TTSState } from '../services/tts';
import type { EmailThread } from '../types';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenQuickAdd: () => void;
  emails: EmailThread[];
}

export const TopBar: React.FC<TopBarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenQuickAdd,
  emails,
}) => {
  const [ttsState, setTtsState] = useState<TTSState>({ isPlaying: false, currentText: null });

  useEffect(() => {
    return ttsService.subscribe(setTtsState);
  }, []);

  const handleMouseDown = async (e: React.MouseEvent) => {
    // Only initiate window drag on left-click when not clicking on an interactive control
    if (e.button === 0 && (e.target as HTMLElement).closest('button, input, a') === null) {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().startDragging();
      } catch {
        // Fallback for browser testing
      }
    }
  };

  const handleToggleDigest = () => {
    if (ttsState.isPlaying) {
      ttsService.stop();
      return;
    }

    const unread = emails.filter((e) => !e.is_read || e.category === 'Action' || e.category === 'Newsletter');
    if (unread.length === 0) {
      ttsService.speak('Inbox is up to date.');
      return;
    }

    const digestText = [
      `You have ${unread.length} updates.`,
      ...unread.slice(0, 3).map((item) => `${item.subject}. ${item.ai_summary || item.snippet}`),
    ].join('. ');

    ttsService.speak(digestText);
  };

  return (
    <header
      data-tauri-drag-region
      onMouseDown={handleMouseDown}
      className="h-11 bg-[#17171a] border-b border-white/[0.06] flex items-center justify-between px-3 select-none shrink-0 cursor-default"
    >
      {/* Left traffic-light spacer (draggable) */}
      <div data-tauri-drag-region className="w-18 shrink-0 h-full" />

      {/* Center Search Input (interactive, stop propagation) */}
      <div
        className="flex-1 max-w-sm mx-auto"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center">
          <MagnifyingGlassIcon className="w-3.5 h-3.5 absolute left-2.5 text-[#86868b] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search"
            className="w-full bg-[#232327] text-[13px] text-[#f7f7f8] placeholder-[#86868b] pl-8 pr-8 py-1 rounded-md border border-white/[0.05] focus:outline-none focus:bg-[#28282d] focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/40 transition-all"
          />
          {searchQuery ? (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 text-[11px] text-[#86868b] hover:text-[#f7f7f8]"
            >
              ×
            </button>
          ) : (
            <kbd className="absolute right-2 text-[10px] text-[#6b6b75] font-mono">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Right Actions (interactive, stop propagation) */}
      <div
        className="flex items-center gap-1.5"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleToggleDigest}
          className={`h-7 px-2.5 flex items-center gap-1.5 rounded-md text-[12px] font-medium transition-all ${
            ttsState.isPlaying
              ? 'bg-[#f59e0b] text-[#121214] font-semibold shadow-[0_0_12px_rgba(245,158,11,0.3)]'
              : 'text-[#9e9ea7] hover:text-amber-300 hover:bg-amber-500/10'
          }`}
          title={ttsState.isPlaying ? 'Stop audio' : 'Listen to briefing'}
        >
          {ttsState.isPlaying ? (
            <SpeakerSimpleSlashIcon className="w-3.5 h-3.5" />
          ) : (
            <SpeakerHighIcon className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span>{ttsState.isPlaying ? 'Stop' : 'Briefing'}</span>
        </button>

        <button
          onClick={onOpenQuickAdd}
          className="h-7 w-7 flex items-center justify-center rounded-md text-[#9e9ea7] hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
          title="New bookmark (⌘⇧S)"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
