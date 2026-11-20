import React from 'react';
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
    <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-0.5">
      {projects.map((proj) => {
        const isSelected = proj.id === selectedId;

        return (
          <div
            key={proj.id}
            onClick={() => onSelect(proj)}
            className={`px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
              isSelected
                ? 'bg-[#0a84ff] text-white'
                : 'hover:bg-white/[0.04] text-[#f5f5f7]'
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span
                className={`text-[13px] font-medium ${
                  isSelected ? 'text-white' : 'text-[#f5f5f7]'
                }`}
              >
                {proj.name}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  proj.last_status === 'healthy'
                    ? isSelected
                      ? 'bg-white'
                      : 'bg-[#30d158]'
                    : isSelected
                    ? 'bg-amber-200'
                    : 'bg-[#ffd60a]'
                }`}
              />
            </div>

            {proj.repo_slug && (
              <p
                className={`text-[12px] truncate ${
                  isSelected ? 'text-white/80' : 'text-[#86868b]'
                }`}
              >
                {proj.repo_slug}
              </p>
            )}

            <div
              className={`flex items-center justify-between text-[11px] mt-1.5 pt-1.5 border-t ${
                isSelected ? 'border-white/20 text-white/80' : 'border-white/[0.06] text-[#86868b]'
              }`}
            >
              <span>{proj.open_prs ?? 0} open pull requests</span>
              <span>{proj.db_storage_used_pct ?? 0}% storage</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
