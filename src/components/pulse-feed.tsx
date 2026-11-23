import {
  ArrowsClockwise as ArrowsClockwiseIcon,
  Gear as GearIcon,
  GitBranch as GitBranchIcon,
  Globe as GlobeIcon,
  WarningCircle as WarningCircleIcon,
} from '@phosphor-icons/react';
import React from 'react';
import type { ProjectTelemetry } from '../types';

interface PulseFeedProps {
  projects: ProjectTelemetry[];
  selectedId: number | null;
  onSelect: (project: ProjectTelemetry) => void;
  onSyncVercel?: () => void;
  isSyncing?: boolean;
  onOpenSettings?: () => void;
  syncError?: string | null;
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export const PulseFeed: React.FC<PulseFeedProps> = ({
  projects,
  selectedId,
  onSelect,
  onSyncVercel,
  isSyncing = false,
  onOpenSettings,
  syncError,
}) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#18181a] select-none">
      {/* Feed Sub-Header */}
      <div className="h-10 px-3.5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-semibold text-[#f5f5f7]">Vercel Deployments</span>
          <span className="text-[11px] font-mono text-[#8e8e93] px-1.5 py-0.2 rounded-full bg-white/[0.06]">
            {projects.length}
          </span>
        </div>

        {onSyncVercel && (
          <button
            onClick={onSyncVercel}
            disabled={isSyncing}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#8e8e93] hover:text-[#f5f5f7] hover:bg-white/[0.08] transition-colors disabled:opacity-40 cursor-pointer"
            title="Refresh Vercel deployments"
          >
            <ArrowsClockwiseIcon
              className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#e5a93c]' : ''}`}
            />
          </button>
        )}
      </div>

      {syncError && (
        <div className="px-3 py-1.5 bg-red-500/10 border-b border-red-500/20 text-[11px] text-red-300 flex items-center gap-1.5">
          <WarningCircleIcon className="w-3.5 h-3.5 shrink-0 text-red-400" />
          <span className="truncate">{syncError}</span>
        </div>
      )}

      {/* Projects List */}
      {projects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-[#f5f5f7] mb-3 shadow-inner">
            <span className="text-[16px] font-bold">▲</span>
          </div>
          <p className="text-[13px] font-medium text-[#d1d1d6]">No Vercel Projects Found</p>
          <p className="text-[11.5px] text-[#636366] mt-1 max-w-[200px] leading-relaxed">
            Connect your Vercel Access Token in Settings to stream deployment telemetry.
          </p>

          <div className="mt-4 flex flex-col gap-2 w-full max-w-[180px]">
            {onSyncVercel && (
              <button
                onClick={onSyncVercel}
                disabled={isSyncing}
                className="w-full py-1.5 px-3 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.08] text-[12px] font-medium text-[#f5f5f7] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowsClockwiseIcon
                  className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#e5a93c]' : ''}`}
                />
                <span>{isSyncing ? 'Syncing...' : 'Sync Deployments'}</span>
              </button>
            )}

            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="w-full py-1.5 px-3 rounded-full hover:bg-white/[0.05] text-[11.5px] text-[#8e8e93] hover:text-[#d1d1d6] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <GearIcon className="w-3 h-3" />
                <span>Open Settings</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
          {projects.map((proj) => {
            const isSelected = proj.id === selectedId;

            let statusColor = 'bg-[#8e8e93]';
            let statusText = 'Unknown';
            let isPulsing = false;

            if (proj.last_status === 'healthy') {
              statusColor = 'bg-[#30d158]';
              statusText = 'Ready';
            } else if (proj.last_status === 'building') {
              statusColor = 'bg-[#e5a93c]';
              statusText = 'Building';
              isPulsing = true;
            } else if (proj.last_status === 'failed') {
              statusColor = 'bg-[#ff453a]';
              statusText = 'Error';
            } else if (proj.last_status === 'warning') {
              statusColor = 'bg-[#ff9f0a]';
              statusText = 'Canceled';
            }

            return (
              <div
                key={proj.id}
                onClick={() => onSelect(proj)}
                className={`p-3 rounded-xl cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-white/[0.12] text-[#f5f5f7] shadow-sm'
                    : 'hover:bg-white/[0.05] text-[#d1d1d6]'
                }`}
              >
                {/* Header row: Project Name & Status Dot */}
                <div className="flex items-center justify-between gap-1.5 mb-1">
                  <span className="text-[13px] font-semibold text-[#f5f5f7] truncate">
                    {proj.name}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`w-2 h-2 rounded-full ${statusColor} ${
                        isPulsing ? 'animate-pulse' : ''
                      }`}
                      title={statusText}
                    />
                  </div>
                </div>

                {/* Sub row: Git branch & framework */}
                <div className="flex items-center gap-2 text-[11.5px] text-[#8e8e93] truncate">
                  {proj.last_commit_branch ? (
                    <span className="inline-flex items-center gap-1 truncate text-[#d1d1d6]">
                      <GitBranchIcon className="w-3 h-3 text-[#e5a93c] shrink-0" />
                      <span className="truncate">{proj.last_commit_branch}</span>
                    </span>
                  ) : proj.repo_slug ? (
                    <span className="truncate">{proj.repo_slug}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <GlobeIcon className="w-3 h-3" />
                      <span>Production</span>
                    </span>
                  )}

                  {proj.framework && (
                    <span className="px-1.5 py-0.2 rounded bg-white/[0.06] text-[10px] text-[#8e8e93] capitalize shrink-0 font-mono">
                      {proj.framework}
                    </span>
                  )}
                </div>

                {/* Bottom row: Commit message or Relative Time */}
                <div className="flex items-center justify-between text-[11px] mt-2 pt-1.5 border-t border-white/[0.04] text-[#8e8e93]">
                  <span className="truncate max-w-[160px] text-[#a1a1a6]">
                    {proj.last_commit_message || statusText}
                  </span>
                  <span className="shrink-0 font-mono text-[10.5px]">
                    {formatRelativeTime(proj.last_deployment_at || proj.last_checked_at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
