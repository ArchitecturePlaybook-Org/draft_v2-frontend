"use client";
import React, { useState, useRef, useEffect } from "react";
import { MilestoneBlockCompact, BlockStatus } from "@/types/projects";

interface MatrixBlockCellProps {
  block: MilestoneBlockCompact | null;
  zoneName: string;
  isManager?: boolean;
  onClick?: () => void;
  onUnlock?: (blockId: number, reason?: string) => Promise<void>;
  onLock?: (blockId: number) => Promise<void>;
}

const STATUS_CONFIG: Record<BlockStatus, { bg: string; border: string; text: string; label: string }> = {
  LOCKED: {
    bg: "bg-surface-100/50",
    border: "border-surface-200",
    text: "text-text-secondary",
    label: "Locked",
  },
  ACTIVE: {
    bg: "bg-semantic-blue/10",
    border: "border-semantic-blue/30",
    text: "text-semantic-blue",
    label: "Active",
  },
  DONE: {
    bg: "bg-semantic-green/10",
    border: "border-semantic-green/30",
    text: "text-semantic-green",
    label: "Done",
  },
};

// ── Lock Confirmation ──────────────────────────────────────────────────────────
interface LockConfirmProps {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

const LockConfirm: React.FC<LockConfirmProps> = ({ onConfirm, onCancel, loading }) => (
  <div
    className="absolute inset-0 z-20 rounded-md overflow-hidden flex flex-col justify-center items-center gap-2 px-3"
    style={{ background: "var(--surface-card)", border: "1px solid var(--surface-300)", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}
    onClick={(e) => e.stopPropagation()}
  >
    <p className="text-[10px] font-bold text-primary text-center">Re-lock this block?</p>
    <p className="text-[9px] text-surface-500 text-center leading-tight">All tasks must be TODO</p>
    <div className="flex gap-1.5 w-full">
      <button
        onClick={onConfirm}
        disabled={loading}
        className="flex-1 text-[9px] font-black uppercase tracking-widest py-1 rounded-md"
        style={{ background: "var(--surface-300)", color: "var(--primary)" }}
      >
        {loading ? "…" : "Lock"}
      </button>
      <button
        onClick={onCancel}
        disabled={loading}
        className="flex-1 text-[9px] font-black uppercase tracking-widest py-1 rounded-md"
        style={{ background: "var(--surface-200)", color: "var(--text-secondary)" }}
      >
        Cancel
      </button>
    </div>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────
export const MatrixBlockCell: React.FC<MatrixBlockCellProps> = ({
  block,
  zoneName,
  isManager = false,
  onClick,
  onUnlock,
  onLock,
}) => {
  const [unlockLoading, setUnlockLoading] = useState(false);

  // Empty cell — no block exists for this zone/phase
  if (!block) {
    return (
      <button
        onClick={onClick}
        className="w-full h-[88px] border border-dashed border-surface-200 rounded-md bg-surface-100/50 hover:bg-surface-200 hover:border-accent hover:text-accent transition-all flex flex-col items-center justify-center group"
      >
        <span className="text-[14px] text-surface-300 group-hover:text-accent font-black transition-colors leading-none">+</span>
        <span className="text-[8px] text-surface-300 group-hover:text-accent font-bold uppercase tracking-widest transition-colors mt-0.5">Plan Tasks</span>
      </button>
    );
  }

  const cfg = STATUS_CONFIG[block.status];
  const pct = block.progress_percent;
  const wasManuallyUnlocked = !!block.unlocked_by_name;

  // ── State for re-lock confirm dialog ──────────────────────────────────────
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // One-click unlock — no popover, no reason input
  const handleLockIconClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isManager || block.status !== "LOCKED" || !onUnlock || unlockLoading) return;
    setUnlockLoading(true);
    try {
      await onUnlock(block.id); // no reason
    } catch (err) {
      // Error is already toasted by parent, just swallow to prevent unhandled rejection
    } finally {
      setUnlockLoading(false);
    }
  };

  // Re-lock: active dot click opens confirm dialog
  const handleActiveDotClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isManager && block.status === "ACTIVE") {
      setShowLockConfirm(true);
    }
  };

  const handleLockConfirm = async () => {
    if (!onLock) return;
    setActionLoading(true);
    try {
      await onLock(block.id);
      setShowLockConfirm(false);
    } catch (err) {
      // Error is already toasted by parent, close dialog and swallow
      setShowLockConfirm(false); 
    } finally {
      setActionLoading(false);
    }
  };

  const auditTitle = wasManuallyUnlocked
    ? `Manually activated by ${block.unlocked_by_name}${block.unlock_reason ? ` — "${block.unlock_reason}"` : ""}`
    : block.status === "LOCKED"
    ? isManager ? "Click the lock to activate this block" : "Locked — complete the previous phase first"
    : `${zoneName} — ${block.completed_tasks}/${block.total_tasks} tasks done`;

  return (
    <div className="relative">
      {/* Re-lock confirmation — covers the whole cell */}
      {showLockConfirm && isManager && (
        <LockConfirm
          onConfirm={handleLockConfirm}
          onCancel={() => setShowLockConfirm(false)}
          loading={actionLoading}
        />
      )}


      <button
        onClick={onClick}
        title={auditTitle}
        className={`
          w-full h-[88px] border rounded-md p-3 text-left transition-all duration-200 relative overflow-hidden
          ${cfg.bg} ${cfg.border} ${cfg.text}
          hover:border-[#D4AF37] cursor-pointer
          ${block.status === "LOCKED" ? "opacity-75 hover:opacity-100" : ""}
        `}
      >
        {/* Progress fill bar */}
        {block.status === "ACTIVE" && (
          <div
            className="absolute bottom-0 left-0 h-1 bg-semantic-blue/50 rounded-bl-md transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        )}
        {block.status === "DONE" && (
          <div className="absolute bottom-0 left-0 h-1 w-full bg-semantic-green rounded-bl-md" />
        )}

        <div className="flex items-start justify-between mb-2">
          {/* ── Lock icon: one-click activate for managers on LOCKED cells ── */}
          {block.status === "LOCKED" && (
            isManager ? (
              <span
                role="button"
                onClick={handleLockIconClick}
                title={unlockLoading ? "Activating…" : "Click to activate this block"}
                className="group/lock inline-flex items-center justify-center w-5 h-5 rounded transition-all duration-150 hover:bg-accent/20 cursor-pointer"
              >
                <svg
                  className={`w-4 h-4 transition-all duration-150 group-hover/lock:text-accent group-hover/lock:scale-110 ${
                    unlockLoading ? "opacity-100 text-accent animate-pulse" : "opacity-40 group-hover/lock:opacity-100"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
            ) : (
              <svg className="w-4 h-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )
          )}

          {/* Done checkmark */}
          {block.status === "DONE" && (
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          )}

          {/* Active indicator dot — managers can click to re-lock */}
          {block.status === "ACTIVE" && (
            isManager ? (
              <span
                role="button"
                onClick={handleActiveDotClick}
                title="Click to re-lock this block"
                className={`w-2 h-2 rounded-full mt-1 cursor-pointer transition-all hover:scale-150 hover:opacity-70 ${wasManuallyUnlocked ? "bg-amber-400" : "bg-accent animate-pulse"}`}
              />
            ) : (
              <span className={`w-2 h-2 rounded-full mt-1 ${wasManuallyUnlocked ? "bg-amber-400" : "bg-accent animate-pulse"}`} />
            )
          )}

          {/* Status badge */}
          <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${
            block.status === "DONE" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" :
            block.status === "ACTIVE" ? "bg-accent/10 text-accent" :
            "bg-surface-200 dark:bg-surface-700/50 text-surface-400 dark:text-surface-500"
          }`}>
            {cfg.label}
          </span>
        </div>

        {/* Task count */}
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

        {/* Manual-unlock audit badge */}
        {wasManuallyUnlocked && (
          <div className="absolute bottom-2 left-2" title={auditTitle}>
            <svg className="w-3 h-3 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 018 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Notes indicator */}
        {block.notes && (
          <div className="absolute bottom-2 right-2 text-surface-400" title="Block has notes">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
        )}
      </button>
    </div>
  );
};
