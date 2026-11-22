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
  if (projects.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
        <p className="text-[14px] font-medium text-[#d1d1d6]">No Services Monitored</p>
        <p className="text-[12px] text-[#636366] mt-1">Configure your GitHub or deployment monitors</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
      {projects.map((proj) => {
        const isSelected = proj.id === selectedId;

        return (
          <div
            key={proj.id}
            onClick={() => onSelect(proj)}
            className={`px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
              isSelected
                ? 'bg-white/[0.12] text-[#f5f5f7]'
                : 'hover:bg-white/[0.05] text-[#d1d1d6]'
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[13px] font-medium text-[#f5f5f7]">
                {proj.name}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  proj.last_status === 'healthy'
                    ? 'bg-[#30d158]'
                    : 'bg-[#e5a93c]'
                }`}
              />
            </div>

            {proj.repo_slug && (
              <p className="text-[12px] truncate text-[#8e8e93]">
                {proj.repo_slug}
              </p>
            )}

            <div className="flex items-center justify-between text-[11px] mt-1 text-[#8e8e93]">
              <span>{proj.open_prs ?? 0} PRs</span>
              <span>{proj.db_storage_used_pct ?? 0}% storage</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
