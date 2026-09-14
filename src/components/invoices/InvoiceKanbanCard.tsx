"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { Calendar, AlertCircle, Send, CheckCircle, Loader2, Copy } from "lucide-react";
import type { InvoiceListItem, InvoiceStatus } from "@/domains/invoices/types";

interface Props {
  invoice: InvoiceListItem;
  projectUid: string;
  actionLoading: number | null;
  onMarkSent: (inv: InvoiceListItem, e: React.MouseEvent) => void;
  onMarkPaid: (inv: InvoiceListItem, e: React.MouseEvent) => void;
  onDuplicate?: (inv: InvoiceListItem, e: React.MouseEvent) => void;
  isDragging?: boolean;
}

function fmtINR(v: number | string | undefined | null) {
  const num = typeof v === "number" ? v : Number(v) || 0;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
}
function fmtDate(d: string | null | undefined) {
  if (!d) return null;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
}
function isOverdue(d: string | null | undefined, status: InvoiceStatus) {
  if (!d || status === "PAID" || status === "CANCELLED") return false;
  return new Date(d) < new Date();
}

const AMOUNT_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: "text-foreground/70",
  SENT: "text-blue-600 dark:text-blue-400",
  PAID: "text-emerald-600 dark:text-emerald-400",
  OVERDUE: "text-red-600 dark:text-red-400",
  CANCELLED: "text-surface-400",
};

export const InvoiceKanbanCard: React.FC<Props> = ({
  invoice, projectUid, actionLoading, onMarkSent, onMarkPaid, onDuplicate, isDragging,
}) => {
  const router = useRouter();
  const overdue = isOverdue(invoice.due_date, invoice.status);
  const isLoading = actionLoading === invoice.id;

  return (
    <div
      onClick={() => router.push(`/dashboard/projects/${projectUid}/invoices/${invoice.id}`)}
      className={`bg-surface-card border rounded-xl p-3.5 cursor-pointer group transition-all hover:shadow-md hover:-translate-y-px select-none ${
        isDragging
          ? "shadow-2xl scale-[1.02] border-accent ring-2 ring-accent/20"
          : "border-surface-200 hover:border-surface-300 dark:hover:border-surface-600"
      }`}
    >
      {/* Invoice number + actions */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-mono text-xs font-bold text-accent">{invoice.invoice_number}</span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          {onDuplicate && (
            <button
              onClick={e => onDuplicate(invoice, e)}
              disabled={isLoading}
              title="Duplicate Invoice"
              className="p-1 rounded text-surface-400 hover:text-accent hover:bg-accent/10 transition-colors"
            >
              <Copy className="w-3 h-3" />
            </button>
          )}
          {invoice.status === "DRAFT" && (
            <button
              onClick={e => onMarkSent(invoice, e)}
              disabled={isLoading}
              title="Mark as Sent"
              className="p-1 rounded text-surface-400 hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
            >
              <Send className="w-3 h-3" />
            </button>
          )}
          {(invoice.status === "SENT" || invoice.status === "OVERDUE") && (
            <button
              onClick={e => onMarkPaid(invoice, e)}
              disabled={isLoading}
              title="Mark as Paid"
              className="p-1 rounded text-surface-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
            >
              <CheckCircle className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Client name */}
      <p className="text-sm font-bold text-foreground leading-snug truncate mb-1.5">{invoice.client_name}</p>

      {/* Amount */}
      <p className={`text-base font-black ${AMOUNT_COLORS[invoice.status]}`}>{fmtINR(invoice.total_amount)}</p>

      {/* Due date */}
      {invoice.due_date && (
        <div className={`flex items-center gap-1 mt-2 text-[10px] font-semibold ${overdue ? "text-red-500" : "text-surface-400"}`}>
          {overdue ? <AlertCircle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
          {overdue ? "Overdue · " : "Due: "}{fmtDate(invoice.due_date)}
        </div>
      )}
    </div>
  );
};
