import React from 'react';
import { Activity, GitPullRequest, Database, CheckCircle2, AlertTriangle, ArrowUpRight } from 'lucide-react';
import type { ProjectTelemetry } from '../types';

interface PulseFeedProps {
  projects: ProjectTelemetry[];
  selectedId: number | null;
  onSelect: (project: ProjectTelemetry) => void;
}

export const PulseFeed: React.FC<PulseFeedProps> = ({
  projects,
  selectedId,
  onSelect,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      <div className="text-[11px] font-medium text-neutral-400 flex items-center justify-between pb-1">
        <span>Monitored Services & Deployments</span>
        <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Live Polling
        </span>
      </div>

      {projects.map((proj) => {
        const isSelected = proj.id === selectedId;

        return (
          <div
            key={proj.id}
            onClick={() => onSelect(proj)}
            className={`p-3 rounded-lg border transition-all cursor-pointer ${
              isSelected
                ? 'bg-blue-600/10 border-blue-500/50'
                : 'bg-[#151921] border-white/8 hover:border-white/15'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-200">
                {proj.name}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-[10px] font-mono text-emerald-400 uppercase">
                  {proj.last_status}
                </span>
              </div>
            </div>

            {proj.repo_slug && (
              <div className="text-[11px] font-mono text-neutral-400 mb-2 flex items-center gap-1">
                <span>{proj.repo_slug}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-white/5 font-mono">
              <div className="flex items-center gap-1.5 text-neutral-400">
                <GitPullRequest className="w-3.5 h-3.5 text-blue-400" />
                <span>{proj.open_prs ?? 0} Open PRs</span>
              </div>
              <div className="flex items-center gap-1.5 text-neutral-400">
                <Database className="w-3.5 h-3.5 text-purple-400" />
                <span>{proj.db_storage_used_pct ?? 0}% Storage</span>
              </div>
            </div>

            {proj.metrics && (
              <div className="mt-2 text-[10px] text-neutral-500 flex justify-between font-mono">
                <span>Latency: {proj.metrics.latency_ms}ms</span>
                <span>Error rate: {proj.metrics.error_rate * 100}%</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
