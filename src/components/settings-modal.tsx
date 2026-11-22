import React, { useState, useEffect } from 'react';
import {
  X as XIcon,
  SpeakerHigh as SpeakerHighIcon,
  Check as CheckIcon,
  User as UserIcon,
  Sliders as SlidersIcon,
} from '@phosphor-icons/react';
import { ttsService } from '../services/tts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [rate, setRate] = useState<number>(1.05);
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const load = () => {
      const available = ttsService.getVoices();
      setVoices(available);
      const saved = ttsService.getSelectedVoiceName();
      if (saved) {
        setSelectedVoice(saved);
      } else if (available.length > 0) {
        const defaultV =
          available.find((v) => v.name.toLowerCase().includes('siri')) ||
          available.find((v) => v.name.includes('Ava')) ||
          available.find((v) => v.name.includes('Samantha')) ||
          available[0];
        if (defaultV) setSelectedVoice(defaultV.name);
      }
      setRate(ttsService.getRate());
    };

    load();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = load;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedVoice(val);
    ttsService.setSelectedVoiceName(val);
  };

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setRate(val);
    ttsService.setRate(val);
  };

  const handleTestVoice = () => {
    setIsPlayingTest(true);
    ttsService.speak('Hello! This is your voice setting for Sola morning briefings.');
    setTimeout(() => setIsPlayingTest(false), 3000);
  };

  // Sort English voices to the top
  const sortedVoices = [...voices].sort((a, b) => {
    const aEn = a.lang.startsWith('en');
    const bEn = b.lang.startsWith('en');
    if (aEn && !bEn) return -1;
    if (!aEn && bEn) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#242426] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="h-12 border-b border-white/[0.08] flex items-center justify-between px-5">
          <span className="text-[14px] font-semibold text-[#f5f5f7]">Settings</span>
          <button
            onClick={onClose}
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

            <div className="bg-[#1c1c1e] p-4 rounded-xl border border-white/[0.06] space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#d1d1d6] mb-1.5">
                  Spoken Voice
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedVoice}
                    onChange={handleVoiceChange}
                    className="flex-1 bg-[#28282b] text-[13px] text-[#f5f5f7] px-3 py-1.5 rounded-lg border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-white/20"
                  >
                    {sortedVoices.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleTestVoice}
                    className="h-8 px-3 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.08] text-[12px] font-medium text-[#f5f5f7] flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    <SpeakerHighIcon className="w-3.5 h-3.5 text-[#e5a93c]" />
                    <span>Test</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#8e8e93] mt-1.5">
                  Tip: Download neural Siri voices in macOS System Settings → Accessibility → Spoken Content.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-[12px] font-medium text-[#d1d1d6] mb-1">
                  <span>Speech Rate</span>
                  <span className="font-mono text-[#8e8e93]">{rate.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.5"
                  step="0.05"
                  value={rate}
                  onChange={handleRateChange}
                  className="w-full accent-[#e5a93c] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Section: Email Inboxes */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wider">
              <UserIcon className="w-4 h-4 text-[#e5a93c]" />
              <span>Connected Inboxes</span>
            </div>

            <div className="bg-[#1c1c1e] p-4 rounded-xl border border-white/[0.06] text-[12px] space-y-2">
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

        {/* Modal Footer */}
        <div className="h-12 border-t border-white/[0.08] bg-[#1f1f21] px-5 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-white/[0.12] hover:bg-white/[0.2] text-[13px] font-medium text-[#f5f5f7] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
