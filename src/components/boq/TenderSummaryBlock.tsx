"use client";
/**
 * TenderSummaryBlock — Professional Tender Cost Summary with GST & Contingency
 * ===========================================================================
 * Shows a full 5-line tender summary:
 *   Work Cost → Overhead → Contingency → Sub-Total → GST → Grand Total
 * Architect can toggle each line and switch GST rate (12%/18%).
 */

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";

interface TenderSummaryBlockProps {
  workCost: number;
  buaSqFt: number;
}

function formatINR(val: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
}

function inCr(val: number): string {
  if (val >= 10000000) return `${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `${(val / 100000).toFixed(1)} L`;
  return formatINR(val);
}

export function TenderSummaryBlock({ workCost, buaSqFt }: TenderSummaryBlockProps) {
  const [includeOverhead, setIncludeOverhead] = useState(true);
  const [includeContingency, setIncludeContingency] = useState(true);
  const [gstRate, setGstRate] = useState<12 | 18>(12);
  const [expanded, setExpanded] = useState(true);

  const overhead = includeOverhead ? workCost * 0.10 : 0;
  const contingency = includeContingency ? workCost * 0.05 : 0;
  const subTotal = workCost + overhead + contingency;

  // Works contract GST split: ~60% material, ~40% labour
  const gstMaterial = subTotal * 0.60 * (gstRate / 100);
  const gstLabour = subTotal * 0.40 * (gstRate === 18 ? 0.18 : 0.12);
  const totalGst = gstMaterial + gstLabour;
  const grandTotal = subTotal + totalGst;
  const ratePerSqFt = buaSqFt > 0 ? Math.round(grandTotal / buaSqFt) : 0;

  if (workCost <= 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <button
        onClick={() => setExpanded((o) => !o)}
        className="w-full px-5 py-3.5 bg-slate-50/80 hover:bg-slate-100 transition-colors flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">📋</span>
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            Tender Cost Summary (Incl. Overhead & GST)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-black font-mono text-emerald-900">{inCr(grandTotal)}</span>
          {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="p-4 space-y-3">
          {/* GST Rate Toggle */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
              <Info size={11} />
              GST Rate (Works Contract)
            </span>
            <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
              {([12, 18] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setGstRate(r)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-black cursor-pointer transition-all ${
                    gstRate === r
                      ? "bg-emerald-800 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {r}% {r === 12 ? "(Affordable)" : "(Commercial)"}
                </button>
              ))}
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-1.5 text-xs">
            <LineRow
              label="Base Work Cost (CPWD DSR 2023)"
              amount={workCost}
              sublabel="Direct construction quantities × DSR rates"
            />
            <LineRow
              label="Contractor Overhead & Profit (10%)"
              amount={overhead}
              sublabel="Site management, establishment charges"
              toggle
              active={includeOverhead}
              onToggle={() => setIncludeOverhead((v) => !v)}
            />
            <LineRow
              label="Contingency Allowance (5%)"
              amount={contingency}
              sublabel="Unforeseen site conditions, price escalation"
              toggle
              active={includeContingency}
              onToggle={() => setIncludeContingency((v) => !v)}
            />

            {/* Sub-total divider */}
            <div className="flex items-center justify-between py-1.5 border-t border-b border-slate-200 my-1">
              <span className="font-black text-slate-700">Sub-Total (before GST)</span>
              <span className="font-black font-mono text-slate-900">{formatINR(subTotal)}</span>
            </div>

            <LineRow
              label={`GST on Materials @${gstRate}% (60% of Sub-Total)`}
              amount={gstMaterial}
              sublabel="GST on material supply component"
            />
            <LineRow
              label={`GST on Labour @${gstRate}% (40% of Sub-Total)`}
              amount={gstLabour}
              sublabel="GST on labour & sub-contract services"
            />
          </div>

          {/* Grand Total */}
          <div className="mt-3 p-4 bg-emerald-950 rounded-xl text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  GRAND TOTAL (All Inclusive)
                </div>
                <div className="text-2xl font-black font-mono text-emerald-100 mt-0.5">
                  {formatINR(grandTotal)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-emerald-400 font-bold">Rate / sq.ft</div>
                <div className="text-lg font-black font-mono text-white">
                  ₹{ratePerSqFt.toLocaleString("en-IN")}
                </div>
                <div className="text-[9px] text-emerald-400 mt-0.5">(Incl. GST & OH)</div>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 leading-relaxed">
            *GST computed as Works Contract — 60% material + 40% labour split. Actual rate depends on project type per CGST Schedule III.
            Overhead and contingency toggleable as per contract terms.
          </p>
        </div>
      )}
    </div>
  );
}

function LineRow({
  label, amount, sublabel, toggle, active, onToggle,
}: {
  label: string; amount: number; sublabel?: string;
  toggle?: boolean; active?: boolean; onToggle?: () => void;
}) {
  return (
    <div className={`flex items-start justify-between gap-2 p-2 rounded-lg ${toggle && !active ? "opacity-40" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {toggle && (
            <button
              onClick={onToggle}
              className={`w-7 h-4 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
                active ? "bg-emerald-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`block w-3 h-3 bg-white rounded-full shadow transition-transform mx-0.5 ${
                  active ? "translate-x-3" : "translate-x-0"
                }`}
              />
            </button>
          )}
          <span className="font-semibold text-slate-700 text-[11px] leading-tight">{label}</span>
        </div>
        {sublabel && <div className="text-[10px] text-slate-400 mt-0.5 ml-0.5">{sublabel}</div>}
      </div>
      <span className="font-mono font-bold text-slate-900 text-[11px] whitespace-nowrap">{formatINR(amount)}</span>
    </div>
  );
}
