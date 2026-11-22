import React, { useState, useEffect, useMemo } from 'react';
import {
  SpeakerHigh as SpeakerHighIcon,
  User as UserIcon,
  Check as CheckIcon,
  Sparkle as SparkleIcon,
  EnvelopeSimple as EnvelopeSimpleIcon,
  Command as CommandIcon,
  ArrowsClockwise as ArrowsClockwiseIcon,
  Info as InfoIcon,
  ArrowLeft as ArrowLeftIcon,
  Clock as ClockIcon,
  Folder as FolderIcon,
} from '@phosphor-icons/react';
import { ttsService } from '../services/tts';
import { syncManager } from '../services/sync-manager';
import { revealDatabaseInFinder } from '../services/db';

interface SettingsPageProps {
  onBack?: () => void;
  onSyncInbox?: () => void;
  isSyncing?: boolean;
}

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

type SettingsSection = 'voice' | 'email' | 'general';

export const SettingsPage: React.FC<SettingsPageProps> = ({
  onBack,
  onSyncInbox,
  isSyncing = false,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('voice');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [draftVoice, setDraftVoice] = useState<string>('');
  const [draftRate, setDraftRate] = useState<number>(1.05);
  const [draftLimit, setDraftLimit] = useState<number>(40);
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [isSavedRecently, setIsSavedRecently] = useState(false);
  const [initialSettings, setInitialSettings] = useState<{
    voice: string;
    rate: number;
    limit: number;
  }>({
    voice: '',
    rate: 1.05,
    limit: 40,
  });

  useEffect(() => {
    const load = () => {
      const available = ttsService.getVoices();
      setVoices(available);

      const savedVoice = ttsService.getSelectedVoiceName();
      let currentVoice = '';
      if (savedVoice && available.some((v) => v.name === savedVoice)) {
        currentVoice = savedVoice;
      } else {
        const defaultV =
          available.find((v) => v.name.toLowerCase().includes('siri')) ||
          available.find((v) => v.name.includes('Ava')) ||
          available.find((v) => v.name.includes('Samantha')) ||
          available.find((v) => v.name.includes('Daniel')) ||
          available[0];
        if (defaultV) currentVoice = defaultV.name;
      }

      const currentRate = ttsService.getRate();
      const currentLimit =
        typeof window !== 'undefined'
          ? parseInt(localStorage.getItem('sola_email_limit') || '40', 10)
          : 40;

      setDraftVoice(currentVoice);
      setDraftRate(currentRate);
      setDraftLimit(currentLimit);
      setInitialSettings({
        voice: currentVoice,
        rate: currentRate,
        limit: currentLimit,
      });
    };

    load();
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = load;
      }
    }

    return () => {
      ttsService.stop();
    };
  }, []);

  const hasChanges = useMemo(() => {
    if (!initialSettings.voice && !draftVoice) return false;
    return (
      draftVoice !== initialSettings.voice ||
      Math.abs(draftRate - initialSettings.rate) > 0.001 ||
      draftLimit !== initialSettings.limit
    );
  }, [draftVoice, draftRate, draftLimit, initialSettings]);

  const curatedVoices = useMemo(() => {
    const seenNames = new Set<string>();
    const cleanList = voices.filter((v) => {
      const lowerName = v.name.toLowerCase();
      if (!v.lang.startsWith('en')) return false;
      if (NOVELTY_VOICE_NAMES.has(lowerName)) return false;
      if (seenNames.has(v.name)) return false;
      seenNames.add(v.name);
      return true;
    });

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

  const handleSave = () => {
    if (!hasChanges) return;
    ttsService.stop();
    if (draftVoice) {
      ttsService.setSelectedVoiceName(draftVoice);
    }
    ttsService.setRate(draftRate);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sola_email_limit', draftLimit.toString());
    }
    setInitialSettings({
      voice: draftVoice,
      rate: draftRate,
      limit: draftLimit,
    });
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 2000);
  };

  const handleCancel = () => {
    ttsService.stop();
    setDraftVoice(initialSettings.voice);
    setDraftRate(initialSettings.rate);
    setDraftLimit(initialSettings.limit);
    if (onBack) onBack();
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#141416] text-[#f5f5f7]">
      {/* Settings Sub-Navigation Sidebar */}
      <div className="w-60 border-r border-white/[0.08] bg-[#18181a] p-3 flex flex-col justify-between shrink-0 select-none">
        <div className="space-y-1">
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-[14px] font-semibold text-[#f5f5f7]">Settings</span>
            {onBack && (
              <button
                onClick={onBack}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#8e8e93] hover:text-white hover:bg-white/[0.08] transition-colors"
                title="Back to Inbox"
              >
                <ArrowLeftIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setActiveSection('voice')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-full text-[13px] transition-colors ${
              activeSection === 'voice'
                ? 'bg-white/[0.12] text-[#f5f5f7] font-medium shadow-sm'
                : 'text-[#8e8e93] hover:text-[#d1d1d6] hover:bg-white/[0.05]'
            }`}
          >
            <SpeakerHighIcon
              className="w-4 h-4 text-[#e5a93c]"
              weight={activeSection === 'voice' ? 'fill' : 'regular'}
            />
            <span>Voice & Audio</span>
          </button>

          <button
            onClick={() => setActiveSection('email')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-full text-[13px] transition-colors ${
              activeSection === 'email'
                ? 'bg-white/[0.12] text-[#f5f5f7] font-medium shadow-sm'
                : 'text-[#8e8e93] hover:text-[#d1d1d6] hover:bg-white/[0.05]'
            }`}
          >
            <EnvelopeSimpleIcon
              className="w-4 h-4 text-[#e5a93c]"
              weight={activeSection === 'email' ? 'fill' : 'regular'}
            />
            <span>Inboxes & Sync</span>
          </button>

          <button
            onClick={() => setActiveSection('general')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-full text-[13px] transition-colors ${
              activeSection === 'general'
                ? 'bg-white/[0.12] text-[#f5f5f7] font-medium shadow-sm'
                : 'text-[#8e8e93] hover:text-[#d1d1d6] hover:bg-white/[0.05]'
            }`}
          >
            <CommandIcon
              className="w-4 h-4 text-[#e5a93c]"
              weight={activeSection === 'general' ? 'fill' : 'regular'}
            />
            <span>Shortcuts & About</span>
          </button>
        </div>

        {/* Action Buttons in Sub-Sidebar */}
        <div className="pt-3 border-t border-white/[0.06] space-y-2">
          <button
            onClick={handleSave}
            disabled={!hasChanges && !isSavedRecently}
            className={`w-full h-8 px-4 rounded-full text-[12.5px] font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
              isSavedRecently
                ? 'bg-[#30d158]/20 text-[#30d158] border border-[#30d158]/30 cursor-default'
                : hasChanges
                ? 'bg-[#e5a93c] hover:bg-[#d4972d] text-black cursor-pointer active:scale-[0.98]'
                : 'bg-white/[0.05] text-[#636366] border border-white/[0.04] cursor-not-allowed opacity-50'
            }`}
          >
            <CheckIcon className="w-3.5 h-3.5" weight="bold" />
            <span>{isSavedRecently ? 'Changes Saved!' : 'Save Changes'}</span>
          </button>
          <button
            onClick={handleCancel}
            disabled={!hasChanges}
            className={`w-full h-7 px-4 rounded-full text-[12px] font-medium transition-colors ${
              hasChanges
                ? 'text-[#8e8e93] hover:text-[#f5f5f7] hover:bg-white/[0.06] cursor-pointer'
                : 'text-[#505054] cursor-default opacity-40'
            }`}
          >
            Cancel / Revert
          </button>
        </div>
      </div>

      {/* Main Settings Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Section 1: Voice & Speech */}
          {activeSection === 'voice' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[20px] font-semibold text-[#f5f5f7] tracking-tight">
                  Voice & Speech Synthesis
                </h2>
                <p className="text-[13px] text-[#8e8e93] mt-1">
                  Configure speech playback for hands-free morning audio briefings.
                </p>
              </div>

              <div className="bg-[#1c1c1e] rounded-2xl border border-white/[0.06] p-5 space-y-5">
                <div>
                  <label className="block text-[13px] font-medium text-[#f5f5f7] mb-2">
                    Spoken Voice
                  </label>
                  <div className="flex items-center gap-2.5">
                    <select
                      value={draftVoice}
                      onChange={(e) => setDraftVoice(e.target.value)}
                      className="flex-1 bg-[#28282b] text-[13px] text-[#f5f5f7] px-3.5 py-2 rounded-xl border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-white/20"
                    >
                      {curatedVoices.map((v) => (
                        <option key={v.name} value={v.name}>
                          {v.name.includes('Siri') ? `★ ${v.name}` : v.name} ({v.lang})
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleTestVoice}
                      className="h-9 px-4 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.08] text-[12.5px] font-medium text-[#f5f5f7] flex items-center gap-1.5 shrink-0 transition-colors shadow-sm"
                    >
                      <SpeakerHighIcon className="w-3.5 h-3.5 text-[#e5a93c]" />
                      <span>{isPlayingTest ? 'Speaking...' : 'Test Voice'}</span>
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between text-[13px] font-medium text-[#f5f5f7] mb-2">
                    <span>Speech Rate</span>
                    <span className="font-mono text-[#e5a93c]">{draftRate.toFixed(2)}x</span>
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
                  <div className="flex justify-between text-[11px] text-[#8e8e93] mt-1">
                    <span>Slower (0.75x)</span>
                    <span>Standard (1.0x)</span>
                    <span>Faster (1.5x)</span>
                  </div>
                </div>

                {/* Siri Tip Callout */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-[12px] text-[#8e8e93] leading-relaxed flex items-start gap-3">
                  <SparkleIcon className="w-4 h-4 text-[#e5a93c] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#f5f5f7] font-medium">How to get Siri AI voices on your Mac:</span>
                    <p className="mt-1">
                      Open <strong className="text-[#d1d1d6]">System Settings</strong> → <strong className="text-[#d1d1d6]">Accessibility</strong> → <strong className="text-[#d1d1d6]">Spoken Content</strong> → <strong className="text-[#d1d1d6]">System Voice</strong> → <strong className="text-[#d1d1d6]">Manage Voices...</strong>. Download any <em>Siri</em> voice or <em>Ava (Premium)</em>, and Sola will display them right at the top.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Inboxes & Sync */}
          {activeSection === 'email' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[20px] font-semibold text-[#f5f5f7] tracking-tight">
                  Inboxes & Email Sync
                </h2>
                <p className="text-[13px] text-[#8e8e93] mt-1">
                  Manage your Gmail accounts, IMAP categories, and fetch limits.
                </p>
              </div>

              <div className="bg-[#1c1c1e] rounded-2xl border border-white/[0.06] p-5 space-y-5">
                <div>
                  <span className="text-[13px] font-medium text-[#f5f5f7] block mb-1">
                    Automated Morning Schedule
                  </span>
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                    <div className="flex items-start gap-3">
                      <ClockIcon className="w-4 h-4 text-[#e5a93c] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[12.5px] font-medium text-[#f5f5f7]">
                          Daily 5:30 AM Auto-Sync
                        </span>
                        <p className="text-[11.5px] text-[#8e8e93] mt-0.5">
                          Automatically pulls fresh emails every morning at 5:30 AM before your day starts.
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-[#30d158] bg-[#30d158]/10 px-2.5 py-1 rounded-full border border-[#30d158]/20 shrink-0 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-pulse" />
                      <span>Active</span>
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.06]">
                  <span className="text-[13px] font-medium text-[#f5f5f7] block mb-1">
                    Inbox Category Tabs
                  </span>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                    <div>
                      <span className="text-[12.5px] font-medium text-[#f5f5f7]">
                        Category Separation
                      </span>
                      <p className="text-[11.5px] text-[#8e8e93] mt-0.5">
                        Fetches all mail and organizes into Primary, Updates, and All Mail tabs.
                      </p>
                    </div>
                    <span className="text-[11px] font-medium text-[#e5a93c] bg-[#e5a93c]/10 px-2.5 py-1 rounded-full border border-[#e5a93c]/20 shrink-0">
                      Primary Default
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                  <div>
                    <span className="text-[13px] font-medium text-[#f5f5f7]">Sync Limit</span>
                    <p className="text-[11.5px] text-[#8e8e93] mt-0.5">
                      Maximum number of recent messages fetched per account.
                    </p>
                  </div>
                  <select
                    value={draftLimit}
                    onChange={(e) => setDraftLimit(parseInt(e.target.value, 10))}
                    className="bg-[#28282b] text-[12.5px] text-[#f5f5f7] px-3.5 py-2 rounded-xl border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-white/20"
                  >
                    <option value={20}>20 emails per account</option>
                    <option value={40}>40 emails per account</option>
                    <option value={60}>60 emails per account</option>
                    <option value={100}>100 emails per account</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-white/[0.06]">
                  <span className="text-[13px] font-medium text-[#f5f5f7] block mb-2">
                    Connected Accounts (.env)
                  </span>
                  <div className="space-y-2 text-[12px]">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-[#e5a93c]" />
                        <span className="text-[#d1d1d6]">IMAP TLS Connection</span>
                      </div>
                      <span className="text-[#8e8e93] font-mono">imap.gmail.com:993</span>
                    </div>
                  </div>
                  <p className="text-[11.5px] text-[#8e8e93] mt-2 leading-relaxed">
                    Credentials are stored securely in your local <code className="text-[#e5a93c]">.env</code> file (<code className="text-[#e5a93c]">GMAIL_1_EMAIL</code>, <code className="text-[#e5a93c]">GMAIL_2_EMAIL</code>).
                  </p>
                </div>

                {onSyncInbox && (
                  <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-[12px] text-[#8e8e93]">
                      Last synced:{' '}
                      <strong className="text-[#f5f5f7] font-medium font-mono">
                        {syncManager.formatRelativeLastSync()}
                      </strong>
                    </span>
                    <button
                      onClick={onSyncInbox}
                      disabled={isSyncing}
                      className="h-8 px-4 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.08] text-[12px] font-medium text-[#f5f5f7] flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <ArrowsClockwiseIcon className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#e5a93c]' : ''}`} />
                      <span>{isSyncing ? 'Syncing...' : 'Sync Inboxes Now'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 3: General & Shortcuts */}
          {activeSection === 'general' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[20px] font-semibold text-[#f5f5f7] tracking-tight">
                  Shortcuts & Architecture
                </h2>
                <p className="text-[13px] text-[#8e8e93] mt-1">
                  Local-first shortcuts and system architecture overview.
                </p>
              </div>

              <div className="bg-[#1c1c1e] rounded-2xl border border-white/[0.06] p-5 space-y-4">
                <span className="text-[13px] font-medium text-[#f5f5f7] block">
                  Keyboard Shortcuts
                </span>
                <div className="space-y-2 text-[12.5px]">
                  <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                    <span className="text-[#d1d1d6]">Global Search</span>
                    <kbd className="px-2 py-0.5 rounded-md bg-white/[0.08] font-mono text-[11px] text-[#f5f5f7]">⌘K</kbd>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                    <span className="text-[#d1d1d6]">Quick Add Bookmark</span>
                    <kbd className="px-2 py-0.5 rounded-md bg-white/[0.08] font-mono text-[11px] text-[#f5f5f7]">⌘B</kbd>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                    <span className="text-[#d1d1d6]">Toggle Settings</span>
                    <kbd className="px-2 py-0.5 rounded-md bg-white/[0.08] font-mono text-[11px] text-[#f5f5f7]">⌘,</kbd>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                  <div>
                    <span className="text-[12.5px] font-medium text-[#f5f5f7]">Local Database (`sola.db`)</span>
                    <p className="text-[11.5px] text-[#8e8e93] mt-0.5">
                      Stored in Application Support and linked directly to your project folder.
                    </p>
                  </div>
                  <button
                    onClick={() => revealDatabaseInFinder()}
                    className="h-8 px-3 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.08] text-[12px] font-medium text-[#f5f5f7] flex items-center gap-1.5 transition-colors"
                  >
                    <FolderIcon className="w-3.5 h-3.5 text-[#e5a93c]" />
                    <span>Reveal in Finder</span>
                  </button>
                </div>

                <div className="pt-4 border-t border-white/[0.06] flex items-start gap-3 text-[12px] text-[#8e8e93]">
                  <InfoIcon className="w-4 h-4 text-[#e5a93c] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#f5f5f7] font-medium">Sola Desktop v0.1.0</span>
                    <p className="mt-0.5 leading-relaxed">
                      Built with Tauri v2, SQLite with Full-Text Search (FTS5), React 19, and local Apple Speech Synthesis. All your emails and bookmarks remain 100% on your machine.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
