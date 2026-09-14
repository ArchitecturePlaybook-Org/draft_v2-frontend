"use client";
import React, { useCallback } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Trash2, Plus, GripVertical } from "lucide-react";
import type { CreateInvoiceItemPayload, InvoiceItemUnit } from "@/domains/invoices/types";
import { UNIT_OPTIONS } from "@/domains/invoices/types";

export interface LineItem extends Omit<CreateInvoiceItemPayload, "sort_order"> {
  _key: string;
}

interface InvoiceLineItemsEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  defaultTaxRate?: number;
}

function calcAmount(qty: number, rate: number): number {
  return Math.round(qty * rate * 100) / 100;
}
function calcTaxAmount(amount: number, taxRate: number): number {
  return Math.round(amount * (taxRate / 100) * 100) / 100;
}

function newItem(defaultTaxRate = 18): LineItem {
  return {
    _key: `item-${Date.now()}-${Math.random()}`,
    description: "",
    unit: "nos",
    quantity: 1,
    unit_rate: 0,
    tax_rate: defaultTaxRate,
  };
}

export function computeLineItemTotals(items: LineItem[]): {
  subtotal: number; taxTotal: number; grandTotal: number;
} {
  let subtotal = 0, taxTotal = 0;
  for (const item of items) {
    const amt = calcAmount(item.quantity, item.unit_rate);
    subtotal += amt;
    taxTotal += calcTaxAmount(amt, item.tax_rate);
  }
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    grandTotal: Math.round((subtotal + taxTotal) * 100) / 100,
  };
}

export const InvoiceLineItemsEditor: React.FC<InvoiceLineItemsEditorProps> = ({
  items,
  onChange,
  defaultTaxRate = 18,
}) => {
  const updateItem = useCallback(
    (key: string, field: keyof LineItem, value: unknown) => {
      onChange(items.map(item => item._key === key ? { ...item, [field]: value } : item));
    },
    [items, onChange]
  );

  const removeItem = useCallback(
    (key: string) => onChange(items.filter(item => item._key !== key)),
    [items, onChange]
  );

  const addItem = useCallback(() => onChange([...items, newItem(defaultTaxRate)]), [items, onChange, defaultTaxRate]);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const reordered = Array.from(items);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    onChange(reordered);
  }, [items, onChange]);

  const { subtotal, taxTotal, grandTotal } = computeLineItemTotals(items);
  const fmtINR = (v: number) =>
    new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

  return (
    <div className="space-y-3">
      {/* Table Header */}
      <div className="grid grid-cols-[24px_1fr_80px_80px_100px_70px_90px_36px] gap-1.5 px-2 mb-1">
        {["", "Description", "Unit", "Qty", "Rate (₹)", "GST %", "Amount (₹)", ""].map((h, i) => (
          <span key={i} className="text-[9px] font-bold uppercase tracking-wider text-surface-400 text-right first:text-left last:text-right">{h}</span>
        ))}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="invoice-line-items">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
              {items.map((item, idx) => {
                const amt = calcAmount(item.quantity, item.unit_rate);
                return (
                  <Draggable key={item._key} draggableId={item._key} index={idx}>
                    {(prov, snap) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        className={`grid grid-cols-[24px_1fr_80px_80px_100px_70px_90px_36px] gap-1.5 items-center border rounded-lg p-1.5 transition-all group ${
                          snap.isDragging
                            ? "bg-accent/15 border-accent shadow-xl ring-2 ring-accent/20"
                            : "bg-surface-50 border-surface-200 hover:border-surface-300"
                        }`}
                      >
                        {/* Drag handle */}
                        <span {...prov.dragHandleProps} className="flex items-center justify-center text-surface-400 hover:text-foreground cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-3.5 h-3.5" />
                        </span>

                        {/* Description */}
                        <input
                          value={item.description}
                          onChange={e => updateItem(item._key, "description", e.target.value)}
                          placeholder={`Item ${idx + 1} description…`}
                          className="w-full bg-transparent border-b border-surface-200 focus:border-accent outline-none text-[11px] text-foreground placeholder:text-surface-400 py-0.5 transition-colors"
                        />

                        {/* Unit */}
                        <select
                          value={item.unit}
                          onChange={e => updateItem(item._key, "unit", e.target.value as InvoiceItemUnit)}
                          className="w-full bg-surface-card border border-surface-200 rounded-md px-1 py-0.5 text-[10px] text-foreground focus:outline-none focus:border-accent"
                        >
                          {UNIT_OPTIONS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                        </select>

                        {/* Qty */}
                        <input type="number" min={0} step="any" value={item.quantity}
                          onChange={e => updateItem(item._key, "quantity", parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent border border-surface-200 rounded-md px-1 py-0.5 text-[11px] text-right text-foreground focus:outline-none focus:border-accent"
                        />

                        {/* Rate */}
                        <input type="number" min={0} step="any" value={item.unit_rate}
                          onChange={e => updateItem(item._key, "unit_rate", parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent border border-surface-200 rounded-md px-1 py-0.5 text-[11px] text-right text-foreground focus:outline-none focus:border-accent"
                        />

                        {/* GST % */}
                        <input type="number" min={0} max={100} step="0.5" value={item.tax_rate}
                          onChange={e => updateItem(item._key, "tax_rate", parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent border border-surface-200 rounded-md px-1 py-0.5 text-[11px] text-right text-foreground focus:outline-none focus:border-accent"
                        />

                        {/* Amount */}
                        <span className="text-right text-[11px] font-semibold text-foreground font-mono pr-1">
                          ₹{fmtINR(amt)}
                        </span>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => removeItem(item._key)}
                          className="flex items-center justify-center w-7 h-7 rounded-md text-surface-400 hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add Row */}
      <button
        type="button"
        onClick={addItem}
        className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:opacity-90 transition-colors px-3 py-2 rounded-lg hover:bg-accent/10 border border-dashed border-accent/40 hover:border-accent/70 w-full justify-center"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Line Item
      </button>

      {/* Totals */}
      {items.length > 0 && (
        <div className="flex justify-end pt-2">
          <div className="w-64 bg-surface-50/70 border border-surface-200 rounded-xl p-3.5 space-y-2 text-[11px] shadow-xs">
            <div className="flex justify-between text-surface-500">
              <span>Subtotal</span>
              <span className="font-semibold text-foreground font-mono">₹{fmtINR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-surface-500">
              <span>GST (est.)</span>
              <span className="font-semibold text-foreground font-mono">₹{fmtINR(taxTotal)}</span>
            </div>
            <div className="flex justify-between border-t border-surface-200 pt-2 text-[12px] font-black text-foreground">
              <span className="uppercase tracking-wider text-[10px] text-surface-400">Total</span>
              <span className="text-accent font-mono text-sm font-bold">₹{fmtINR(grandTotal)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { newItem };
