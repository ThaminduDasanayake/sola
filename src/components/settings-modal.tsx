import React, { useState, useEffect, useMemo } from 'react';
import {
  X as XIcon,
  SpeakerHigh as SpeakerHighIcon,
  User as UserIcon,
  Check as CheckIcon,
  Sparkle as SparkleIcon,
} from '@phosphor-icons/react';
import { ttsService } from '../services/tts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// macOS legacy novelty and sound-effect voices to exclude from the curated list
const NOVELTY_VOICE_NAMES = new Set([
  'bad news',
  'bahh',
  'bells',
  'boing',
  'bubbles',
  'cellos',
  'deranged',
  'good news',
  'hysterical',
  'jester',
  'junior',
  'organ',
  'princess',
  'ralph',
  'trinoids',
  'whisper',
  'wobble',
  'zarvox',
  'albert',
  'fred',
  'kathy',
]);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [draftVoice, setDraftVoice] = useState<string>('');
  const [draftRate, setDraftRate] = useState<number>(1.05);
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      ttsService.stop();
      return;
    }

    const load = () => {
      const available = ttsService.getVoices();
      setVoices(available);

      const savedVoice = ttsService.getSelectedVoiceName();
      if (savedVoice && available.some((v) => v.name === savedVoice)) {
        setDraftVoice(savedVoice);
      } else {
        // Preferred default: Siri -> Ava -> Samantha -> Daniel -> first available
        const defaultV =
          available.find((v) => v.name.toLowerCase().includes('siri')) ||
          available.find((v) => v.name.includes('Ava')) ||
          available.find((v) => v.name.includes('Samantha')) ||
          available.find((v) => v.name.includes('Daniel')) ||
          available[0];
        if (defaultV) setDraftVoice(defaultV.name);
      }

      setDraftRate(ttsService.getRate());
    };

    load();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = load;
    }
  }, [isOpen]);

  // Curate, clean, and prioritize natural voices
  const curatedVoices = useMemo(() => {
    const seenNames = new Set<string>();
    const cleanList = voices.filter((v) => {
      const lowerName = v.name.toLowerCase();
      // Only English voices
      if (!v.lang.startsWith('en')) return false;
      // Filter out legacy joke/sound-effect voices
      if (NOVELTY_VOICE_NAMES.has(lowerName)) return false;
      // Deduplicate identical names
      if (seenNames.has(v.name)) return false;
      seenNames.add(v.name);
      return true;
    });

    // Score for natural / AI prioritization
    const getPriority = (name: string) => {
      const lower = name.toLowerCase();
      if (lower.includes('siri')) return 1;
      if (lower.includes('ava') || lower.includes('zoe') || lower.includes('evan')) return 2;
      if (lower.includes('samantha') || lower.includes('daniel')) return 3;
      if (lower.includes('allison') || lower.includes('nathan') || lower.includes('oliver')) return 4;
      return 10;
    };

    return cleanList.sort((a, b) => {
      const pA = getPriority(a.name);
      const pB = getPriority(b.name);
      if (pA !== pB) return pA - pB;
      return a.name.localeCompare(b.name);
    });
  }, [voices]);

  if (!isOpen) return null;

  const handleCancel = () => {
    ttsService.stop();
    onClose();
  };

  const handleSave = () => {
    ttsService.stop();
    if (draftVoice) {
      ttsService.setSelectedVoiceName(draftVoice);
    }
    ttsService.setRate(draftRate);
    onClose();
  };

  const handleTestVoice = () => {
    setIsPlayingTest(true);
    ttsService.speak(
      'Good morning. You have three unread messages in your inbox today.',
      {
        voiceName: draftVoice,
        rate: draftRate,
      }
    );
    setTimeout(() => setIsPlayingTest(false), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1e1e20] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="h-12 border-b border-white/[0.08] flex items-center justify-between px-5">
          <span className="text-[14px] font-semibold text-[#f5f5f7]">Settings</span>
          <button
            onClick={handleCancel}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#8e8e93] hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 text-[#f5f5f7]">
          {/* Section: Audio & Speech */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wider">
              <SpeakerHighIcon className="w-4 h-4 text-[#e5a93c]" />
              <span>Voice & Speech Synthesis</span>
            </div>

            <div className="bg-[#141416] p-4 rounded-xl border border-white/[0.06] space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#d1d1d6] mb-1.5">
                  Briefing Voice
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={draftVoice}
                    onChange={(e) => setDraftVoice(e.target.value)}
                    className="flex-1 bg-[#242426] text-[13px] text-[#f5f5f7] px-3 py-2 rounded-xl border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-white/20"
                  >
                    {curatedVoices.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name.includes('Siri') ? `★ ${v.name}` : v.name} ({v.lang})
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleTestVoice}
                    className="h-9 px-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.08] text-[12px] font-medium text-[#f5f5f7] flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    <SpeakerHighIcon className="w-3.5 h-3.5 text-[#e5a93c]" />
                    <span>{isPlayingTest ? 'Testing...' : 'Test'}</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[12px] font-medium text-[#d1d1d6] mb-1.5">
                  <span>Speech Rate</span>
                  <span className="font-mono text-[#8e8e93]">{draftRate.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.5"
                  step="0.05"
                  value={draftRate}
                  onChange={(e) => setDraftRate(parseFloat(e.target.value))}
                  className="w-full accent-[#e5a93c] cursor-pointer"
                />
              </div>

              {/* Siri / Neural Voice Tip Banner */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 text-[11.5px] text-[#8e8e93] leading-relaxed flex items-start gap-2.5">
                <SparkleIcon className="w-4 h-4 text-[#e5a93c] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#d1d1d6] font-medium">Want Apple's Siri AI Voice?</span>
                  <p className="mt-0.5">
                    Download them in <span className="text-[#f5f5f7]">macOS System Settings → Accessibility → Spoken Content → System Voice → Manage Voices</span>. Once downloaded, they automatically appear at the top of this list.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Email Inboxes */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wider">
              <UserIcon className="w-4 h-4 text-[#e5a93c]" />
              <span>Connected Inboxes</span>
            </div>

            <div className="bg-[#141416] p-4 rounded-xl border border-white/[0.06] text-[12px] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#d1d1d6]">Authentication</span>
                <span className="text-[#8e8e93] font-mono">Local .env (IMAP / TLS)</span>
              </div>
              <p className="text-[11px] text-[#8e8e93] pt-1 border-t border-white/[0.04]">
                To connect your 2 Gmails, add your emails and app passwords to <code className="text-[#e5a93c]">.env</code> in the project folder.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer with Cancel & Save Buttons */}
        <div className="h-14 border-t border-white/[0.08] bg-[#161618] px-5 flex items-center justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-4 py-1.5 rounded-full text-[13px] font-medium text-[#8e8e93] hover:text-[#f5f5f7] hover:bg-white/[0.08] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-1.5 rounded-full bg-[#e5a93c] hover:bg-[#d4972d] text-black text-[13px] font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <CheckIcon className="w-3.5 h-3.5" weight="bold" />
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
};
