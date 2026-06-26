"use client";
import React from "react";
import { Task } from "@/types/projects";

interface TaskItemProps {
  task: Task;
  isLocked?: boolean;
  isCritical?: boolean;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  isSelected?: boolean;
  onSelectToggle?: () => void;
  innerRef?: (element: HTMLElement | null) => void;
  draggableProps?: any;
  dragHandleProps?: any;
  isDragging?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-surface-100 text-text-secondary border-surface-200",
  WIP: "bg-semantic-blue/10 text-semantic-blue border-semantic-blue/30",
  QA: "bg-accent/10 text-accent border-accent/30",
  DONE: "bg-semantic-green/10 text-semantic-green border-semantic-green/30",
  // Fallbacks for generic tasks if they still use old statuses before DB update
  "Pending": "bg-surface-100 text-text-secondary border-surface-200",
  "In Progress": "bg-semantic-blue/10 text-semantic-blue border-semantic-blue/30",
  "Done": "bg-semantic-green/10 text-semantic-green border-semantic-green/30",
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
  isCritical = false,
  onClick,
  onDragStart,
  isSelected = false,
  onSelectToggle,
  innerRef,
  draggableProps,
  dragHandleProps,
  isDragging = false,
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
        ref={innerRef}
        {...draggableProps}
        {...dragHandleProps}
        draggable={draggableProps ? undefined : !!onDragStart}
        onDragStart={onDragStart}
        onClick={onClick}
        className={`bg-surface-100 p-5 rounded-2xl border border-surface-200 hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] hover:border-semantic-blue/50 transition-all duration-300 group flex flex-col md:flex-row justify-between items-start md:items-center gap-6 cursor-pointer ${
          isDragging ? 'shadow-2xl opacity-95 scale-[1.02] rotate-2 z-50 border-semantic-blue shadow-semantic-blue/20' : 'shadow-sm'
        }`}
      >
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            {onSelectToggle && (
              <input 
                type="checkbox" 
                checked={isSelected}
                onChange={(e) => { e.stopPropagation(); onSelectToggle(); }}
                className="w-4 h-4 rounded border-surface-300 text-primary focus:ring-accent mr-2 cursor-pointer"
              />
            )}
            <span className="text-[9px] font-mono font-black text-text-secondary bg-surface-50 px-2.5 py-1 rounded-md border border-surface-200 shrink-0 tracking-widest uppercase">{task.task_code || task.uid.substring(0,8)}</span>
            {isCritical && (
              <span className="bg-semantic-red/10 text-semantic-red text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border border-semantic-red/30 shrink-0">Critical</span>
            )}
            {task.priority === "HIGH" && <span className="bg-semantic-red/10 text-semantic-red text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border border-semantic-red/30 shrink-0" title="High Priority">High Priority</span>}
            {task.priority === "MEDIUM" && <span className="bg-accent/10 text-accent text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border border-accent/30 shrink-0" title="Medium Priority">Medium Priority</span>}
            {task.priority === "LOW" && <span className="bg-surface-100 text-text-secondary text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border border-surface-200 shrink-0" title="Low Priority">Low Priority</span>}
            <h4 className="text-sm font-bold text-foreground tracking-tight group-hover:text-semantic-blue transition-colors truncate">{task.title}</h4>
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-2">
            {task.description || "No specific architectural requirements detailed."}
          </p>
          {task.tags && task.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-2">
              {task.tags.map(tag => (
                <span key={tag.id} className="text-[9px] px-1.5 py-0.5 rounded border text-text-secondary font-bold uppercase tracking-widest" style={{ borderColor: tag.color, backgroundColor: `${tag.color}10` }}>
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {hasUnresolvedPunchList && (
            <span className="flex items-center justify-center w-6 h-6 bg-accent rounded-full shrink-0 shadow-[0_0_15px_var(--accent)] animate-pulse" title="Unresolved Issue Tracker items">
              <svg className="w-3 h-3 text-background" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
          )}
          {task.requires_owner_response && (
            <span className="flex items-center justify-center w-5 h-5 bg-semantic-red rounded-full shrink-0 shadow-none animate-pulse" title="New message requires your response">
              <span className="w-1.5 h-1.5 bg-background rounded-full"></span>
            </span>
          )}
          {task.depends_on && task.depends_on.length > 0 && (
            <span className="flex items-center justify-center w-5 h-5 bg-surface-100 rounded-full shrink-0 shadow-none" title={`Depends on ${task.depends_on.length} task(s)`}>
              <svg className="w-3 h-3 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
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
      ref={innerRef}
      {...draggableProps}
      {...dragHandleProps}
      draggable={draggableProps ? undefined : !isLocked}
      onDragStart={isLocked ? undefined : onDragStart}
      onClick={onClick}
      title={isLocked ? "This zone is locked" : task.title}
      className={`
        relative group bg-surface-100 border rounded-md p-3.5 transition-all duration-300
        ${isLocked
          ? "opacity-60 cursor-not-allowed border-surface-200"
          : "cursor-pointer hover:border-semantic-blue transition-colors"
        }
        ${task.has_active_blocker ? "border-semantic-red bg-semantic-red/10" : "border-surface-200"}
        ${isDragging ? 'shadow-none opacity-95 scale-[1.03] rotate-2 z-50 border-semantic-blue' : ''}
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
          <span className="w-1.5 h-1.5 bg-surface-100 border-surface-200 rounded-full"></span>
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
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-mono text-text-secondary mb-0.5 truncate">
            {task.task_code || task.uid}
            {isCritical && <span className="ml-2 bg-semantic-red/10 text-semantic-red text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border border-semantic-red/30 inline-block">Critical</span>}
            {task.priority === "HIGH" && <span className="ml-2 bg-semantic-red/10 text-semantic-red text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border border-semantic-red/30 inline-block" title="High Priority">High Priority</span>}
            {task.priority === "MEDIUM" && <span className="ml-2 bg-accent/10 text-accent text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border border-accent/30 inline-block" title="Medium Priority">Medium Priority</span>}
            {task.priority === "LOW" && <span className="ml-2 bg-surface-100 text-text-secondary text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border border-surface-200 inline-block" title="Low Priority">Low Priority</span>}
          </div>
          <h4 className="font-bold text-[11px] text-foreground leading-tight line-clamp-2 group-hover:text-semantic-blue transition-colors">
            {task.title}
          </h4>
          {task.description && (
            <p className="text-[9px] text-text-secondary mt-1.5 line-clamp-2 leading-snug">
              {task.description}
            </p>
          )}
        </div>
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
          <span className="text-[9px] font-bold text-surface-500 text-surface-400 truncate">
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

      {/* Footer: subtasks + checklist + issues count */}
      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-surface-100">
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
            <span className="text-[9px] font-bold text-indigo-500 tabular-nums">
              {task.subtasks.filter((t: any) => t.status === 'DONE').length}/{task.subtasks.length} subtasks
            </span>
          </div>
        )}
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
        {(task.due_date || task.end_date) && (
          <div className="flex items-center gap-1 ml-auto">
            <svg className={`w-3 h-3 ${task.due_date ? 'text-red-400' : 'text-surface-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className={`text-[8px] font-bold ${task.due_date ? 'text-red-500' : 'text-surface-400'}`}>{task.due_date || task.end_date}</span>
          </div>
        )}
        {task.is_recurring_template && (
          <div className="flex items-center gap-1 ml-1" title={`Recurring: ${task.recurrence_pattern}`}>
            <svg className="w-3 h-3 text-indigo-400 animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        )}
        {task.depends_on && task.depends_on.length > 0 && (
          <div className="flex items-center gap-1 ml-1" title={`Depends on ${task.depends_on.length} task(s)`}>
            <svg className="w-3 h-3 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
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
