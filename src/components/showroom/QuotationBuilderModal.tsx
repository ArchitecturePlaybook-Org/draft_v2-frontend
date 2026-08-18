"use client";

import React, { useState, useEffect } from "react";
import { type ProductOrder, createOrderQuotation } from "@/domains/showroom/api";
import { toast } from "sonner";

interface QuotationBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductOrder | null;
  onSuccess?: () => void;
}

export function QuotationBuilderModal({
  isOpen,
  onClose,
  order,
  onSuccess,
}: QuotationBuilderModalProps) {
  const [unitPrice, setUnitPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [freightCharges, setFreightCharges] = useState("0");
  const [taxRatePercent, setTaxRatePercent] = useState("18");
  const [validUntil, setValidUntil] = useState("30 Days");
  const [paymentTerms, setPaymentTerms] = useState("50% Deposit, 50% Balance on Delivery");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (order) {
      setQuantity(String(order.quantity || 1));
      setUnitPrice("");
      setDiscountAmount("0");
      setFreightCharges("0");
      setTaxRatePercent("18");
      setValidUntil("30 Days");
      setPaymentTerms("50% Deposit, 50% Balance on Delivery");
      setNotes(`Quotation offer for Order #${order.id} - ${order.product_name}`);
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  // Live calculation helpers
  const uPrice = parseFloat(unitPrice) || 0;
  const qty = parseInt(quantity, 10) || 1;
  const disc = parseFloat(discountAmount) || 0;
  const freight = parseFloat(freightCharges) || 0;
  const taxRate = parseFloat(taxRatePercent) || 0;

  const subtotal = Math.max(0, uPrice * qty - disc);
  const taxAmount = (subtotal + freight) * (taxRate / 100);
  const grandTotal = subtotal + freight + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uPrice || uPrice <= 0) {
      toast.error("Please enter a valid unit rate price.");
      return;
    }

    setSubmitting(true);
    try {
      await createOrderQuotation(order.id, {
        unit_price: uPrice,
        quantity: qty,
        discount_amount: disc,
        freight_charges: freight,
        tax_rate_percent: taxRate,
        valid_until: validUntil.trim(),
        payment_terms: paymentTerms.trim(),
        notes: notes.trim(),
      });

      toast.success(`Official Quotation created for Order #${order.id}!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create official quotation offer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none">
      <div className="w-full max-w-lg bg-surface-card border border-surface-200 dark:border-surface-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-surface-200 dark:border-surface-800 bg-surface-50/80 dark:bg-surface-900/80 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent/20 text-accent flex items-center justify-center font-black text-sm border border-accent/30 shadow-2xs">
              📄
            </div>
            <div>
              <h2 className="text-sm font-black text-primary tracking-tight">
                Create Official Quotation Offer
              </h2>
              <p className="text-[11px] font-medium text-surface-400">
                Order #{order.id} · Product: {order.product_name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-surface-200/60 dark:bg-surface-800 hover:bg-surface-300 text-surface-600 dark:text-surface-300 font-bold flex items-center justify-center text-xs transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {/* Rate & Qty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-extrabold text-primary">Unit Rate Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="1200.00"
                className="w-full bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-2 font-mono font-bold outline-none focus:border-accent text-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="font-extrabold text-primary">Quantity</label>
              <input
                type="number"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-2 font-mono font-bold outline-none focus:border-accent text-primary"
              />
            </div>
          </div>

          {/* Adjustments */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-extrabold text-primary">Discount (₹)</label>
              <input
                type="number"
                step="0.01"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-1.5 font-mono outline-none focus:border-accent text-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="font-extrabold text-primary">Freight / Logistics (₹)</label>
              <input
                type="number"
                step="0.01"
                value={freightCharges}
                onChange={(e) => setFreightCharges(e.target.value)}
                placeholder="0.00"
                className="w-full bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-1.5 font-mono outline-none focus:border-accent text-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="font-extrabold text-primary">Tax / GST Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={taxRatePercent}
                onChange={(e) => setTaxRatePercent(e.target.value)}
                placeholder="18"
                className="w-full bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-1.5 font-mono outline-none focus:border-accent text-primary"
              />
            </div>
          </div>

          {/* Commercial Terms */}
          <div className="space-y-3 p-3.5 bg-surface-100/50 dark:bg-surface-900/40 border border-surface-200/60 dark:border-surface-800 rounded-xl">
            <div className="space-y-1">
              <label className="font-extrabold text-primary">Payment Terms</label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="e.g. 50% Advance, 50% before dispatch"
                className="w-full bg-surface-card border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-1.5 outline-none focus:border-accent text-primary font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-extrabold text-primary">Validity Expiry</label>
              <input
                type="text"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                placeholder="e.g. 30 Days from date of offer"
                className="w-full bg-surface-card border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-1.5 outline-none focus:border-accent text-primary font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-extrabold text-primary">Vendor Quotation Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Custom specifications, finish details, delivery timeline notes..."
                className="w-full bg-surface-card border border-surface-200 dark:border-surface-700 rounded-xl p-2 outline-none focus:border-accent text-primary font-medium leading-normal"
              />
            </div>
          </div>

          {/* Summary Breakdown Box */}
          <div className="p-3.5 bg-accent/10 border border-accent/30 rounded-xl space-y-1 text-xs">
            <div className="flex justify-between font-semibold text-surface-600 dark:text-surface-300">
              <span>Subtotal ({qty} x ₹{uPrice.toFixed(2)} - ₹{disc.toFixed(2)}):</span>
              <span className="font-mono">₹{subtotal.toFixed(2)}</span>
            </div>
            {freight > 0 && (
              <div className="flex justify-between font-semibold text-surface-600 dark:text-surface-300">
                <span>Freight &amp; Handling:</span>
                <span className="font-mono">+₹{freight.toFixed(2)}</span>
              </div>
            )}
            {taxRate > 0 && (
              <div className="flex justify-between font-semibold text-surface-600 dark:text-surface-300">
                <span>Tax / GST ({taxRate}%):</span>
                <span className="font-mono">+₹{taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="pt-1.5 border-t border-accent/20 flex justify-between font-black text-primary text-sm">
              <span>CONTRACT GRAND TOTAL:</span>
              <span className="font-mono text-accent">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-surface-200/60 dark:border-surface-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-surface-200 dark:border-surface-700 font-extrabold text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-accent text-background font-black rounded-xl hover:opacity-95 transition-all shadow-xs disabled:opacity-40 cursor-pointer flex items-center gap-2"
            >
              {submitting ? (
                <span className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin" />
              ) : (
                <span>Issue Quotation Offer →</span>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
