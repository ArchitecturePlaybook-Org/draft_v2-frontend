"use client";

import React from "react";
import { AlertTriangle, CheckCircle, XCircle, Send, Clock, Loader2, X } from "lucide-react";
import type { InvoiceStatus, InvoiceListItem, Invoice } from "@/domains/invoices/types";

interface Props {
  open: boolean;
  invoice: InvoiceListItem | Invoice | null;
  targetStatus: InvoiceStatus | null;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function fmtINR(v: number | string | undefined | null): string {
  const num = typeof v === "number" ? v : Number(v) || 0;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
}

export const InvoiceTransitionConfirmModal: React.FC<Props> = ({
  open,
  invoice,
  targetStatus,
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!open || !invoice || !targetStatus) return null;

  const config: Record<InvoiceStatus, {
    title: string;
    icon: React.ReactNode;
    warning: string;
    btnText: string;
    btnClass: string;
  }> = {
    PAID: {
      title: "Mark Invoice as Paid?",
      icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
      warning: "This action cannot be undone. Once marked as Paid, payment receipt is finalized and this invoice cannot be moved back to Sent, Draft, or Overdue.",
      btnText: "Confirm & Mark Paid",
      btnClass: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20",
    },
    CANCELLED: {
      title: "Cancel this Invoice?",
      icon: <XCircle className="w-5 h-5 text-red-500" />,
      warning: "This action cannot be undone. Once cancelled, this invoice is permanently voided and cannot be re-issued, sent, or paid.",
      btnText: "Confirm & Cancel Invoice",
      btnClass: "bg-red-600 hover:bg-red-700 text-white shadow-red-500/20",
    },
    SENT: {
      title: "Mark Invoice as Sent?",
      icon: <Send className="w-5 h-5 text-blue-500" />,
      warning: "This action cannot be undone. Once marked as Sent, this invoice is officially issued to the client and cannot be moved back to Draft.",
      btnText: "Confirm & Mark Sent",
      btnClass: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20",
    },
    OVERDUE: {
      title: "Move Invoice to Overdue?",
      icon: <Clock className="w-5 h-5 text-red-500" />,
      warning: "This invoice will be marked as delinquent / overdue. It can subsequently only be marked as Paid or Cancelled.",
      btnText: "Confirm & Move to Overdue",
      btnClass: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20",
    },
    DRAFT: {
      title: "Revert to Draft?",
      icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
      warning: "This will move the invoice back to working draft status.",
      btnText: "Confirm",
      btnClass: "bg-surface-700 hover:bg-surface-800 text-white",
    },
  };

  const currentConfig = config[targetStatus];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-surface-card border border-surface-200 rounded-2xl shadow-2xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-surface-100 border border-surface-200 shrink-0">
              {currentConfig.icon}
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">{currentConfig.title}</h3>
              <p className="font-mono text-xs text-accent font-bold">{invoice.invoice_number}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="p-1.5 rounded-lg text-surface-400 hover:text-foreground hover:bg-surface-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Callout */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium leading-relaxed">
            {currentConfig.warning}
          </p>
        </div>

        {/* Invoice Summary Card */}
        <div className="rounded-xl border border-surface-200 bg-surface-50 dark:bg-surface-800/40 p-3 space-y-1 text-xs">
          <div className="flex justify-between text-surface-400">
            <span>Client</span>
            <span className="font-bold text-foreground truncate max-w-[200px]">{invoice.client_name}</span>
          </div>
          <div className="flex justify-between text-surface-400">
            <span>Amount</span>
            <span className="font-black text-foreground">{fmtINR(invoice.total_amount)}</span>
          </div>
          <div className="flex justify-between text-surface-400">
            <span>Current Status</span>
            <span className="font-bold uppercase tracking-wider text-[10px] text-surface-300">{invoice.status}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-surface-200 text-xs font-bold text-surface-400 hover:text-foreground hover:bg-surface-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 ${currentConfig.btnClass}`}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {currentConfig.btnText}
          </button>
        </div>
      </div>
    </div>
  );
};
