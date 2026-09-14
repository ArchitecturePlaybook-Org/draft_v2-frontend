"use client";
import React, { useCallback, useState } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Plus } from "lucide-react";
import Link from "next/link";
import { InvoiceKanbanCard } from "./InvoiceKanbanCard";
import { InvoiceTransitionConfirmModal } from "./InvoiceTransitionConfirmModal";
import type { InvoiceListItem, InvoiceStatus } from "@/domains/invoices/types";
import { invoicesApi } from "@/domains/invoices/api";

const COLUMNS: { id: InvoiceStatus; label: string; color: string; bg: string; count_color: string }[] = [
  { id: "DRAFT",     label: "Draft",     color: "text-surface-700 dark:text-surface-200",  bg: "bg-surface-100/50 dark:bg-surface-800/30 border border-surface-200",        count_color: "bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-200" },
  { id: "SENT",      label: "Sent",      color: "text-blue-600 dark:text-blue-400",        bg: "bg-blue-500/5 border border-blue-500/15",                                   count_color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  { id: "PAID",      label: "Paid",      color: "text-emerald-600 dark:text-emerald-400",  bg: "bg-emerald-500/5 border border-emerald-500/15",                             count_color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  { id: "OVERDUE",   label: "Overdue",   color: "text-red-600 dark:text-red-400",          bg: "bg-red-500/5 border border-red-500/15",                                     count_color: "bg-red-500/15 text-red-600 dark:text-red-400" },
  { id: "CANCELLED", label: "Cancelled", color: "text-surface-500 dark:text-surface-400",  bg: "bg-surface-100/30 dark:bg-surface-800/20 border border-surface-200/60",    count_color: "bg-surface-200/60 dark:bg-surface-700/60 text-surface-500 dark:text-surface-400" },
];

// Valid status transitions allowed by workflow
const ALLOWED_TRANSITIONS: Partial<Record<InvoiceStatus, InvoiceStatus[]>> = {
  DRAFT:   ["SENT", "CANCELLED"],
  SENT:    ["PAID", "OVERDUE", "CANCELLED"],
  OVERDUE: ["PAID", "CANCELLED"],
  PAID:    [],
  CANCELLED: [],
};

interface Props {
  invoices: InvoiceListItem[];
  projectUid: string;
  onUpdate: (updated: InvoiceListItem) => void;
}

export const InvoiceKanban: React.FC<Props> = ({ invoices, projectUid, onUpdate }) => {
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{
    open: boolean;
    invoice: InvoiceListItem | null;
    targetStatus: InvoiceStatus | null;
  }>({ open: false, invoice: null, targetStatus: null });

  const grouped = useCallback((): Record<InvoiceStatus, InvoiceListItem[]> => {
    const map: Record<InvoiceStatus, InvoiceListItem[]> = {
      DRAFT: [], SENT: [], PAID: [], OVERDUE: [], CANCELLED: [],
    };
    for (const inv of invoices) {
      map[inv.status]?.push(inv);
    }
    return map;
  }, [invoices]);

  const cols = grouped();

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const fromStatus = source.droppableId as InvoiceStatus;
    const toStatus = destination.droppableId as InvoiceStatus;
    const invoiceId = parseInt(draggableId, 10);
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return;

    const allowed = ALLOWED_TRANSITIONS[fromStatus] ?? [];
    if (!allowed.includes(toStatus)) {
      return;
    }

    // Intercept irreversible transitions with confirmation modal
    setPendingConfirm({
      open: true,
      invoice: inv,
      targetStatus: toStatus,
    });
  };

  const handleConfirmTransition = async () => {
    if (!pendingConfirm.invoice || !pendingConfirm.targetStatus) return;
    const invoiceId = pendingConfirm.invoice.id;
    const toStatus = pendingConfirm.targetStatus;

    setActionLoading(invoiceId);
    try {
      let updated: InvoiceListItem;
      if (toStatus === "SENT") updated = await invoicesApi.markSent(invoiceId);
      else if (toStatus === "PAID") updated = await invoicesApi.markPaid(invoiceId);
      else if (toStatus === "OVERDUE") updated = await invoicesApi.markOverdue(invoiceId);
      else if (toStatus === "CANCELLED") updated = await invoicesApi.markCancelled(invoiceId);
      else return;
      onUpdate(updated);
    } catch {}
    setActionLoading(null);
    setPendingConfirm({ open: false, invoice: null, targetStatus: null });
  };

  const handleCancelTransition = () => {
    setPendingConfirm({ open: false, invoice: null, targetStatus: null });
  };

  const handleMarkSent = (inv: InvoiceListItem, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setPendingConfirm({ open: true, invoice: inv, targetStatus: "SENT" });
  };

  const handleMarkPaid = (inv: InvoiceListItem, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setPendingConfirm({ open: true, invoice: inv, targetStatus: "PAID" });
  };

  const handleDuplicate = async (inv: InvoiceListItem, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setActionLoading(inv.id);
    try {
      const cloned = await invoicesApi.duplicate(inv.id);
      window.location.href = `/dashboard/projects/${projectUid}/invoices/${cloned.id}/edit`;
    } catch {}
    setActionLoading(null);
  };

  return (
    <>
      <InvoiceTransitionConfirmModal
        open={pendingConfirm.open}
        invoice={pendingConfirm.invoice}
        targetStatus={pendingConfirm.targetStatus}
        loading={actionLoading !== null}
        onConfirm={handleConfirmTransition}
        onCancel={handleCancelTransition}
      />

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4 min-h-[calc(100vh-280px)]">
          {COLUMNS.map(col => {
            const cards = cols[col.id] ?? [];
            return (
              <div key={col.id} className={`flex-1 min-w-[220px] max-w-[300px] rounded-2xl ${col.bg} flex flex-col`}>
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black uppercase tracking-wide ${col.color}`}>{col.label}</span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${col.count_color}`}>{cards.length}</span>
                  </div>
                  {col.id === "DRAFT" && (
                    <Link
                      href={`/dashboard/projects/${projectUid}/invoices/new`}
                      className="w-5 h-5 rounded-md bg-surface-200 dark:bg-surface-700 flex items-center justify-center hover:bg-accent/20 hover:text-accent text-surface-500 dark:text-surface-400 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </Link>
                  )}
                </div>

                {/* Drop zone */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 px-2 pb-2 space-y-2 rounded-b-2xl transition-colors min-h-[60px] ${
                        snapshot.isDraggingOver ? "bg-accent/10 ring-1 ring-accent/30 ring-inset" : ""
                      }`}
                    >
                      {cards.map((inv, idx) => (
                        <Draggable
                          key={inv.id}
                          draggableId={String(inv.id)}
                          index={idx}
                          isDragDisabled={!(ALLOWED_TRANSITIONS[inv.status]?.length)}
                        >
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                            >
                              <InvoiceKanbanCard
                                invoice={inv}
                                projectUid={projectUid}
                                actionLoading={actionLoading}
                                onMarkSent={handleMarkSent}
                                onMarkPaid={handleMarkPaid}
                                onDuplicate={handleDuplicate}
                                isDragging={snap.isDragging}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {cards.length === 0 && !snapshot.isDraggingOver && (
                        <div className="text-[10px] text-surface-400 text-center py-6 opacity-60">
                          No invoices
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </>
  );
};
