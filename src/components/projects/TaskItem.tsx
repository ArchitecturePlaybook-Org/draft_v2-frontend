"use client";
import React from "react";
import { Task } from "@/types/projects";

interface TaskItemProps {
  task: Task;
  isLocked?: boolean;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
}

const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-surface-100 text-surface-500 border-surface-200",
  WIP: "bg-blue-50 text-blue-700 border-blue-200",
  QA: "bg-amber-50 text-amber-700 border-amber-200",
  DONE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  // Fallbacks for generic tasks if they still use old statuses before DB update
  "Pending": "bg-surface-100 text-surface-500 border-surface-200",
  "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
  "Done": "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  WIP: "In Progress",
  QA: "Inspection",
  DONE: "Done",
  "Pending": "Pending",
  "In Progress": "In Progress",
  "Done": "Done",
};

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  isLocked = false,
  onClick,
  onDragStart,
}) => {
  const isMatrixTask = task.block !== null && task.block !== undefined;
  const hasTrade = task.trade !== null && task.trade !== undefined;
  const pct = task.progress_percent || 0;
  const checklists = task.checklists || [];
  const issues = (task as any).punch_list_items || (task as any).issues || [];
  const hasUnresolvedPunchList = issues.some((i: any) => !i.is_resolved);
  const statusColor = STATUS_COLORS[task.status] || STATUS_COLORS["TODO"];
  const statusLabel = STATUS_LABELS[task.status] || task.status;

  if (!isMatrixTask) {
    // GENERIC KANBAN TASK RENDER
    return (
      <div 
        draggable={!!onDragStart}
        onDragStart={onDragStart}
        onClick={onClick}
        className="bg-white p-6 rounded-2xl border border-surface-200 hover:border-accent hover:shadow-lg transition-all group flex flex-col md:flex-row justify-between items-start md:items-center gap-6 cursor-pointer"
      >
        <div className="flex-1 space-y-2">
          <h4 className="text-sm font-bold text-primary tracking-tight group-hover:text-accent transition-colors">{task.title}</h4>
          <p className="text-[11px] text-surface-500 leading-relaxed font-medium line-clamp-2">
            {task.description || "No specific architectural requirements detailed."}
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {hasUnresolvedPunchList && (
            <span className="flex items-center justify-center w-5 h-5 bg-amber-500 rounded-full shrink-0 shadow-sm animate-pulse" title="Unresolved Issue Tracker items">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
          )}
          {task.requires_owner_response && (
            <span className="flex items-center justify-center w-5 h-5 bg-red-500 rounded-full shrink-0 shadow-sm animate-pulse" title="New message requires your response">
              <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
            </span>
          )}
          <span className={`px-3 py-1 text-[9px] font-bold uppercase tracking-[0.15em] rounded-md shadow-sm shrink-0 border ${statusColor}`}>
            {statusLabel}
          </span>
          {task.cost && (
            <div className="text-[10px] font-black text-accent bg-surface-50 px-3 py-1.5 rounded-lg border border-surface-200 tracking-widest uppercase">
              ${Number(task.cost).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    );
  }

  // MATRIX TASK RENDER
  return (
    <div
      draggable={!isLocked}
      onDragStart={isLocked ? undefined : onDragStart}
      onClick={onClick}
      title={isLocked ? "This zone is locked" : task.title}
      className={`
        relative group bg-white border rounded-xl p-3.5 shadow-sm transition-all duration-200
        ${isLocked
          ? "opacity-60 cursor-not-allowed border-surface-200"
          : "cursor-pointer hover:shadow-md hover:border-accent/40 hover:-translate-y-0.5 active:scale-95"
        }
        ${task.has_active_blocker ? "border-red-300 bg-red-50/30" : "border-surface-200"}
      `}
    >
      {/* Unresolved Issue Tracker Indicator */}
      {hasUnresolvedPunchList && (
        <div className={`absolute -top-1.5 ${task.requires_owner_response ? 'right-4' : '-right-1.5'} z-10 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center shadow-md animate-bounce`} title="Unresolved Issue Tracker items">
          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      )}

      {/* Needs Response Indicator */}
      {task.requires_owner_response && (
        <div className="absolute -top-1.5 -right-1.5 z-10 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow-md animate-bounce" title="New message requires your response">
          <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
        </div>
      )}

      {/* Blocker banner */}
      {task.has_active_blocker && (
        <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-red-100 rounded-lg">
          <svg className="w-3 h-3 text-red-500 shrink-0 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-[8px] font-black uppercase tracking-widest text-red-600">Blocker Active</span>
        </div>
      )}

      {/* Card header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-bold text-[11px] text-primary leading-tight flex-1 min-w-0 line-clamp-2 group-hover:text-accent transition-colors">
          {task.title}
        </h4>
        <span className={`shrink-0 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Trade badge */}
      {hasTrade && (
        <div className="flex items-center gap-1.5 mb-2.5">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: task.trade!.color_hex }}
          />
          <span className="text-[9px] font-bold text-surface-500 truncate">
            {task.trade!.name}
          </span>
        </div>
      )}

      {/* Quantity progress bar */}
      {task.quantity_target !== null && task.quantity_target !== undefined && task.quantity_target > 0 && (
        <div className="mb-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[8px] font-bold text-surface-400 uppercase tracking-widest">Progress</span>
            <span className="text-[8px] font-bold tabular-nums text-primary">
              {task.quantity_completed || 0}/{task.quantity_target} {task.quantity_unit}
            </span>
          </div>
          <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-accent" : "bg-blue-300"
              }`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <p className="text-[8px] text-surface-400 font-bold mt-0.5 tabular-nums">{pct}%</p>
        </div>
      )}

      {/* Footer: checklist + issues count */}
      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-surface-100">
        {checklists.length > 0 && (
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span className="text-[9px] font-bold text-surface-400 tabular-nums">
              {checklists.filter((c: any) => c.is_completed).length}/{checklists.length}
            </span>
          </div>
        )}
        {issues.length > 0 && (
          <div className="flex items-center gap-1">
            <svg className={`w-3 h-3 ${task.has_active_blocker ? "text-red-500" : "text-amber-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className={`text-[9px] font-bold tabular-nums ${task.has_active_blocker ? "text-red-600" : "text-amber-500"}`}>
              {issues.filter((i: any) => !i.is_resolved).length} open
            </span>
          </div>
        )}
        {(task.end_date || task.end_date) && (
          <div className="flex items-center gap-1 ml-auto">
            <svg className="w-3 h-3 text-surface-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-[8px] font-bold text-surface-400">{task.end_date || task.end_date}</span>
          </div>
        )}
      </div>

      {/* Locked overlay */}
      {isLocked && (
        <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-surface-50/60">
          <svg className="w-4 h-4 text-surface-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      )}
    </div>
  );
};
