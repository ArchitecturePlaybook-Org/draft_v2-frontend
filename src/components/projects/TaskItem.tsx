"use client";
import React, { useState, useRef, useEffect } from "react";
import { Task } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";
import { Users, X } from "lucide-react";

interface TaskItemProps {
  task: Task;
  isLocked?: boolean;
  readOnly?: boolean;

  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  isSelected?: boolean;
  onSelectToggle?: () => void;
  innerRef?: (element: HTMLElement | null) => void;
  draggableProps?: any;
  dragHandleProps?: any;
  isDragging?: boolean;
}

function CollaboratorsBubble({ taskUid, count }: { taskUid: string, count: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const togglePopover = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      setIsOpen(true);
      setLoading(true);
      try {
        const data = await projectsApi.getTaskCollaborators(taskUid);
        setCollaborators(data);
      } catch (err) {
        toast.error("Failed to load collaborators");
      } finally {
        setLoading(false);
      }
    } else {
      setIsOpen(false);
    }
  };

  const handleRevoke = async (e: React.MouseEvent, userId: number) => {
    e.stopPropagation();
    if (!confirm("Revoke access for this user?")) return;
    try {
      await projectsApi.removeTaskCollaborator(taskUid, userId);
      toast.success("Access revoked.");
      setCollaborators(prev => prev.filter(c => c.user_id !== userId));
    } catch (err) {
      toast.error("Failed to revoke access.");
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={togglePopover}
        onMouseDown={(e) => e.stopPropagation()}
        className="flex items-center justify-center w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full shrink-0 shadow-sm hover:bg-indigo-200 transition-colors border border-indigo-200"
        title={`${count} external collaborator(s)`}
      >
        <span className="text-[9px] font-bold">{count}</span>
      </button>

      {isOpen && (
        <div 
          onClick={e => e.stopPropagation()}
          className="absolute z-50 bottom-full mb-2 right-0 md:left-1/2 md:-translate-x-1/2 w-64 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">Collaborators</h4>
            <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="text-neutral-400 hover:text-red-500">
              <X className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <div className="text-xs text-neutral-500 py-2">Loading...</div>
          ) : collaborators.length === 0 ? (
            <div className="text-xs text-neutral-500 py-2">No active collaborators.</div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
              {collaborators.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-700/50 p-2 rounded-md border border-neutral-100 dark:border-neutral-700">
                  <div className="text-[10px] font-medium text-neutral-700 dark:text-neutral-300 truncate pr-2" title={c.user_email}>
                    {c.user_name}
                  </div>
                  <button
                    onClick={(e) => handleRevoke(e, c.user_id)}
                    className="text-[9px] font-bold text-red-500 hover:text-white hover:bg-red-500 px-2 py-1 rounded transition-colors"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
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
  readOnly = false,
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
  const statusColor = STATUS_COLORS[task.status] || STATUS_COLORS["TODO"];
  const statusLabel = STATUS_LABELS[task.status] || task.status;


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
        relative group bg-surface-100 border rounded-md p-3.5 transition-[box-shadow,border-color,background-color,opacity] duration-300
        ${isLocked
          ? "opacity-60 cursor-not-allowed border-surface-200"
          : readOnly
            ? "cursor-default border-surface-200"
            : "cursor-pointer hover:border-semantic-blue"
        }
        ${task.has_active_blocker ? "border-semantic-red bg-semantic-red/10" : "border-surface-200"}
        ${isDragging ? 'shadow-2xl opacity-95 z-50 border-semantic-blue' : ''}
      `}
    >
      {/* Needs Response Indicator */}
      {task.requires_owner_response && (
        <div className="absolute -top-1.5 -right-1.5 z-10 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow-md animate-bounce" title="New message requires your response">
          <span className="w-1.5 h-1.5 bg-surface-100 border-surface-200 rounded-full"></span>
        </div>
      )}

      {/* External Collaborators Indicator */}
      {task.external_collaborator_count ? (
        <div className="absolute -top-2.5 -left-2.5 z-20">
          <CollaboratorsBubble taskUid={task.uid} count={task.external_collaborator_count} />
        </div>
      ) : null}

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
          <div className="text-[9px] font-mono text-text-secondary mb-0.5 truncate flex items-center flex-wrap gap-y-1">
            {onSelectToggle && (
              <input 
                type="checkbox" 
                checked={isSelected}
                onChange={(e) => { e.stopPropagation(); onSelectToggle(); }}
                className="w-3.5 h-3.5 mr-1.5 rounded border-surface-300 text-primary focus:ring-accent cursor-pointer shrink-0"
              />
            )}
            <span className="shrink-0">{task.task_code || (task.uid ? task.uid.substring(0,8) : "")}</span>

            {task.priority === "HIGH" && <span className="ml-2 bg-semantic-red/10 text-semantic-red text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border border-semantic-red/30 inline-block shrink-0" title="High Priority">High Priority</span>}
            {task.priority === "MEDIUM" && <span className="ml-2 bg-accent/10 text-accent text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border border-accent/30 inline-block shrink-0" title="Medium Priority">Medium Priority</span>}
            {task.priority === "LOW" && <span className="ml-2 bg-surface-100 text-text-secondary text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border border-surface-200 inline-block shrink-0" title="Low Priority">Low Priority</span>}
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
        {task.subtasks && Array.isArray(task.subtasks) && task.subtasks.length > 0 && (
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
            <span className="text-[9px] font-bold text-indigo-500 tabular-nums">
              {task.subtasks.filter((t: any) => t?.status === 'DONE').length}/{task.subtasks.length} subtasks
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
