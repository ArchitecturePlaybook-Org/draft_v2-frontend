"use client";

import React, { useState } from "react";
import { 
  type QuotationData, 
  acceptOrderQuotation, 
  getQuotationPdfUrl 
} from "@/domains/showroom/api";
import { toast } from "sonner";

interface QuotationCardProps {
  quotation: QuotationData;
  orderId: number;
  isBuyer: boolean;
  onAccepted?: () => void;
}

export function QuotationCard({
  quotation,
  orderId,
  isBuyer,
  onAccepted,
}: QuotationCardProps) {
  const [accepting, setAccepting] = useState(false);
  const isAccepted = quotation.status === "ACCEPTED";

  const handleAccept = async () => {
    if (!confirm(`Are you sure you want to accept Quotation #${quotation.quotation_number} for ₹${quotation.grand_total.toFixed(2)} and lock this contract?`)) return;

    setAccepting(true);
    try {
      await acceptOrderQuotation(orderId);
      toast.success(`Quotation #${quotation.quotation_number} accepted! Contract is locked.`);
      if (onAccepted) onAccepted();
    } catch (err: any) {
      toast.error(err.message || "Failed to accept quotation.");
    } finally {
      setAccepting(false);
    }
  };

  const handleDownloadPdf = () => {
    const pdfUrl = getQuotationPdfUrl(orderId);
    window.open(pdfUrl, "_blank");
  };

  return (
    <div className="my-2 p-3.5 bg-surface-card border-2 border-accent/40 rounded-2xl shadow-md space-y-3 text-xs w-full max-w-md select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-surface-200/80 dark:border-surface-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent text-background font-black flex items-center justify-center text-xs shadow-2xs">
            📄
          </div>
          <div>
            <h4 className="font-black text-primary text-xs leading-none tracking-tight">
              Official Quotation Offer
            </h4>
            <span className="font-mono text-[10px] font-bold text-surface-400">
              #{quotation.quotation_number}
            </span>
          </div>
        </div>

        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
          isAccepted
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
            : "bg-accent/15 text-accent border-accent/30 animate-pulse"
        }`}>
          {isAccepted ? "✅ Contract Locked" : "⏳ Offer Active"}
        </span>
      </div>

      {/* Breakdown Table */}
      <div className="space-y-1.5 bg-surface-100/60 dark:bg-surface-900/50 p-2.5 rounded-xl border border-surface-200/60 dark:border-surface-800">
        <div className="flex justify-between font-medium text-surface-500">
          <span>Unit Rate Price:</span>
          <span className="font-mono font-bold text-primary">₹{quotation.unit_price.toFixed(2)}</span>
        </div>

        <div className="flex justify-between font-medium text-surface-500">
          <span>Quantity Requested:</span>
          <span className="font-mono font-bold text-primary">{quotation.quantity} units</span>
        </div>

        {quotation.discount_amount > 0 && (
          <div className="flex justify-between font-semibold text-rose-500">
            <span>Special Discount:</span>
            <span className="font-mono">-₹{quotation.discount_amount.toFixed(2)}</span>
          </div>
        )}

        {quotation.freight_charges > 0 && (
          <div className="flex justify-between font-medium text-surface-500">
            <span>Freight &amp; Handling:</span>
            <span className="font-mono font-bold text-primary">+₹{quotation.freight_charges.toFixed(2)}</span>
          </div>
        )}

        {quotation.tax_amount > 0 && (
          <div className="flex justify-between font-medium text-surface-500">
            <span>Tax / GST ({quotation.tax_rate_percent}%):</span>
            <span className="font-mono font-bold text-primary">+₹{quotation.tax_amount.toFixed(2)}</span>
          </div>
        )}

        <div className="pt-1.5 border-t border-surface-200 dark:border-surface-700 flex justify-between font-black text-primary text-xs">
          <span>GRAND TOTAL CONTRACT:</span>
          <span className="font-mono text-accent text-sm">₹{quotation.grand_total.toFixed(2)}</span>
        </div>
      </div>

      {/* Terms & Notes */}
      {(quotation.payment_terms || quotation.valid_until) && (
        <div className="p-2 bg-surface-100/40 dark:bg-surface-900/30 rounded-lg text-[10px] space-y-0.5 text-surface-500">
          {quotation.payment_terms && (
            <p>• <strong>Payment Terms:</strong> {quotation.payment_terms}</p>
          )}
          {quotation.valid_until && (
            <p>• <strong>Validity Expiry:</strong> {quotation.valid_until}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {isBuyer && !isAccepted && (
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-[11px] transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1"
          >
            {accepting ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <span>Accept Quotation &amp; Lock Contract →</span>
            )}
          </button>
        )}

        <button
          onClick={handleDownloadPdf}
          className="px-3 py-1.5 bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 text-primary font-extrabold rounded-xl text-[11px] border border-surface-200/60 dark:border-surface-700 transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
          title="View & Download Proforma Invoice PDF"
        >
          <span>📄 Proforma Invoice</span>
        </button>
      </div>

    </div>
  );
}
