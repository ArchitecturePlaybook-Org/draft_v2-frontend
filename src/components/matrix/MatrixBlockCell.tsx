"use client";
import React from "react";
import { MilestoneBlockCompact, BlockStatus } from "@/types/projects";

interface MatrixBlockCellProps {
  block: MilestoneBlockCompact | null;
  zoneName: string;
  onClick?: () => void;
}

const STATUS_CONFIG: Record<BlockStatus, { bg: string; border: string; text: string; label: string }> = {
  LOCKED: {
    bg: "bg-surface-100",
    border: "border-surface-200",
    text: "text-surface-400",
    label: "Locked",
  },
  ACTIVE: {
    bg: "bg-blue-50",
    border: "border-accent/40",
    text: "text-accent",
    label: "Active",
  },
  DONE: {
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    text: "text-emerald-700",
    label: "Done",
  },
};

export const MatrixBlockCell: React.FC<MatrixBlockCellProps> = ({ block, zoneName, onClick }) => {
  if (!block) {
    // Empty cell — no block exists for this zone/phase
    return (
      <div className="h-[88px] border border-dashed border-surface-200 rounded-xl bg-surface-50/50 flex items-center justify-center">
        <span className="text-[9px] text-surface-300 font-bold uppercase tracking-widest">—</span>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[block.status];
  const isClickable = true; // allow clicking locked blocks to plan tasks
  const pct = block.progress_percent;

  return (
    <button
      onClick={onClick}
      title={block.status === "LOCKED" ? "Locked — Click to plan tasks" : `${zoneName} — ${block.completed_tasks}/${block.total_tasks} tasks done`}
      className={`
        w-full h-[88px] border-2 rounded-xl p-3 text-left transition-all duration-200 relative overflow-hidden
        ${cfg.bg} ${cfg.border} ${cfg.text}
        hover:shadow-lg hover:scale-[1.03] cursor-pointer
        ${block.status === "LOCKED" ? "opacity-75" : ""}
      `}
    >
      {/* Progress fill bar */}
      {block.status === "ACTIVE" && (
        <div
          className="absolute bottom-0 left-0 h-1 bg-accent/50 rounded-bl-xl transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      )}
      {block.status === "DONE" && (
        <div className="absolute bottom-0 left-0 h-1 w-full bg-emerald-400 rounded-bl-xl" />
      )}

      <div className="flex items-start justify-between mb-2">
        {block.status === "LOCKED" && (
          <svg className="w-4 h-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )}
        {block.status === "DONE" && (
          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {block.status === "ACTIVE" && (
          <span className="w-2 h-2 bg-accent rounded-full animate-pulse mt-1" />
        )}

        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${
          block.status === "DONE" ? "bg-emerald-100 text-emerald-700" :
          block.status === "ACTIVE" ? "bg-accent/10 text-accent" :
          "bg-surface-200 text-surface-400"
        }`}>
          {cfg.label}
        </span>
      </div>

      {block.total_tasks > 0 ? (
        <div>
          <p className={`text-[10px] font-bold tabular-nums ${cfg.text}`}>
            {block.completed_tasks}/{block.total_tasks}
            <span className="font-normal opacity-60 ml-1">tasks</span>
          </p>
          {block.status === "ACTIVE" && (
            <p className="text-[9px] font-bold text-accent/80 mt-0.5">{pct}% complete</p>
          )}
        </div>
      ) : (
        <p className="text-[9px] opacity-40 font-medium">No tasks yet</p>
      )}
    </button>
  );
};
