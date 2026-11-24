import {
  ArrowSquareOut as ArrowSquareOutIcon,
  Check as CheckIcon,
  Code as CodeIcon,
  Copy as CopyIcon,
  GitBranch as GitBranchIcon,
  Globe as GlobeIcon,
  Pause as PauseIcon,
  Play as PlayIcon,
  SkipBack as SkipBackIcon,
  SkipForward as SkipForwardIcon,
  SpeakerHigh as SpeakerHighIcon,
  Stop as StopIcon,
  Trash as TrashIcon,
  User as UserIcon,
} from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';
import { TTSState, ttsService } from '../services/tts';
import type { Bookmark, EmailThread, ProjectTelemetry } from '../types';
import { HtmlEmailViewer } from './html-email-viewer';

interface DetailPaneProps {
  item: Bookmark | EmailThread | ProjectTelemetry | null;
  type: 'bookmark' | 'email' | 'project' | null;
  onDeleteEmail?: (id: string) => void;
}

export const DetailPane: React.FC<DetailPaneProps> = ({ item, type, onDeleteEmail }) => {
  const [copied, setCopied] = useState(false);
  const [ttsState, setTtsState] = useState<TTSState>(() => ttsService.getState());

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
              {copied ? (
                <CheckIcon className="w-3.5 h-3.5 text-[#30d158]" />
              ) : (
                <CopyIcon className="w-3.5 h-3.5" />
              )}
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
        <div className="max-w-2xl w-full mx-auto px-8 py-6 space-y-6 select-text">
          <div>
            <h1 className="text-[20px] font-semibold text-[#f5f5f7] leading-tight tracking-tight select-text">
              {bookmark.title}
            </h1>
            <p className="text-[12px] text-[#8e8e93] mt-1.5 font-normal">
              Added{' '}
              {new Date(bookmark.created_at).toLocaleDateString([], {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>

          {bookmark.description && (
            <p className="text-[14px] text-[#d6d6dc] leading-relaxed">{bookmark.description}</p>
          )}

          {bookmark.ai_notes && (
            <div className="pt-4 border-t border-white/[0.06] space-y-2">
              <h3 className="text-[12px] font-medium text-[#e5a93c]">Notes</h3>
              <p className="text-[13px] text-[#d6d6dc] leading-relaxed">{bookmark.ai_notes}</p>
            </div>
          )}

          {bookmark.tags && bookmark.tags.length > 0 && (
            <div className="pt-4 border-t border-white/[0.06] flex items-center gap-2">
              <span className="text-[12px] text-[#8e8e93]">Tags:</span>
              <span className="text-[12px] text-[#e5a93c]/90">{bookmark.tags.join(', ')}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (type === 'email') {
    const email = item as EmailThread;
    const textToRead = `${email.subject}. ${email.ai_summary || email.snippet}`;
    const isCurrentEmailAudio = ttsState.currentText === textToRead;
    const hasActiveAudio = isCurrentEmailAudio && (ttsState.isPlaying || ttsState.isPaused);

    return (
      <div className="flex-1 overflow-y-auto flex flex-col bg-[#141416] relative">
        {/* Detail Action Bar */}
        <div className="h-10 border-b border-white/[0.06] flex items-center justify-between px-6 shrink-0 sticky top-0 bg-[#141416]/95 backdrop-blur z-30">
          <span className="text-[12px] text-[#e5a93c] font-medium">{email.category}</span>
          <div className="flex items-center gap-1.5">
            {/* Audio Controls: expands/pushes out to the left when active */}
            <div className="flex items-center">
              {/* Expanded Controller Pill */}
              <div
                className={`flex items-center overflow-hidden transition-all duration-300 ease-out ${
                  hasActiveAudio
                    ? 'max-w-[420px] opacity-100 bg-white/[0.08] border border-white/[0.06] rounded-full p-0.5 gap-1.5 shadow-sm'
                    : 'max-w-0 opacity-0 pointer-events-none'
                }`}
              >
                {/* Stop / Close */}
                <button
                  onClick={() => ttsService.stop()}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[#8e8e93] hover:text-[#ff453a] hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0 ml-0.5"
                  title="Stop audio"
                >
                  <StopIcon weight="fill" className="w-3 h-3" />
                </button>

                {/* 5 Speed Options (2 slomo: 0.5x, 0.75x, normal 1x, 2 fast: 1.25x, 1.5x) */}
                <div className="flex items-center bg-white/[0.04] rounded-full p-0.5 border border-white/[0.04] text-[10px] font-mono shrink-0">
                  {[
                    { label: '0.5x', rate: 0.5 },
                    { label: '0.75x', rate: 0.75 },
                    { label: '1x', rate: 1.0 },
                    { label: '1.25x', rate: 1.25 },
                    { label: '1.5x', rate: 1.5 },
                  ].map(({ label, rate }) => {
                    const isSelected = Math.abs(ttsState.speedRate - rate) < 0.04;
                    return (
                      <button
                        key={rate}
                        onClick={() => ttsService.setRate(rate)}
                        className={`px-1.5 py-0.5 rounded-full transition-all cursor-pointer font-medium ${
                          isSelected
                            ? 'bg-[#e5a93c] text-[#141416] font-semibold shadow-sm'
                            : 'text-[#8e8e93] hover:text-[#f5f5f7] hover:bg-white/[0.06]'
                        }`}
                        title={`Playback speed: ${label}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Previous paragraph */}
                <button
                  onClick={() => ttsService.previous()}
                  disabled={ttsState.currentChunkIndex <= 0}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer shrink-0"
                  title="Previous paragraph"
                >
                  <SkipBackIcon weight="fill" className="w-3 h-3" />
                </button>

                {/* Play / Pause toggle */}
                <button
                  onClick={() => ttsService.togglePlayPause()}
                  className="w-6 h-6 rounded-full bg-[#e5a93c] text-[#141416] flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer shrink-0"
                  title={ttsState.isPlaying ? 'Pause' : 'Resume'}
                >
                  {ttsState.isPlaying ? (
                    <PauseIcon weight="fill" className="w-3 h-3" />
                  ) : (
                    <PlayIcon weight="fill" className="w-3 h-3" />
                  )}
                </button>

                {/* Next paragraph */}
                <button
                  onClick={() => ttsService.next()}
                  disabled={ttsState.currentChunkIndex >= ttsState.totalChunks - 1}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer shrink-0 mr-0.5"
                  title="Next paragraph"
                >
                  <SkipForwardIcon weight="fill" className="w-3 h-3" />
                </button>
              </div>

              {/* Inactive single icon button (shown when audio is not active) */}
              {!hasActiveAudio && (
                <button
                  onClick={() => ttsService.speak(textToRead)}
                  className="w-7 h-7 rounded-full bg-white/[0.08] border border-white/[0.06] hover:bg-white/[0.14] flex items-center justify-center text-white/90 transition-colors shadow-sm cursor-pointer"
                  title="Listen to email"
                >
                  <SpeakerHighIcon className="w-3.5 h-3.5 text-[#e5a93c]" />
                </button>
              )}
            </div>

            <button
              onClick={() => onDeleteEmail?.(email.id)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#8e8e93] hover:text-[#ff453a] hover:bg-white/[0.08] transition-colors cursor-pointer"
              title="Delete email (will not sync again)"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content View */}
        <div className="max-w-3xl w-full mx-auto px-8 py-6 space-y-6 select-text flex-1">
          <div>
            <h1 className="text-[20px] font-semibold text-[#f5f5f7] leading-tight tracking-tight select-text">
              {email.subject}
            </h1>
            <div className="space-y-1.5 mt-2.5">
              <div className="flex items-center justify-between text-[12px] text-[#8e8e93]">
                <span className="text-[#f5f5f7] font-medium select-text">{email.sender}</span>
                <span>
                  {new Date(email.received_at).toLocaleString([], {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
              {email.account_email && (
                <div className="flex items-center gap-1.5 text-[11.5px] text-[#8e8e93]">
                  <span>To:</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.06] text-[#d1d1d6] font-medium select-text">
                    <UserIcon className="w-3 h-3 text-[#e5a93c]" />
                    {email.account_email}
                  </span>
                </div>
              )}
            </div>
          </div>

          {email.ai_summary && (
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
              <p className="text-[13px] text-[#f5f5f7] leading-relaxed select-text">
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
                    className="flex items-start gap-2.5 text-[13px] text-[#d6d6dc] select-text"
                  >
                    <span className="text-[#e5a93c]">•</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Email Body: Rich HTML if available, otherwise clean text snippet */}
          <div className="pt-4 border-t border-white/[0.06]">
            {email.body_html ? (
              <HtmlEmailViewer
                html={email.body_html}
                onParagraphClick={(clickedText) => {
                  ttsService.playFromText(clickedText, textToRead);
                }}
              />
            ) : (
              <div className="space-y-3">
                {email.snippet.split(/\n+/).map((para, idx) => {
                  const trimmed = para.trim();
                  if (!trimmed) return null;
                  return (
                    <p
                      key={idx}
                      onClick={() => ttsService.playFromText(trimmed, textToRead)}
                      className="text-[13px] text-[#8e8e93] leading-relaxed whitespace-pre-wrap select-text hover:text-[#f5f5f7] hover:bg-[#e5a93c]/10 rounded-lg p-2 -mx-2 transition-colors cursor-pointer"
                      title="Click to start reading from here"
                    >
                      {trimmed}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'project') {
    const project = item as ProjectTelemetry;
    // Guaranteed permanent production site URL (never an ephemeral/canceled deployment hash)
    const siteUrl = project.live_url || `https://${project.name.toLowerCase()}.vercel.app`;
    const previewUrl = project.deployment_url;
    const isLatestCanceled = project.latest_build_state === 'CANCELED';
    const vercelDashboardUrl = `https://vercel.com/~/projects/${project.name}`;

    let statusBadge = {
      label: 'Unknown',
      dotColor: 'bg-[#8e8e93]',
      bgColor: 'bg-white/[0.06]',
      textColor: 'text-[#8e8e93]',
      isPulsing: false,
    };

    if (project.last_status === 'healthy') {
      statusBadge = {
        label: isLatestCanceled ? 'Live (Preview Canceled)' : 'Ready / Live',
        dotColor: 'bg-[#30d158]',
        bgColor: 'bg-[#30d158]/10',
        textColor: 'text-[#30d158]',
        isPulsing: false,
      };
    } else if (project.last_status === 'building') {
      statusBadge = {
        label: 'Building...',
        dotColor: 'bg-[#e5a93c]',
        bgColor: 'bg-[#e5a93c]/10',
        textColor: 'text-[#e5a93c]',
        isPulsing: true,
      };
    } else if (project.last_status === 'failed') {
      statusBadge = {
        label: 'Deployment Error',
        dotColor: 'bg-[#ff453a]',
        bgColor: 'bg-[#ff453a]/10',
        textColor: 'text-[#ff453a]',
        isPulsing: false,
      };
    } else if (project.last_status === 'warning') {
      statusBadge = {
        label: 'Build Canceled',
        dotColor: 'bg-[#ff9f0a]',
        bgColor: 'bg-[#ff9f0a]/10',
        textColor: 'text-[#ff9f0a]',
        isPulsing: false,
      };
    }

    return (
      <div className="flex-1 overflow-y-auto flex flex-col bg-[#141416]">
        {/* Detail Action Bar */}
        <div className="h-10 border-b border-white/[0.06] flex items-center justify-between px-6 shrink-0 sticky top-0 bg-[#141416]/95 backdrop-blur z-20">
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[#8e8e93]">Vercel Project</span>
            <span className="text-[11px] text-[#e5a93c] font-mono">
              {project.vercel_project_id || 'prj_live'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleCopy(siteUrl)}
              className="h-7 px-2.5 rounded-full flex items-center gap-1 text-[12px] text-[#8e8e93] hover:text-[#f5f5f7] hover:bg-white/[0.08] transition-colors cursor-pointer"
              title="Copy Permanent Site URL"
            >
              {copied ? (
                <CheckIcon className="w-3.5 h-3.5 text-[#30d158]" />
              ) : (
                <CopyIcon className="w-3.5 h-3.5" />
              )}
              <span>{copied ? 'Copied' : 'Copy Site URL'}</span>
            </button>
            <button
              onClick={() => handleOpenBrowser(siteUrl)}
              className="h-7 px-3 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.06] text-[12px] font-medium text-[#f5f5f7] flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Visit Permanent Live Site"
            >
              <GlobeIcon className="w-3.5 h-3.5 text-[#30d158]" />
              <span>Visit Site</span>
            </button>

            <button
              onClick={() => handleOpenBrowser(vercelDashboardUrl)}
              className="h-7 px-3 rounded-full bg-[#e5a93c]/15 hover:bg-[#e5a93c]/25 border border-[#e5a93c]/30 text-[12px] font-medium text-[#e5a93c] flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open Project on Vercel Dashboard"
            >
              <ArrowSquareOutIcon className="w-3.5 h-3.5" />
              <span>Vercel Dashboard</span>
            </button>
          </div>
        </div>

        {/* Content View */}
        <div className="max-w-3xl w-full mx-auto px-8 py-6 space-y-6 select-text flex-1">
          {/* Project Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-[22px] font-semibold text-[#f5f5f7] leading-tight tracking-tight select-text">
                  {project.name}
                </h1>
                {project.framework && (
                  <span className="px-2 py-0.5 rounded-md bg-white/[0.08] text-[11px] font-mono text-[#d1d1d6] capitalize border border-white/[0.06]">
                    {project.framework}
                  </span>
                )}
              </div>

              {project.repo_slug && (
                <div className="flex items-center gap-1.5 mt-2 text-[12.5px] text-[#8e8e93]">
                  <CodeIcon className="w-3.5 h-3.5 text-[#e5a93c]" />
                  <a
                    href={`https://github.com/${project.repo_slug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleOpenBrowser(`https://github.com/${project.repo_slug}`);
                    }}
                    className="hover:text-[#f5f5f7] hover:underline"
                  >
                    {project.repo_slug}
                  </a>
                </div>
              )}
            </div>

            {/* Status Pill */}
            <div
              className={`px-3 py-1 rounded-full border border-white/[0.08] flex items-center gap-2 ${statusBadge.bgColor} ${statusBadge.textColor} text-[12px] font-medium shrink-0 shadow-sm`}
            >
              <span
                className={`w-2 h-2 rounded-full ${statusBadge.dotColor} ${
                  statusBadge.isPulsing ? 'animate-pulse' : ''
                }`}
              />
              <span>{statusBadge.label}</span>
            </div>
          </div>

          {/* Cards Bento Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Card 1: Permanent Site URL */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-[#8e8e93]">
                <span className="uppercase tracking-wider font-semibold">
                  Live Site URL (Permanent)
                </span>
                <GlobeIcon className="w-3.5 h-3.5 text-[#30d158]" />
              </div>
              <a
                href={siteUrl}
                onClick={(e) => {
                  e.preventDefault();
                  handleOpenBrowser(siteUrl);
                }}
                className="text-[14px] font-mono font-medium text-[#f5f5f7] hover:text-[#e5a93c] transition-colors truncate block"
              >
                {siteUrl.replace(/^https?:\/\//, '')}
              </a>

              {/* Distinguish permanent site from temporary deployment preview */}
              {previewUrl && previewUrl !== siteUrl && (
                <div className="pt-2 border-t border-white/[0.04] text-[11.5px] space-y-1">
                  <span className="text-[#8e8e93] block">Latest Branch Preview:</span>
                  {isLatestCanceled ? (
                    <div className="flex items-center gap-1.5 text-[#ff9f0a]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ff9f0a]" />
                      <span>Preview build was canceled (live site unaffected)</span>
                    </div>
                  ) : (
                    <a
                      href={previewUrl}
                      onClick={(e) => {
                        e.preventDefault();
                        handleOpenBrowser(previewUrl);
                      }}
                      className="text-[#8e8e93] hover:text-[#d1d1d6] hover:underline font-mono truncate block"
                      title="Temporary preview deployment"
                    >
                      {previewUrl.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              )}

              {project.last_deployment_at && (
                <p className="text-[11px] text-[#8e8e93] pt-1">
                  Updated{' '}
                  {new Date(project.last_deployment_at).toLocaleString([], {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              )}
            </div>

            {/* Card 2: Git Commit & Branch */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between text-[11px] text-[#8e8e93]">
                <span className="uppercase tracking-wider font-semibold">Latest Commit</span>
                <GitBranchIcon className="w-3.5 h-3.5 text-[#e5a93c]" />
              </div>
              <p className="text-[13px] text-[#f5f5f7] line-clamp-2 leading-relaxed">
                {project.last_commit_message || 'No commit message attached to latest build.'}
              </p>
              <div className="flex items-center justify-between text-[11px] text-[#8e8e93] pt-1 border-t border-white/[0.04]">
                <span>
                  Branch:{' '}
                  <strong className="text-[#d1d1d6] font-mono">
                    {project.last_commit_branch || 'main'}
                  </strong>
                </span>
                {project.last_commit_author && (
                  <span>
                    by <strong className="text-[#d1d1d6]">{project.last_commit_author}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Telemetry & Health Info */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] font-medium text-[#f5f5f7]">
                Infrastructure & Telemetry
              </span>
              <span className="text-[11px] font-mono text-[#8e8e93]">
                Checked{' '}
                {new Date(project.last_checked_at).toLocaleTimeString([], { timeStyle: 'short' })}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-[12px]">
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                <span className="text-[11px] text-[#8e8e93] block">Edge Network</span>
                <span className="text-[#f5f5f7] font-medium mt-0.5 block">
                  Vercel Global Anycast
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                <span className="text-[11px] text-[#8e8e93] block">SSL / TLS</span>
                <span className="text-[#30d158] font-medium mt-0.5 block">Automated & Active</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                <span className="text-[11px] text-[#8e8e93] block">Project ID</span>
                <span className="text-[#d1d1d6] font-mono text-[11px] mt-0.5 block truncate">
                  {project.vercel_project_id || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
