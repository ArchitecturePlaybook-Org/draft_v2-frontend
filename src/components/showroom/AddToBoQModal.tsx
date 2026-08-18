"use client";

import React, { useState, useEffect } from "react";
import { type Product, addToProjectBoQ } from "@/domains/showroom/api";
import { projectsApi } from "@/domains/projects/api";
import { type Project } from "@/types/projects";
import { toast } from "sonner";

interface AddToBoQModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSuccess?: () => void;
}

const TRADE_DIVISIONS = [
  "09 - Finishes (Flooring, Tiles, Paints)",
  "12 - Furnishings (Furniture, Fixtures)",
  "06 - Woodwork & Plastics (Millwork)",
  "03 - Concrete & Masonry",
  "16 - Electrical & Lighting",
  "15 - Mechanical & HVAC",
  "02 - Sitework & Outdoor",
];

export function AddToBoQModal({
  isOpen,
  onClose,
  product,
  onSuccess,
}: AddToBoQModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const [tradeDivision, setTradeDivision] = useState(TRADE_DIVISIONS[0]);
  const [quantity, setQuantity] = useState("10");
  const [unitPrice, setUnitPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoadingProjects(true);
      projectsApi
        .getProjects()
        .then((res) => {
          setProjects(res);
          if (res.length > 0) {
            setSelectedProjectId(String(res[0].id));
          }
        })
        .catch(() => {
          toast.error("Failed to load active construction projects.");
        })
        .finally(() => setLoadingProjects(false));
    }
  }, [isOpen]);

  useEffect(() => {
    if (product) {
      const defaultPrice = product.price_min ? String(product.price_min) : "";
      setUnitPrice(defaultPrice);
      setQuantity("10");
      setNotes(`Specified for ${product.name}`);
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const qty = parseInt(quantity, 10) || 1;
  const rate = parseFloat(unitPrice) || 0;
  const totalCost = qty * rate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      toast.error("Please select a target active project.");
      return;
    }

    setSubmitting(true);
    try {
      await addToProjectBoQ(product.slug, {
        project_id: parseInt(selectedProjectId, 10),
        trade_division: tradeDivision,
        quantity: qty,
        unit_price: rate,
        notes: notes.trim(),
      });

      toast.success(
        `Added '${product.name}' (${qty} units @ ₹${rate.toFixed(2)}) to Project #${selectedProjectId} BoQ!`
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to add product to Project BoQ.");
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
              📐
            </div>
            <div>
              <h2 className="text-sm font-black text-primary tracking-tight">
                Add Product to Project BoQ
              </h2>
              <p className="text-[11px] font-medium text-surface-400">
                Directly push item specifications into cost estimation budget sheet
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

        {/* Product Preview Card */}
        <div className="p-3 bg-surface-100/60 dark:bg-surface-900/40 border-b border-surface-200/60 dark:border-surface-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-card border border-surface-200 dark:border-surface-800 overflow-hidden shrink-0 shadow-2xs">
            {product.cover_image_url ? (
              <img src={product.cover_image_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-surface-400 font-bold">🏛️</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-black text-primary truncate">{product.name}</h4>
            <p className="text-[10px] font-semibold text-surface-400 truncate">
              {product.category} · Vendor: {product.vendor_name || "Verified Supplier"}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {/* Target Project Selection */}
          <div className="space-y-1">
            <label className="font-extrabold text-primary">Target Active Project *</label>
            {loadingProjects ? (
              <div className="h-9 w-full bg-surface-100 dark:bg-surface-800 rounded-xl animate-pulse" />
            ) : projects.length === 0 ? (
              <p className="text-xs text-rose-500 font-bold p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                No active projects found. Create a project first under /dashboard/projects.
              </p>
            ) : (
              <select
                required
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-2 font-bold outline-none focus:border-accent text-primary"
              >
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    #{proj.id} · {proj.title} ({proj.kind || "General Construction"})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Trade Division */}
          <div className="space-y-1">
            <label className="font-extrabold text-primary">MasterFormat Trade Division *</label>
            <select
              value={tradeDivision}
              onChange={(e) => setTradeDivision(e.target.value)}
              className="w-full bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-2 font-medium outline-none focus:border-accent text-primary"
            >
              {TRADE_DIVISIONS.map((td) => (
                <option key={td} value={td}>{td}</option>
              ))}
            </select>
          </div>

          {/* Quantity & Unit Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-extrabold text-primary">Quantity Needed *</label>
              <input
                type="number"
                required
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-2 font-mono font-bold outline-none focus:border-accent text-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="font-extrabold text-primary">Est. Unit Rate (₹) *</label>
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
          </div>

          {/* Specification Variance Notes */}
          <div className="space-y-1">
            <label className="font-extrabold text-primary">Specification / Finish Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Approved finish code: MB-901. Requires anti-skid treatment for wet areas."
              className="w-full bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl p-2 font-medium outline-none focus:border-accent text-primary leading-normal"
            />
          </div>

          {/* Cost Impact Preview Box */}
          <div className="p-3.5 bg-accent/10 border border-accent/30 rounded-xl space-y-1 text-xs">
            <div className="flex justify-between font-semibold text-surface-600 dark:text-surface-300">
              <span>Estimated Trade Item Subtotal:</span>
              <span className="font-mono">{qty} x ₹{rate.toFixed(2)}</span>
            </div>
            <div className="pt-1.5 border-t border-accent/20 flex justify-between font-black text-primary text-sm">
              <span>TOTAL ESTIMATED COST:</span>
              <span className="font-mono text-accent">₹{totalCost.toFixed(2)}</span>
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
              disabled={submitting || projects.length === 0}
              className="px-5 py-2 bg-accent text-background font-black rounded-xl hover:opacity-95 transition-all shadow-xs disabled:opacity-40 cursor-pointer flex items-center gap-2"
            >
              {submitting ? (
                <span className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin" />
              ) : (
                <span>Add to Project BoQ →</span>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
