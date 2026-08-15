"use client";
import React, { useState } from "react";
import { X, RotateCcw, Loader2 } from "lucide-react";

interface ReopenReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
  markupTitle?: string;
}

export function ReopenReasonModal({ isOpen, onClose, onSubmit, markupTitle }: ReopenReasonModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    try {
      setIsSubmitting(true);
      await onSubmit(reason.trim());
      setReason("");
      onClose();
    } catch {
      // Handled by caller
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] bg-black flex items-center justify-center p-4">
      <div className="bg-surface-50 border border-surface-100 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-surface-100 pb-3">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-black text-white uppercase tracking-tight">Re-Open Revision Request</h3>
          </div>
          <button onClick={onClose} className="text-surface-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {markupTitle && (
            <div className="p-3 bg-background border border-surface-100 rounded-2xl">
              <span className="text-[9px] font-black uppercase text-amber-500 tracking-wider">Target Request</span>
              <p className="text-xs font-bold text-white truncate mt-0.5">{markupTitle}</p>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black uppercase text-surface-400 mb-1">
              Reason for Re-Opening <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State the reason for re-opening (e.g. Dimensions still incorrect, door opening offset by 10cm)..."
              className="w-full bg-background border border-surface-100 rounded-xl p-3 text-xs font-medium text-white outline-none focus:border-amber-500 resize-none placeholder:text-surface-600"
              required
            />
          </div>

          <p className="text-[10px] text-surface-400 font-medium italic">
            ℹ️ All previous request descriptions and resolution notes will be preserved in the audit log.
          </p>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-surface-100 text-surface-300 font-bold text-xs rounded-xl hover:bg-surface-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-background font-black text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                "↺ Confirm Re-Open"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
