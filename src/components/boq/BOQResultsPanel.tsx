"use client";
/**
 * BOQResultsPanel — Professional Architect's Estimate View
 * =========================================================
 * Two-column layout (sidebar summary + main content panels):
 *  LEFT SIDEBAR: Project brief, total cost, GST summary, actions
 *  RIGHT MAIN:
 *    1. Trade breakdown (bars)
 *    2. Market Rate Benchmark (always visible, city-customizable)
 *    3. Engineer's BOQ Table (always visible, rate-editable per row)
 *
 * Rates are editable inline — total recalculates live.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Download, RotateCcw, TrendingUp, Info, Pencil,
  Check, X, AlertTriangle, ChevronDown, ChevronUp,
  FileText, Printer, Zap,
} from "lucide-react";
import type { WizardResult } from "./BOQWizard";
import type { BOQResult, BOQLineItem } from "@/domains/boq/types";

// ─── Format helpers ───────────────────────────────────────────────────────────

function fmt(val: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(val);
}

function inWords(val: number) {
  if (val >= 10_000_000) return `${(val / 10_000_000).toFixed(2)} Crore`;
  if (val >= 100_000)    return `${(val / 100_000).toFixed(2)} Lakh`;
  return fmt(val);
}

// ─── Animated counter ─────────────────────────────────────────────────────────

function AnimatedNumber({ target, className }: { target: number; className?: string }) {
  const [cur, setCur] = useState(0);
  const t0 = useRef<number | null>(null);
  useEffect(() => {
    t0.current = null;
    let raf: number;
    const tick = (now: number) => {
      if (!t0.current) t0.current = now;
      const p = Math.min((now - t0.current) / 1000, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setCur(Math.round(e * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <span className={className}>{fmt(cur)}</span>;
}

// ─── Market Benchmark data ────────────────────────────────────────────────────

const CITY_OPTS = [
  { v: "bengaluru", l: "Bengaluru" }, { v: "mumbai",    l: "Mumbai" },
  { v: "delhi",     l: "Delhi / NCR" }, { v: "hyderabad", l: "Hyderabad" },
  { v: "pune",      l: "Pune" },       { v: "chennai",   l: "Chennai" },
  { v: "ahmedabad", l: "Ahmedabad" }, { v: "rural",     l: "Rural / Tier-3" },
];

// [ecoLow, ecoHigh, stdLow, stdHigh, luxLow, luxHigh] — all per sq.ft, excl. GST
const BENCH: Record<string, [number,number,number,number,number,number]> = {
  "g1-residential-house":     [950, 1300, 1350, 1950, 2000, 3500],
  "multi-storey-rcc-frame":   [1100,1500, 1550, 2200, 2250, 3800],
  "pmay-g-rural-house":       [600,  900,  900, 1200, 1200, 1700],
  "boundary-wall":            [500,  750,  750, 1100, 1100, 1800],
  "commercial-office":        [2200,3000, 3000, 4500, 4500, 8000],
  "retail-showroom":          [1800,2500, 2500, 3500, 3500, 6000],
  "shopping-mall":            [3000,4000, 4000, 5500, 5500, 8500],
  "hotel-building":           [2500,3500, 3500, 5500, 5500, 9000],
  "school-classroom-block":   [1200,1700, 1700, 2500, 2500, 4000],
  "hospital-phc-building":    [1500,2200, 2200, 3500, 3500, 6000],
  "community-hall-bhawan":    [1100,1600, 1600, 2300, 2300, 3500],
  "industrial-warehouse-shed":[700, 1000, 1000, 1600, 1600, 2800],
  "factory-building":         [800, 1200, 1200, 1900, 1900, 3500],
  "modular-kitchen":          [800, 1200, 1300, 2000, 2100, 4500],
  "septic-tank":              [300,  500,  500,  800,  800, 1400],
  "internal-road-bt":         [400,  600,  600,  900,  900, 1500],
  "internal-road-cc":         [500,  750,  750, 1100, 1100, 1900],
};

const CITY_MULT: Record<string, number> = {
  bengaluru: 1.12, mumbai: 1.18, delhi: 1.00, hyderabad: 1.08,
  pune: 1.09, chennai: 1.06, ahmedabad: 0.93, rural: 0.80,
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface BOQResultsPanelProps {
  wizard: WizardResult;
  boqResult: BOQResult;
  buaSqFt: number;
  onReset: () => void;
  onExport: () => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BOQResultsPanel({ wizard, boqResult, buaSqFt, onReset, onExport }: BOQResultsPanelProps) {

  // Editable line items (local state — user can tweak rates)
  const [items, setItems] = useState<(BOQLineItem & { edited?: boolean })[]>(
    boqResult.line_items.map((i) => ({ ...i }))
  );
  const [editingIdx,  setEditingIdx ] = useState<number | null>(null);
  const [editRate,    setEditRate   ] = useState("");
  const [editQty,     setEditQty    ] = useState("");

  // Tender / GST
  const [includeOverhead, setIncludeOverhead] = useState(true);
  const [includeConting,  setIncludeConting ] = useState(true);
  const [gstRate,         setGstRate        ] = useState<12|18>(12);
  const [showTender,      setShowTender     ] = useState(true);

  // Market benchmark
  const [city, setCity] = useState("bengaluru");

  // Derived totals (recalculate from editable items)
  const baseCost = items.reduce((s, i) => s + i.quantity * i.rate, 0);
  const overhead  = includeOverhead ? baseCost * 0.10 : 0;
  const conting   = includeConting  ? baseCost * 0.05 : 0;
  const subTotal  = baseCost + overhead + conting;
  const gstMat    = subTotal * 0.60 * (gstRate / 100);
  const gstLab    = subTotal * 0.40 * (gstRate / 100);
  const grandTotal = subTotal + gstMat + gstLab;
  const ratePerSqFt = buaSqFt > 0 ? Math.round(baseCost / buaSqFt) : 0;
  const rateIncl    = buaSqFt > 0 ? Math.round(grandTotal / buaSqFt) : 0;
  // Use the all-in rate (grand total incl. GST, overhead, contingency) for benchmark comparison,
  // because BENCH values are market rates inclusive of profit, overhead and taxes.
  const benchmarkRate = rateIncl;
  const editedCount = items.filter((i) => i.edited).length;

  // ── Inline edit helpers ────────────────────────────────────────────────────

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditRate(items[idx].rate.toFixed(0));
    setEditQty(items[idx].quantity.toFixed(2));
  };

  const commitEdit = (idx: number) => {
    const newRate = parseFloat(editRate) || items[idx].rate;
    const newQty  = parseFloat(editQty)  || items[idx].quantity;
    setItems((prev) => prev.map((item, i) =>
      i === idx
        ? { ...item, rate: newRate, quantity: newQty, amount: newRate * newQty, edited: true }
        : item
    ));
    setEditingIdx(null);
  };

  const cancelEdit = () => setEditingIdx(null);

  const resetRates = () => {
    setItems(boqResult.line_items.map((i) => ({ ...i, edited: false })));
  };

  // ── Trade buckets ──────────────────────────────────────────────────────────

  const grp = (prefixes: string[]) =>
    items.filter((i) => prefixes.some((p) => i.item_code.startsWith(p)))
         .reduce((s, i) => s + i.quantity * i.rate, 0);

  const structure = grp(["2.", "4.", "5.", "6.", "7.", "8."]);
  const finishes  = grp(["11.", "12.", "13."]);
  const openings  = grp(["9.", "10."]);
  const plumbing  = grp(["17.", "18.", "19."]);
  const other     = Math.max(0, baseCost - structure - finishes - openings - plumbing);

  const trades = [
    { label: "Structure & Foundation", amount: structure, color: "bg-emerald-500", dot: "bg-emerald-500" },
    { label: "Flooring & Finishes",    amount: finishes,  color: "bg-amber-400",   dot: "bg-amber-400"   },
    { label: "Doors & Windows",        amount: openings,  color: "bg-sky-400",     dot: "bg-sky-400"     },
    { label: "Plumbing & Sanitation",  amount: plumbing,  color: "bg-violet-400",  dot: "bg-violet-400"  },
    ...(other > 500 ? [{ label: "Other Works", amount: other, color: "bg-slate-300", dot: "bg-slate-400" }] : []),
  ].map((t) => ({ ...t, pct: baseCost > 0 ? Math.round((t.amount / baseCost) * 100) : 0 }))
   .filter((t) => t.pct > 0);

  // ── Market benchmark ───────────────────────────────────────────────────────

  const benchRaw = BENCH[wizard.buildingType] || BENCH["g1-residential-house"];
  const mult     = CITY_MULT[city] || 1.0;
  const [eLow, eHigh, sLow, sHigh, lLow, lHigh] = benchRaw.map((v) => Math.round(v * mult));

  let segment = "Standard Grade ✓", segColor = "text-emerald-800", segBg = "bg-emerald-50 border-emerald-200";
  let verdict  = "✅ Within standard market range for this city.";
  let barPos   = 50;
  if (benchmarkRate > 0) {
    if (benchmarkRate < eLow) {
      segment = "Below Economy"; segColor = "text-amber-700"; segBg = "bg-amber-50 border-amber-200"; barPos = 2;
      verdict = "⚠️ Unusually low — verify quantities and site conditions.";
    } else if (benchmarkRate <= eHigh) {
      segment = "Economy Grade"; segColor = "text-amber-800"; segBg = "bg-amber-50 border-amber-200";
      barPos = Math.round(((benchmarkRate - eLow) / Math.max(1, eHigh - eLow)) * 30 + 3);
      verdict = "🌿 Economy range — suitable for budget-constrained projects.";
    } else if (benchmarkRate >= sLow && benchmarkRate <= sHigh) {
      barPos = Math.round(((benchmarkRate - sLow) / Math.max(1, sHigh - sLow)) * 33 + 33);
      verdict = `✅ Within standard market range (${Math.round(((benchmarkRate - sLow) / Math.max(1, sHigh - sLow)) * 100)}% through standard band).`;
    } else if (benchmarkRate <= lHigh) {
      segment = "Premium / Luxury"; segColor = "text-violet-800"; segBg = "bg-violet-50 border-violet-200";
      barPos = Math.round(((benchmarkRate - lLow) / Math.max(1, lHigh - lLow)) * 30 + 67);
      verdict = "💎 Premium range — luxury specifications expected.";
    } else {
      segment = "Ultra Premium"; segColor = "text-rose-700"; segBg = "bg-rose-50 border-rose-200"; barPos = 97;
      verdict = "👑 Above luxury range — verify scope for ultra-premium specification.";
    }
  }
  barPos = Math.min(96, Math.max(2, barPos));

  // ── Project meta string ────────────────────────────────────────────────────

  const meta = [
    wizard.buildingTypeLabel,
    wizard.areaSqFt > 0 ? `${wizard.areaSqFt.toLocaleString("en-IN")} sq.ft` : null,
    wizard.floors > 1 ? `G+${wizard.floors - 1} floors` : null,
    wizard.quality === "basic" ? "Basic finish" : wizard.quality === "good" ? "Good finish" : "Premium finish",
  ].filter(Boolean).join(" · ");

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* ── TOP HEADER BAR ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-900 text-white flex items-center justify-center text-base font-black shadow">
            {wizard.buildingTypeEmoji || "🏗️"}
          </div>
          <div>
            <div className="text-sm font-black text-slate-900 leading-tight">Parametric BOQ Estimate</div>
            <div className="text-[11px] text-slate-400 font-medium truncate max-w-sm">{meta}</div>
          </div>
          {wizard.isPowerUser && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              <Zap size={9} />±25% accuracy
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {editedCount > 0 && (
            <button onClick={resetRates}
              className="text-[11px] font-bold text-amber-700 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 cursor-pointer transition-all"
            >
              Reset {editedCount} edited rate{editedCount > 1 ? "s" : ""}
            </button>
          )}
          <button onClick={onExport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs cursor-pointer transition-all shadow-sm"
          >
            <Download size={13} /> Export CSV
          </button>
          <button onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer transition-all"
          >
            <RotateCcw size={12} /> New Estimate
          </button>
        </div>
      </div>

      {/* ── TWO-COLUMN LAYOUT ────────────────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-4 py-6 flex gap-6 items-start">

        {/* ════════════════════════════════════════════════════════════════════
            LEFT SIDEBAR — sticky summary
        ════════════════════════════════════════════════════════════════════ */}
        <aside className="w-80 flex-shrink-0 space-y-4 sticky top-[73px]">

          {/* Total cost card */}
          <div className="bg-emerald-950 rounded-2xl p-5 text-white relative overflow-hidden shadow-xl shadow-emerald-900/20">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-emerald-700/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-teal-700/15 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-2">
                Base Work Cost (DSR 2023)
              </div>
              <div className="text-3xl font-black font-mono leading-none mb-1">
                <AnimatedNumber target={baseCost} />
              </div>
              <div className="text-emerald-300 text-xs font-bold">
                ({inWords(baseCost)})
              </div>

              <div className="mt-4 pt-3 border-t border-emerald-800 grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <div className="text-emerald-400 font-bold">Rate / sq.ft</div>
                  <div className="text-white font-black font-mono text-base">₹{ratePerSqFt.toLocaleString("en-IN")}</div>
                </div>
                <div>
                  <div className="text-emerald-400 font-bold">Line Items</div>
                  <div className="text-white font-black font-mono text-base">{items.length}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tender Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <button onClick={() => setShowTender((v) => !v)}
              className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between cursor-pointer transition-colors"
            >
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText size={13} className="text-emerald-700" />
                Tender Cost (incl. GST)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black font-mono text-emerald-900">{inWords(grandTotal)}</span>
                {showTender ? <ChevronUp size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />}
              </div>
            </button>

            {showTender && (
              <div className="p-4 space-y-3">
                {/* GST toggle */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-bold flex items-center gap-1"><Info size={11} /> GST Rate</span>
                  <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
                    {([12, 18] as const).map((r) => (
                      <button key={r} onClick={() => setGstRate(r)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-black cursor-pointer transition-all ${
                          gstRate === r ? "bg-emerald-800 text-white shadow-sm" : "text-slate-600 hover:bg-slate-200"
                        }`}
                      >{r}%</button>
                    ))}
                  </div>
                </div>

                {/* Lines */}
                <div className="space-y-1 text-[11px]">
                  <SidebarRow label="Base Work Cost" amount={baseCost} />
                  <ToggleRow label="Overhead & Profit (10%)" amount={overhead}
                    active={includeOverhead} onToggle={() => setIncludeOverhead((v) => !v)} />
                  <ToggleRow label="Contingency (5%)" amount={conting}
                    active={includeConting} onToggle={() => setIncludeConting((v) => !v)} />
                  <div className="flex items-center justify-between py-1.5 border-y border-slate-200 font-black text-slate-800">
                    <span>Sub-Total (before GST)</span>
                    <span className="font-mono">{fmt(subTotal)}</span>
                  </div>
                  <SidebarRow label={`GST @${gstRate}% (Materials)`} amount={gstMat} muted />
                  <SidebarRow label={`GST @${gstRate}% (Labour)`}    amount={gstLab} muted />
                </div>

                {/* Grand Total box */}
                <div className="p-3 bg-emerald-950 rounded-xl text-white flex items-center justify-between">
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-wider text-emerald-400">Grand Total (All-In)</div>
                    <div className="text-lg font-black font-mono">{fmt(grandTotal)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] text-emerald-400 font-bold">Incl. GST/sqft</div>
                    <div className="text-sm font-black font-mono">₹{rateIncl.toLocaleString("en-IN")}</div>
                  </div>
                </div>
                <p className="text-[9px] text-slate-400 leading-relaxed">
                  Works contract GST: 60% material + 40% labour. Rates as per CGST Schedule III. Toggle overhead/contingency per contract terms.
                </p>
              </div>
            )}
          </div>

          {/* Quick summary chips */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-2">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Estimate Parameters</div>
            {[
              ["Building", wizard.buildingTypeLabel],
              ["Area", `${wizard.areaSqFt.toLocaleString("en-IN")} sq.ft`],
              ["Floors", wizard.floors > 1 ? `G + ${wizard.floors - 1}` : "Ground floor"],
              ["Finish", wizard.quality === "basic" ? "Basic" : wizard.quality === "good" ? "Good" : "Premium"],
              ["Standard", "CPWD DSR 2023"],
              ["Measurement", "IS 1200"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">{k}</span>
                <span className="font-bold text-slate-800">{v}</span>
              </div>
            ))}
            {editedCount > 0 && (
              <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-amber-600 font-bold">Rates Customized</span>
                <span className="font-black text-amber-700">{editedCount} items</span>
              </div>
            )}
          </div>
        </aside>

        {/* ════════════════════════════════════════════════════════════════════
            RIGHT MAIN CONTENT
        ════════════════════════════════════════════════════════════════════ */}
        <main className="flex-1 min-w-0 space-y-5">

          {/* ── TRADE BREAKDOWN ─────────────────────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center text-base">📊</span>
              Cost Distribution by Trade
            </h2>
            <div className="space-y-3.5">
              {trades.map((t) => (
                <TradeBarRow key={t.label} {...t} total={baseCost} />
              ))}
            </div>
          </section>

          {/* ── MARKET RATE BENCHMARK ───────────────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <TrendingUp size={14} className="text-emerald-700" />
                Market Rate Benchmark
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-medium">Compare for:</span>
                <select value={city} onChange={(e) => setCity(e.target.value)}
                  className="text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 cursor-pointer focus:ring-1 focus:ring-emerald-400 focus:outline-none"
                >
                  {CITY_OPTS.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
                </select>
              </div>
            </div>

            {/* Your rate badge + segment pill */}
            <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${segBg}`}>
              <div>
                <div className={`text-[10px] font-bold uppercase tracking-wider ${segColor}`}>Your Estimate Rate (All-In)</div>
                <div className={`text-2xl font-black font-mono ${segColor}`}>₹{benchmarkRate.toLocaleString("en-IN")} / sq.ft</div>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-xs font-black border ${segBg} ${segColor}`}>{segment}</div>
            </div>

            {/* Gradient bar */}
            <div className="space-y-1.5">
              <div className="relative h-4 rounded-full overflow-visible">
                <div className="absolute inset-0 flex rounded-full overflow-hidden">
                  <div className="w-1/3 bg-gradient-to-r from-amber-200 to-amber-300" />
                  <div className="w-1/3 bg-gradient-to-r from-emerald-300 to-emerald-400" />
                  <div className="w-1/3 bg-gradient-to-r from-violet-300 to-violet-400" />
                </div>
                {/* Needle */}
                <div className="absolute top-0 bottom-0 flex flex-col items-center -translate-x-1/2"
                  style={{ left: `${barPos}%` }}>
                  <div className="w-1 h-full bg-slate-900 rounded-full shadow-md" />
                  <div className="mt-1 text-[9px] font-black text-slate-900 whitespace-nowrap bg-white px-1 rounded shadow-sm">YOU</div>
                </div>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-500 px-0.5">
                <span className="text-amber-700">🌿 Economy<br/>₹{eLow.toLocaleString()}–{eHigh.toLocaleString()}</span>
                <span className="text-emerald-700 text-center">✅ Standard<br/>₹{sLow.toLocaleString()}–{sHigh.toLocaleString()}</span>
                <span className="text-violet-700 text-right">💎 Luxury<br/>₹{lLow.toLocaleString()}–{lHigh.toLocaleString()}</span>
              </div>
            </div>

            <div className={`text-xs font-medium px-3 py-2 rounded-lg border ${segBg} ${segColor}`}>{verdict}</div>
            <p className="text-[10px] text-slate-400">
              Source: NBO / CREDAI Annual Construction Cost Survey 2023–24 · CPWD PAR 2024 · JLL India Construction Cost Report.
              Rates excl. GST, in ₹/sq.ft, adjusted for {CITY_OPTS.find((c) => c.v === city)?.l} market.
            </p>
          </section>

          {/* ── ENGINEER'S BOQ TABLE ─────────────────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center text-sm">📋</span>
                Bill of Quantities — {items.length} Line Items
              </h2>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                {editedCount > 0 && (
                  <span className="font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                    {editedCount} rate{editedCount > 1 ? "s" : ""} customized
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Pencil size={10} /> Click rate or qty to edit
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <th className="py-3 px-4 w-8">#</th>
                    <th className="py-3 px-4">DSR Code</th>
                    <th className="py-3 px-4 min-w-[220px]">Description</th>
                    <th className="py-3 px-4 text-right w-24">Qty</th>
                    <th className="py-3 px-4 w-16">Unit</th>
                    <th className="py-3 px-4 text-right w-32">Rate (₹) <span className="font-normal normal-case text-slate-400">(editable)</span></th>
                    <th className="py-3 px-4 text-right w-32">Amount (₹)</th>
                    <th className="py-3 px-2 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => {
                    const isEditing = editingIdx === idx;
                    const rowAmt = item.quantity * item.rate;
                    return (
                      <tr key={`${item.item_code}-${idx}`}
                        className={`transition-colors ${
                          isEditing ? "bg-emerald-50" :
                          item.edited ? "bg-amber-50/50" :
                          "hover:bg-slate-50/80"
                        }`}
                      >
                        <td className="py-2.5 px-4 text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                        <td className="py-2.5 px-4">
                          <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.item_code}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-700 max-w-xs">
                          <div className="font-medium leading-snug text-[11px]">{item.description}</div>
                        </td>

                        {/* Qty — editable */}
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                          {isEditing ? (
                            <input type="number" value={editQty} min={0} step={0.01}
                              onChange={(e) => setEditQty(e.target.value)}
                              className="w-20 text-right border-b-2 border-emerald-500 bg-white focus:outline-none font-mono font-bold text-slate-900 text-xs"
                              autoFocus
                            />
                          ) : (
                            <span className="cursor-pointer hover:text-emerald-700" onClick={() => startEdit(idx)}>
                              {item.quantity.toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 font-mono text-[10px]">{item.unit}</td>

                        {/* Rate — editable */}
                        <td className="py-2.5 px-4 text-right font-mono">
                          {isEditing ? (
                            <input type="number" value={editRate} min={0}
                              onChange={(e) => setEditRate(e.target.value)}
                              className="w-24 text-right border-b-2 border-emerald-500 bg-white focus:outline-none font-mono font-bold text-slate-900 text-xs"
                            />
                          ) : (
                            <span
                              onClick={() => startEdit(idx)}
                              className={`cursor-pointer hover:underline hover:text-emerald-700 flex items-center justify-end gap-1 ${item.edited ? "text-amber-700 font-bold" : "text-slate-600"}`}
                            >
                              {item.edited && <span className="text-[8px] font-black text-amber-600 bg-amber-100 px-1 rounded">EDITED</span>}
                              ₹{item.rate.toLocaleString("en-IN")}
                              <Pencil size={9} className="text-slate-300 group-hover:text-emerald-500" />
                            </span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-2.5 px-4 text-right font-mono font-black text-slate-900 text-[11px]">
                          ₹{rowAmt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </td>

                        {/* Edit controls */}
                        <td className="py-2.5 px-2">
                          {isEditing ? (
                            <div className="flex gap-1">
                              <button onClick={() => commitEdit(idx)}
                                className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center cursor-pointer hover:bg-emerald-700 transition-colors"
                              ><Check size={11} /></button>
                              <button onClick={cancelEdit}
                                className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer hover:bg-slate-300 transition-colors"
                              ><X size={11} /></button>
                            </div>
                          ) : (
                            <button onClick={() => startEdit(idx)}
                              className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer transition-all"
                            ><Pencil size={10} /></button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td colSpan={6} className="py-3 px-4 font-black text-slate-800 text-xs">
                      Grand Total (Base Work Cost)
                      {editedCount > 0 && <span className="ml-2 text-amber-600 text-[10px]">({editedCount} rates customized)</span>}
                    </td>
                    <td className="py-3 px-4 text-right font-black font-mono text-emerald-800 text-base">
                      {fmt(baseCost)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 flex-wrap gap-2">
              <span>Rates: CPWD DSR 2023 · Quantities: IS 1200 · This is a parametric estimate — actual may vary ±15%{wizard.isPowerUser ? " (±25% commercial)" : ""}.</span>
              <button onClick={onExport}
                className="flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer transition-colors"
              >
                <Download size={11} /> Download full CSV
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TradeBarRow({ label, amount, pct, color, total }: {
  label: string; amount: number; pct: number; color: string; total: number;
}) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div className="flex items-center gap-4">
      <div className="w-36 text-[11px] font-bold text-slate-700 text-right flex-shrink-0">{label}</div>
      <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="w-32 flex-shrink-0 text-right">
        <span className="text-[11px] font-black font-mono text-slate-900">{fmt(amount)}</span>
        <span className="text-[10px] text-slate-400 ml-1.5">{pct}%</span>
      </div>
    </div>
  );
}

function SidebarRow({ label, amount, muted }: { label: string; amount: number; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-0.5 ${muted ? "text-slate-400" : "text-slate-700"}`}>
      <span className="font-medium text-[10px]">{label}</span>
      <span className="font-mono font-bold text-[10px]">{fmt(amount)}</span>
    </div>
  );
}

function ToggleRow({ label, amount, active, onToggle }: {
  label: string; amount: number; active: boolean; onToggle: () => void;
}) {
  return (
    <div className={`flex items-center justify-between py-0.5 transition-opacity ${active ? "" : "opacity-40"}`}>
      <div className="flex items-center gap-1.5">
        <button onClick={onToggle}
          className={`w-7 h-4 rounded-full transition-colors cursor-pointer flex-shrink-0 ${active ? "bg-emerald-600" : "bg-slate-300"}`}
        >
          <span className={`block w-3 h-3 bg-white rounded-full shadow transition-transform mx-0.5 ${active ? "translate-x-3" : "translate-x-0"}`} />
        </button>
        <span className="text-[10px] font-medium text-slate-700">{label}</span>
      </div>
      <span className="font-mono font-bold text-[10px] text-slate-700">{fmt(amount)}</span>
    </div>
  );
}
