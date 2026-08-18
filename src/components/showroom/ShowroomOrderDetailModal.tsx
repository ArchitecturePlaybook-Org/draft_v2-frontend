"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ProductOrder, type OrderStatus } from "@/domains/showroom/api";
import { format } from "date-fns";

const STATUS_BADGES: Record<OrderStatus, { label: string; style: string; icon: string; explanation: string }> = {
  PENDING: { 
    label: "Pending", 
    style: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30", 
    icon: "⏳",
    explanation: "Waiting for product vendor to review & accept your quotation inquiry."
  },
  ACCEPTED: { 
    label: "Accepted by Vendor", 
    style: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", 
    icon: "✅",
    explanation: "Vendor accepted your inquiry! Negotiate pricing via live chat below."
  },
  DECLINED: { 
    label: "Declined", 
    style: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30", 
    icon: "❌",
    explanation: "Vendor declined this inquiry or product is currently out of stock."
  },
  FULFILLED: { 
    label: "Fulfilled / Delivered", 
    style: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30", 
    icon: "📦",
    explanation: "Order has been processed and sample/product delivered."
  },
  CANCELLED: { 
    label: "Cancelled", 
    style: "bg-surface-200 dark:bg-surface-800 text-surface-500 border-surface-300 dark:border-surface-700", 
    icon: "🚫",
    explanation: "Inquiry was cancelled by buyer."
  },
};

interface ShowroomOrderDetailModalProps {
  order: ProductOrder | null;
  isOpen: boolean;
  onClose: () => void;
  mode: "buyer" | "vendor";
  onOpenChat: (order: ProductOrder) => void;
  onCancelOrder?: (id: number) => void;
  onUpdateStatus?: (id: number, status: OrderStatus, vendorNote?: string) => void;
}

export function ShowroomOrderDetailModal({
  order,
  isOpen,
  onClose,
  mode,
  onOpenChat,
  onCancelOrder,
  onUpdateStatus,
}: ShowroomOrderDetailModalProps) {
  const pathname = usePathname();
  const basePath = pathname.startsWith("/dashboard/showroom") ? "/dashboard/showroom" : "/showroom";

  const [vendorNote, setVendorNote] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (order) {
      setVendorNote(order.vendor_note || "");
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const badge = STATUS_BADGES[order.status] || STATUS_BADGES.PENDING;

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "PPP 'at' p");
    } catch {
      return dateStr;
    }
  };

  const handleStatusAction = async (status: OrderStatus) => {
    if (!onUpdateStatus) return;
    setUpdating(true);
    try {
      await onUpdateStatus(order.id, status, vendorNote);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-fade-in">
      {/* Fixed Non-Scrollable Panel Container */}
      <div className="w-full max-w-xl bg-surface-card border-l border-surface-200 dark:border-surface-800 h-full flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* 1. Fixed Drawer Header */}
        <div className="p-5 border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-accent/20 text-accent flex items-center justify-center font-black text-lg border border-accent/30 shadow-xs shrink-0">
              📄
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-surface-400">Order #{order.id}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border flex items-center gap-1 ${badge.style}`}>
                  <span>{badge.icon}</span>
                  <span>{badge.label}</span>
                </span>
              </div>
              <h2 className="text-base font-black text-primary tracking-tight truncate">
                Order &amp; RFQ Detailed Form
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-surface-200/60 dark:bg-surface-800 hover:bg-surface-300 text-surface-600 dark:text-surface-300 font-bold flex items-center justify-center text-sm transition-colors cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* 2. Scrollable Middle Form Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto min-h-0">
          
          {/* Product Overview Card Form Block */}
          <div className="p-4 bg-surface-100/60 dark:bg-surface-900/40 border border-surface-200 dark:border-surface-800 rounded-2xl flex flex-col sm:flex-row gap-4">
            <div className="w-24 h-24 bg-surface-card rounded-xl overflow-hidden shrink-0 border border-surface-200 dark:border-surface-800">
              {order.product_cover ? (
                <img src={order.product_cover} alt={order.product_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl text-surface-400">🏛️</div>
              )}
            </div>

            <div className="flex-1 space-y-2 min-w-0">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-accent">Product Name</span>
                <h3 className="font-black text-base text-primary truncate">
                  {order.product_name}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-surface-500">
                <span>Quantity: <strong className="text-primary font-bold">{order.quantity} unit(s)</strong></span>
                <span>Ref: <code className="text-[11px] font-mono">{order.product_slug}</code></span>
              </div>

              <Link
                href={`${basePath}/${order.product_slug}`}
                className="inline-block px-3 py-1.5 bg-surface-card border border-surface-200 dark:border-surface-700 text-primary font-bold text-xs rounded-xl hover:border-accent transition-colors"
              >
                View Full Catalog Specs →
              </Link>
            </div>
          </div>

          {/* Form Field: Customer & Timestamp Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-surface-card border border-surface-200 dark:border-surface-800 rounded-2xl space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-surface-400 block">
                {mode === "buyer" ? "Vendor Store Profile" : "Buyer Customer Name"}
              </label>
              <div className="flex items-center gap-2 text-sm font-black text-primary truncate">
                <span>{mode === "buyer" ? "🏛️" : "👤"}</span>
                <span className="truncate">{mode === "buyer" ? "Showroom Vendor Store" : order.buyer_name}</span>
              </div>
            </div>

            <div className="p-4 bg-surface-card border border-surface-200 dark:border-surface-800 rounded-2xl space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-surface-400 block">
                Date &amp; Time Placed
              </label>
              <p className="text-xs font-bold text-primary">
                {formatDate(order.created_at)}
              </p>
            </div>
          </div>

          {/* Form Field: Buyer Inquiry Message */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-surface-400 block flex items-center justify-between">
              <span>Buyer Quotation Message / Project Requirements</span>
              <span className="text-[9px] font-bold text-accent">Submitted Inquiry</span>
            </label>
            <div className="p-4 bg-surface-100/70 dark:bg-surface-900/60 border border-surface-200 dark:border-surface-800 rounded-2xl text-xs text-primary font-medium italic leading-relaxed whitespace-pre-wrap">
              {order.message || "No custom message provided with this standard quotation request."}
            </div>
          </div>

          {/* Form Field: Vendor Response & Quotation Note */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-accent block flex items-center justify-between">
              <span>Vendor Reply &amp; Quotation Note</span>
              {mode === "vendor" && <span className="text-[9px] font-bold text-surface-400">(Editable)</span>}
            </label>

            {mode === "vendor" ? (
              <textarea
                rows={3}
                value={vendorNote}
                onChange={(e) => setVendorNote(e.target.value)}
                placeholder="Enter quotation pricing, lead times, availability, or pickup instructions..."
                className="w-full p-3.5 bg-surface-card border border-surface-200 dark:border-surface-700 rounded-2xl text-xs outline-none focus:border-accent text-primary font-medium resize-none shadow-inner"
              />
            ) : (
              <div className="p-4 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-xs font-semibold text-primary leading-relaxed whitespace-pre-wrap">
                {order.vendor_note || "Vendor has not added a custom quotation note yet."}
              </div>
            )}
          </div>

        </div>

        {/* 3. Fixed Drawer Action Footer */}
        <div className="p-4 border-t border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900 shrink-0 space-y-2">
          <h4 className="text-[10px] font-black uppercase tracking-wider text-surface-400">
            Order Management Actions
          </h4>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live Chat Action */}
            <button
              onClick={() => {
                onClose();
                onOpenChat(order);
              }}
              className="px-4 py-2.5 bg-accent/20 hover:bg-accent/30 text-accent border border-accent/40 font-extrabold rounded-xl text-xs transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <span>💬 Open Live Negotiation Chat</span>
            </button>

            {/* Vendor Actions */}
            {mode === "vendor" && onUpdateStatus && (
              <>
                {order.status === "PENDING" && (
                  <>
                    <button
                      onClick={() => handleStatusAction("ACCEPTED")}
                      disabled={updating}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-40"
                    >
                      ✓ Accept Order
                    </button>
                    <button
                      onClick={() => handleStatusAction("DECLINED")}
                      disabled={updating}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-40"
                    >
                      ✕ Decline
                    </button>
                  </>
                )}

                {order.status === "ACCEPTED" && (
                  <button
                    onClick={() => handleStatusAction("FULFILLED")}
                    disabled={updating}
                    className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-40"
                  >
                    📦 Mark Fulfilled
                  </button>
                )}
              </>
            )}

            {/* Buyer Actions */}
            {mode === "buyer" && onCancelOrder && (order.status === "PENDING" || order.status === "ACCEPTED") && (
              <button
                onClick={() => {
                  onCancelOrder(order.id);
                  onClose();
                }}
                className="px-4 py-2.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                🚫 Cancel Order Enquiry
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
