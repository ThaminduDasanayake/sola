import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Search, Plus, Sparkles, Cpu } from 'lucide-react';
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

  const handleReadDigest = () => {
    if (ttsState.isPlaying) {
      ttsService.stop();
      return;
    }

    const unread = emails.filter((e) => !e.is_read || e.category === 'Action' || e.category === 'Newsletter');
    if (unread.length === 0) {
      ttsService.speak('Good morning! Your inbox and digests are completely caught up. Zero pending action items.');
      return;
    }

    const digestText = [
      `Good morning! Here is your Sola daily briefing. You have ${unread.length} priority updates.`,
      ...unread.slice(0, 3).map((item, i) => `Item ${i + 1}: ${item.subject}. ${item.ai_summary || item.snippet}`),
      'Briefing complete. Have a productive day.',
    ].join('. ');

    ttsService.speak(digestText);
  };

  return (
    <header className="titlebar-drag-region h-12 bg-[#0d0f12] border-b border-white/8 flex items-center justify-between px-4 select-none shrink-0">
      {/* Left traffic-light spacer on macOS */}
      <div className="flex items-center gap-3 pl-16 no-drag">
        <span className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">
          Sola
        </span>
        <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 font-mono">
          macOS Native
        </span>
      </div>

      {/* Center Search Bar */}
      <div className="flex-1 max-w-md mx-4 no-drag">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-3 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Instant FTS5 search (bookmarks, emails, tags)..."
            className="w-full bg-[#161a22] text-xs text-neutral-200 placeholder-neutral-500 pl-8 pr-12 py-1.5 rounded-md border border-white/10 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
          <kbd className="absolute right-2.5 text-[10px] font-mono text-neutral-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center gap-2 no-drag">
        {/* Morning Briefing Audio Button */}
        <button
          onClick={handleReadDigest}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border transition-all ${
            ttsState.isPlaying
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
              : 'bg-white/5 text-neutral-300 hover:text-white hover:bg-white/10 border-white/10'
          }`}
          title="Play hands-free morning audio briefing using macOS native speech synthesis"
        >
          {ttsState.isPlaying ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-amber-400" />
              <span>Stop Briefing</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Read Digest</span>
            </>
          )}
        </button>

        {/* Quick Add Link */}
        <button
          onClick={onOpenQuickAdd}
          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-md shadow-sm transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Capture URL</span>
        </button>
      </div>
    </header>
  );
};
