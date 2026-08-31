"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useTurnkeyStore } from "@/store/turnkey-store";
import { groupMergedByStage, groupMergedByRoom } from "@/domains/boq/turnkey-merger";
import { calculateMaterialBreakdown, MaterialIndentItem, FullMaterialBreakdown } from "@/domains/boq/material-breakdown";
import { STAGE_LABELS, BOQLineItem } from "@/domains/boq/types";
import { 
  Download, 
  RotateCcw, 
  Printer, 
  Layers, 
  Building2, 
  Home, 
  CheckCircle2, 
  FileSpreadsheet, 
  ChevronDown, 
  ChevronUp, 
  ArrowLeft,
  Sparkles,
  ShoppingCart,
  Pencil,
  Check,
  X,
  MapPin,
  Package,
  Boxes,
  Paintbrush,
  Ruler,
  AlertTriangle,
  Info,
  DollarSign
} from "lucide-react";

// ─── Format Helpers ───────────────────────────────────────────────────────────

function fmt(val: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
}

function inWords(val: number) {
  if (val >= 10_000_000) return `${(val / 10_000_000).toFixed(2)} Crore`;
  if (val >= 100_000)    return `${(val / 100_000).toFixed(2)} Lakh`;
  return fmt(val);
}

// ─── City Benchmark Multipliers ───────────────────────────────────────────────

const CITY_OPTIONS = [
  { v: "delhi",     l: "Delhi / NCR (CPWD Base)", mult: 1.00 },
  { v: "bengaluru", l: "Bengaluru (+12%)",        mult: 1.12 },
  { v: "mumbai",    l: "Mumbai (+18%)",           mult: 1.18 },
  { v: "hyderabad", l: "Hyderabad (+8%)",         mult: 1.08 },
  { v: "pune",      l: "Pune (+9%)",              mult: 1.09 },
  { v: "chennai",   l: "Chennai (+6%)",           mult: 1.06 },
  { v: "ahmedabad", l: "Ahmedabad (-7%)",         mult: 0.93 },
  { v: "rural",     l: "Tier-3 / Rural (-20%)",   mult: 0.80 },
];

export function Stage4TurnkeyResults() {
  const { 
    finalBOQ, 
    rooms, 
    footprintAreaM2, 
    shellConfig, 
    reset, 
    setStage 
  } = useTurnkeyStore();

  const [activeTab, setActiveTab] = useState<'materials' | 'stage' | 'space'>('materials');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [exporting, setExporting] = useState(false);
  const [selectedCity, setSelectedCity] = useState("delhi");
  const [cityMultiplier, setCityMultiplier] = useState(1.0);

  // ── Editable Line Items State ───────────────────────────────────────────────
  const [editableLineItems, setEditableLineItems] = useState<(BOQLineItem & { isEdited?: boolean })[]>(
    () => (finalBOQ?.allItems || []).map(item => ({ ...item }))
  );

  // Keep synced if finalBOQ changes
  useEffect(() => {
    if (finalBOQ?.allItems) {
      setEditableLineItems(finalBOQ.allItems.map(item => ({ ...item })));
    }
  }, [finalBOQ]);

  // Line item inline editing
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [editItemRate, setEditItemRate] = useState("");
  const [editItemQty, setEditItemQty] = useState("");

  // ── Material Breakdown State ───────────────────────────────────────────────
  const initialMaterialBreakdown = useMemo(() => {
    if (!finalBOQ) return null;
    return calculateMaterialBreakdown(editableLineItems, rooms, finalBOQ.buaM2);
  }, [finalBOQ, editableLineItems, rooms]);

  const [materialsData, setMaterialsData] = useState<FullMaterialBreakdown | null>(initialMaterialBreakdown);

  useEffect(() => {
    if (initialMaterialBreakdown) {
      setMaterialsData(initialMaterialBreakdown);
    }
  }, [initialMaterialBreakdown]);

  // Material item inline editing
  const [editingMatId, setEditingMatId] = useState<string | null>(null);
  const [editMatRate, setEditMatRate] = useState("");
  const [editMatQty, setEditMatQty] = useState("");

  // ── City Multiplier Handler ────────────────────────────────────────────────
  const handleCityChange = (cityKey: string) => {
    setSelectedCity(cityKey);
    const found = CITY_OPTIONS.find(c => c.v === cityKey);
    const newMult = found ? found.mult : 1.0;
    setCityMultiplier(newMult);

    // Scale line item rates with city factor
    setEditableLineItems(prev => prev.map(item => ({
      ...item,
      rate: Math.round(item.rate * (newMult / cityMultiplier)),
      amount: Math.round(item.quantity * item.rate * (newMult / cityMultiplier)),
      isEdited: true,
    })));

    // Scale material rates with city factor
    if (materialsData) {
      const updatedCategories = materialsData.categories.map(cat => ({
        ...cat,
        items: cat.items.map(m => {
          const adjRate = Math.round(m.defaultRate * newMult);
          return {
            ...m,
            currentRate: adjRate,
            amount: Math.round(m.procurementQty * adjRate),
            isEdited: true,
          };
        }),
        totalCost: cat.items.reduce((s, i) => s + Math.round(i.procurementQty * Math.round(i.defaultRate * newMult)), 0),
      }));

      setMaterialsData({
        ...materialsData,
        categories: updatedCategories,
        totalMaterialCost: updatedCategories.reduce((s, c) => s + c.totalCost, 0),
      });
    }
  };

  // ── Toggle Accordion Group ─────────────────────────────────────────────────
  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Calculations ───────────────────────────────────────────────────────────
  const buaSqFt = useMemo(() => {
    if (!finalBOQ) return 0;
    return Math.round(finalBOQ.buaM2 * 10.7639);
  }, [finalBOQ]);

  const liveGrandTotal = useMemo(() => {
    return editableLineItems.reduce((sum, item) => sum + item.amount, 0);
  }, [editableLineItems]);

  const liveShellTotal = useMemo(() => {
    return editableLineItems
      .filter(i => i.trace_source === 'shell')
      .reduce((sum, item) => sum + item.amount, 0);
  }, [editableLineItems]);

  const liveRoomTotal = useMemo(() => {
    return editableLineItems
      .filter(i => i.trace_source === 'room')
      .reduce((sum, item) => sum + item.amount, 0);
  }, [editableLineItems]);

  const costPerSqFt = buaSqFt > 0 ? Math.round(liveGrandTotal / buaSqFt) : 0;
  const shellPerSqFt = buaSqFt > 0 ? Math.round(liveShellTotal / buaSqFt) : 0;
  const roomPerSqFt  = buaSqFt > 0 ? Math.round(liveRoomTotal / buaSqFt) : 0;

  // ── Groupings for Tabs ─────────────────────────────────────────────────────
  const stageGroups = useMemo(() => {
    if (!finalBOQ) return {};
    return groupMergedByStage({
      ...finalBOQ,
      allItems: editableLineItems,
    });
  }, [finalBOQ, editableLineItems]);

  const spaceGroups = useMemo(() => {
    if (!finalBOQ) return {};
    return groupMergedByRoom({
      ...finalBOQ,
      allItems: editableLineItems,
    });
  }, [finalBOQ, editableLineItems]);

  // ── Inline Edit Helpers: Line Items ────────────────────────────────────────
  const startEditLineItem = (idx: number) => {
    setEditingItemIdx(idx);
    setEditItemRate(editableLineItems[idx].rate.toString());
    setEditItemQty(editableLineItems[idx].quantity.toString());
  };

  const saveEditLineItem = (idx: number) => {
    const newRate = parseFloat(editItemRate) || editableLineItems[idx].rate;
    const newQty  = parseFloat(editItemQty)  || editableLineItems[idx].quantity;

    setEditableLineItems(prev => {
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        rate: newRate,
        quantity: newQty,
        amount: Math.round(newRate * newQty),
        isEdited: true,
      };
      return copy;
    });
    setEditingItemIdx(null);
  };

  // ── Inline Edit Helpers: Material Indents ──────────────────────────────────
  const startEditMaterial = (m: MaterialIndentItem) => {
    setEditingMatId(m.id);
    setEditMatRate(m.currentRate.toString());
    setEditMatQty(m.procurementQty.toString());
  };

  const saveEditMaterial = (catId: string, mId: string) => {
    if (!materialsData) return;
    const newRate = parseFloat(editMatRate);
    const newQty  = parseFloat(editMatQty);

    const updatedCategories = materialsData.categories.map(cat => {
      if (cat.id !== catId) return cat;
      const updatedItems = cat.items.map(item => {
        if (item.id !== mId) return item;
        const rate = !isNaN(newRate) ? newRate : item.currentRate;
        const qty  = !isNaN(newQty)  ? newQty  : item.procurementQty;
        return {
          ...item,
          currentRate: rate,
          procurementQty: qty,
          amount: Math.round(rate * qty),
          isEdited: true,
        };
      });
      return {
        ...cat,
        items: updatedItems,
        totalCost: updatedItems.reduce((s, i) => s + i.amount, 0),
      };
    });

    setMaterialsData({
      ...materialsData,
      categories: updatedCategories,
      totalMaterialCost: updatedCategories.reduce((s, c) => s + c.totalCost, 0),
    });
    setEditingMatId(null);
  };

  // ── CSV Exports ────────────────────────────────────────────────────────────
  
  // 1. Export DSR Line Items CSV
  const handleExportDSRCSV = useCallback(() => {
    if (!finalBOQ) return;
    setExporting(true);
    try {
      const header = ["#", "DSR Code", "Description", "Source", "Room", "Qty", "Unit", "Rate (Rs)", "Amount (Rs)"];
      const rows = editableLineItems.map((r, i) => [
        i + 1,
        r.item_code,
        `"${r.description.replace(/"/g, '""')}"`,
        r.trace_source === 'room' ? 'Room Trace' : 'Structural Shell',
        r.room_name || 'General Structure',
        r.quantity.toFixed(2),
        r.unit,
        r.rate.toFixed(2),
        r.amount.toFixed(2),
      ]);
      const csv = [header, ...rows].map(e => e.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Turnkey_BOQ_${selectedCity}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [finalBOQ, editableLineItems, selectedCity]);

  // 2. Export Material Purchase Order Indent CSV
  const handleExportMaterialIndentCSV = useCallback(() => {
    if (!materialsData) return;
    setExporting(true);
    try {
      const header = ["Category", "Material Name", "Technical Specification", "Net Qty", "Wastage %", "Procurement Order Qty", "Unit", "Retail Packaging", "Unit Rate (Rs)", "Estimated Cost (Rs)"];
      const rows: any[] = [];

      materialsData.categories.forEach(cat => {
        cat.items.forEach(item => {
          rows.push([
            `"${cat.title}"`,
            `"${item.name}"`,
            `"${item.spec.replace(/"/g, '""')}"`,
            item.netQty,
            `${item.wastagePercent}%`,
            item.procurementQty,
            item.unit,
            `"${item.packageUnit} (${item.packageCount} pkgs)"`,
            item.currentRate,
            item.amount,
          ]);
        });
      });

      const csv = [header, ...rows].map(e => e.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Material_Purchase_Indent_${selectedCity}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [materialsData, selectedCity]);

  if (!finalBOQ) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <p className="text-sm text-surface-400">No BOQ calculation found.</p>
        <button
          onClick={() => setStage(2)}
          className="px-4 py-2 bg-accent text-background font-bold text-xs rounded-xl cursor-pointer"
        >
          Return to Step 2
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface-50/50 dark:bg-surface-900/30 overflow-y-auto">
      <div className="max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* ── 🌟 Top Executive Project Dashboard ──────────────────────────────── */}
        <div className="bg-surface-card border border-surface-200 dark:border-white/10 rounded-3xl p-6 shadow-sm space-y-6">
          
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wider mb-2">
                <CheckCircle2 size={13} /> Turnkey Project Schedule & Material Indent
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                Turnkey Estimation & Procurement Studio
              </h1>
              <p className="text-xs text-surface-400 mt-0.5">
                Exact Material Takeoff + IS 1200 Civil Structure + {rooms.length > 0 ? `${rooms.length} Traced Spaces` : 'Default Finishes'}
              </p>
            </div>

            {/* Top Toolbar Actions */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* City Multiplier Dropdown */}
              <div className="flex items-center gap-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl px-2.5 py-1 text-xs">
                <MapPin size={13} className="text-accent shrink-0" />
                <select 
                  value={selectedCity} 
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="bg-transparent font-bold text-foreground outline-none cursor-pointer text-xs"
                >
                  {CITY_OPTIONS.map(c => (
                    <option key={c.v} value={c.v} className="bg-surface-card dark:bg-surface-900 text-foreground">
                      {c.l}
                    </option>
                  ))}
                </select>
              </div>

              {/* Print Proposal */}
              <button
                onClick={() => window.print()}
                className="px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-white/10 text-xs font-bold text-foreground hover:bg-surface-100 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Printer size={13} />
                <span className="hidden sm:inline">Print</span>
              </button>

              {/* Export Material Indent CSV */}
              <button
                onClick={handleExportMaterialIndentCSV}
                disabled={exporting}
                className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-sky-600/20 cursor-pointer transition-all"
                title="Export physical material purchase order with packages"
              >
                <Package size={13} />
                <span>Material Indent</span>
              </button>

              {/* Export DSR Schedule CSV */}
              <button
                onClick={handleExportDSRCSV}
                disabled={exporting}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
                title="Export itemized CPWD DSR schedule"
              >
                <FileSpreadsheet size={13} />
                <span>BOQ CSV</span>
              </button>

              {/* Reset Session */}
              <button
                onClick={reset}
                className="p-2 rounded-xl text-surface-400 hover:text-rose-500 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all cursor-pointer"
                title="Start New Estimate"
              >
                <RotateCcw size={15} />
              </button>
            </div>
          </div>

          {/* 3 Executive Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            
            {/* 1. Structural Shell */}
            <div className="p-4 rounded-2xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200/80 dark:border-white/5 space-y-1">
              <span className="text-[11px] font-bold text-surface-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={13} className="text-sky-500" /> Civil Structure & Frame
              </span>
              <div className="text-xl font-mono font-black text-foreground">
                {fmt(liveShellTotal)}
              </div>
              <div className="text-[11px] text-surface-400 font-mono">
                ₹ {shellPerSqFt}/sq.ft ({inWords(liveShellTotal)})
              </div>
            </div>

            {/* 2. Room Finishes */}
            <div className="p-4 rounded-2xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200/80 dark:border-white/5 space-y-1">
              <span className="text-[11px] font-bold text-surface-400 uppercase tracking-wider flex items-center gap-1.5">
                <Home size={13} className="text-emerald-500" /> Interior Room Finishes
              </span>
              <div className="text-xl font-mono font-black text-emerald-600 dark:text-emerald-400">
                {fmt(liveRoomTotal)}
              </div>
              <div className="text-[11px] text-surface-400 font-mono">
                ₹ {roomPerSqFt}/sq.ft ({rooms.length} spaces traced)
              </div>
            </div>

            {/* 3. Grand Turnkey Total */}
            <div className="p-4 rounded-2xl bg-accent/10 border border-accent/30 space-y-1">
              <span className="text-[11px] font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} /> Grand Turnkey Total
              </span>
              <div className="text-2xl font-mono font-black text-accent">
                {fmt(liveGrandTotal)}
              </div>
              <div className="text-[11px] font-mono font-bold text-foreground">
                ₹ {costPerSqFt}/sq.ft • {buaSqFt} sq.ft BUA ({inWords(liveGrandTotal)})
              </div>
            </div>

          </div>

          {/* 🛒 Quick Material Summary Badges */}
          {materialsData && (
            <div className="pt-2 border-t border-surface-100 dark:border-white/5 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200/60 dark:border-white/5">
                <span className="text-[10px] text-surface-400 font-bold uppercase block">Cement Required</span>
                <span className="text-sm font-mono font-black text-foreground">{materialsData.cementBagsTotal} Bags</span>
                <span className="text-[9px] text-surface-400 block font-mono">(50kg OPC/PPC)</span>
              </div>

              <div className="p-2.5 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200/60 dark:border-white/5">
                <span className="text-[10px] text-surface-400 font-bold uppercase block">Fe500D Steel</span>
                <span className="text-sm font-mono font-black text-foreground">{materialsData.steelTonnesTotal} Tonnes</span>
                <span className="text-[9px] text-surface-400 block font-mono">({Math.round(materialsData.steelTonnesTotal * 1000)} kg TMT)</span>
              </div>

              <div className="p-2.5 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200/60 dark:border-white/5">
                <span className="text-[10px] text-surface-400 font-bold uppercase block">Red Clay Bricks</span>
                <span className="text-sm font-mono font-black text-foreground">{materialsData.bricksCountTotal.toLocaleString()} Nos</span>
                <span className="text-[9px] text-surface-400 block font-mono">(Class 7.5 Burnt)</span>
              </div>

              <div className="p-2.5 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200/60 dark:border-white/5">
                <span className="text-[10px] text-surface-400 font-bold uppercase block">Total Tile Boxes</span>
                <span className="text-sm font-mono font-black text-foreground">{materialsData.tileBoxesTotal} Boxes</span>
                <span className="text-[9px] text-surface-400 block font-mono">(Floor + Dado Tiles)</span>
              </div>

              <div className="p-2.5 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200/60 dark:border-white/5 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-surface-400 font-bold uppercase block">Paint & Primer</span>
                <span className="text-sm font-mono font-black text-foreground">{materialsData.paintLitresTotal} Litres</span>
                <span className="text-[9px] text-surface-400 block font-mono">(Int + Ext Emulsion)</span>
              </div>
            </div>
          )}

        </div>

        {/* ── 3-Tab View Switcher ────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          <div className="inline-flex p-1 rounded-2xl bg-surface-card border border-surface-200 dark:border-white/10 shadow-xs">
            
            {/* Tab 1: Material Procurement */}
            <button
              onClick={() => setActiveTab('materials')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'materials'
                  ? 'bg-accent text-background shadow-xs'
                  : 'text-surface-400 hover:text-foreground'
              }`}
            >
              <ShoppingCart size={14} />
              <span>Material Procurement Indent (BOM)</span>
            </button>

            {/* Tab 2: CPWD DSR Stage */}
            <button
              onClick={() => setActiveTab('stage')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'stage'
                  ? 'bg-accent text-background shadow-xs'
                  : 'text-surface-400 hover:text-foreground'
              }`}
            >
              <Layers size={14} />
              <span>By Construction Trade (DSR)</span>
            </button>

            {/* Tab 3: By Room Space */}
            <button
              onClick={() => setActiveTab('space')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'space'
                  ? 'bg-accent text-background shadow-xs'
                  : 'text-surface-400 hover:text-foreground'
              }`}
            >
              <Home size={14} />
              <span>By Room / Client Space</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono font-bold text-surface-400">
            <span>Click any rate <Pencil size={11} className="inline ml-0.5 text-accent" /> to edit live</span>
          </div>

        </div>

        {/* ── 🛒 TAB 1: Material Takeoff & Procurement Indent (BOM) ──────────── */}
        {activeTab === 'materials' && materialsData && (
          <div className="space-y-5">
            {materialsData.categories.map((category) => (
              <div 
                key={category.id}
                className="bg-surface-card border border-surface-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs"
              >
                {/* Category Header */}
                <div 
                  onClick={() => toggleGroup(category.id)}
                  className="p-4 bg-surface-50/80 dark:bg-surface-800/60 flex items-center justify-between cursor-pointer hover:bg-surface-100/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <button className="text-surface-400">
                      {collapsedGroups[category.id] ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                    <span className="text-xl">{category.icon}</span>
                    <div>
                      <h3 className="text-xs font-black text-foreground uppercase tracking-wider">
                        {category.title}
                      </h3>
                      <p className="text-[10px] text-surface-400">
                        {category.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-black text-sm text-foreground block">
                      {fmt(category.totalCost)}
                    </span>
                    <span className="text-[10px] text-surface-400 font-mono">
                      {category.items.length} materials
                    </span>
                  </div>
                </div>

                {/* Material Rows Table */}
                {!collapsedGroups[category.id] && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-surface-200/80 dark:border-white/5 text-[10px] uppercase tracking-wider text-surface-400 font-extrabold bg-surface-50/40 dark:bg-surface-900/30">
                          <th className="py-2.5 px-4 w-12">#</th>
                          <th className="py-2.5 px-3">Material & Specification</th>
                          <th className="py-2.5 px-3 text-right">Net Qty</th>
                          <th className="py-2.5 px-3 text-center">Waste %</th>
                          <th className="py-2.5 px-3 text-left font-extrabold text-foreground">Packaging & Procurement Units</th>
                          <th className="py-2.5 px-3 text-right">Unit Rate (₹)</th>
                          <th className="py-2.5 px-4 text-right">Total (₹)</th>
                          <th className="py-2.5 px-2 w-12 text-center">Edit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100 dark:divide-white/5">
                        {category.items.map((mat, idx) => {
                          const isEditing = editingMatId === mat.id;
                          return (
                            <tr key={mat.id} className="hover:bg-surface-50/60 dark:hover:bg-surface-800/30 transition-colors">
                              <td className="py-3 px-4 font-mono text-surface-400">{idx + 1}</td>
                              
                              {/* Material Name & Spec */}
                              <td className="py-3 px-3 text-foreground font-semibold">
                                <div className="flex items-center gap-1.5">
                                  <span>{mat.name}</span>
                                  {mat.isEdited && (
                                    <span className="px-1.5 py-0.2 text-[8px] font-black rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 uppercase">
                                      Edited
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-surface-400 font-normal block leading-tight">
                                  {mat.spec}
                                </span>
                              </td>

                              {/* Net Theoretical Qty */}
                              <td className="py-3 px-3 text-right font-mono text-surface-500">
                                {mat.netQty.toLocaleString()} {mat.unit}
                              </td>

                              {/* Wastage */}
                              <td className="py-3 px-3 text-center font-mono text-xs text-surface-400">
                                +{mat.wastagePercent}%
                              </td>

                              {/* Procurement Qty (Editable) */}
                              <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                                {isEditing ? (
                                  <input 
                                    type="number"
                                    value={editMatQty}
                                    onChange={(e) => setEditMatQty(e.target.value)}
                                    className="w-20 px-2 py-1 bg-surface-100 dark:bg-surface-800 border border-accent rounded text-right text-xs font-mono font-bold text-foreground outline-none"
                                  />
                                ) : (
                                  `${mat.procurementQty.toLocaleString()} ${mat.unit}`
                                )}
                              </td>

                              {/* Retail Package & Packaging Details */}
                              <td className="py-3 px-3 text-left">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/70 border border-sky-300 dark:border-sky-700/80 text-foreground shadow-2xs font-bold">
                                  <Package size={13} className="text-sky-600 dark:text-sky-400 shrink-0" />
                                  <span className="text-xs font-mono font-black text-foreground">
                                    {mat.packageCount.toLocaleString()} {mat.packageCount === 1 ? 'Pack' : 'Packs'}
                                  </span>
                                  <span className="text-[11px] text-surface-600 dark:text-surface-300 font-semibold">
                                    ({mat.packageUnit})
                                  </span>
                                </div>
                              </td>

                              {/* Unit Rate (Editable) */}
                              <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                                {isEditing ? (
                                  <input 
                                    type="number"
                                    value={editMatRate}
                                    onChange={(e) => setEditMatRate(e.target.value)}
                                    className="w-20 px-2 py-1 bg-surface-100 dark:bg-surface-800 border border-accent rounded text-right text-xs font-mono font-bold text-foreground outline-none"
                                  />
                                ) : (
                                  `₹ ${mat.currentRate.toLocaleString('en-IN')}`
                                )}
                              </td>

                              {/* Total Amount */}
                              <td className="py-3 px-4 text-right font-mono font-black text-foreground">
                                ₹ {Math.round(mat.amount).toLocaleString('en-IN')}
                              </td>

                              {/* Inline Edit Buttons */}
                              <td className="py-3 px-2 text-center">
                                {isEditing ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <button 
                                      onClick={() => saveEditMaterial(category.id, mat.id)}
                                      className="p-1 rounded bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer"
                                      title="Save rate"
                                    >
                                      <Check size={12} />
                                    </button>
                                    <button 
                                      onClick={() => setEditingMatId(null)}
                                      className="p-1 rounded bg-surface-200 dark:bg-surface-700 text-surface-600 hover:bg-surface-300 cursor-pointer"
                                      title="Cancel"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => startEditMaterial(mat)}
                                    className="p-1 text-surface-400 hover:text-accent cursor-pointer transition-colors"
                                    title="Edit rate & order quantity"
                                  >
                                    <Pencil size={12} />
                                  </button>
                                )}
                              </td>

                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── 📑 TAB 2: By Construction Trade (CPWD DSR Schedule) ─────────────── */}
        {activeTab === 'stage' && (
          <div className="space-y-4">
            {Object.entries(stageGroups).map(([stageKey, items]) => {
              const stageTotal = items.reduce((s, i) => s + i.amount, 0);
              const isCollapsed = collapsedGroups[stageKey];
              const stageLabel = STAGE_LABELS[stageKey] || stageKey.toUpperCase();

              return (
                <div 
                  key={stageKey}
                  className="bg-surface-card border border-surface-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs"
                >
                  {/* Group Header */}
                  <div 
                    onClick={() => toggleGroup(stageKey)}
                    className="p-4 bg-surface-50/80 dark:bg-surface-800/60 flex items-center justify-between cursor-pointer hover:bg-surface-100/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <button className="text-surface-400">
                        {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                      </button>
                      <div>
                        <h3 className="text-xs font-black text-foreground uppercase tracking-wider">
                          {stageLabel}
                        </h3>
                        <span className="text-[10px] text-surface-400 font-mono">
                          {items.length} items
                        </span>
                      </div>
                    </div>

                    <div className="text-right font-mono font-black text-sm text-foreground">
                      {fmt(stageTotal)}
                    </div>
                  </div>

                  {/* Table Rows */}
                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-surface-200/80 dark:border-white/5 text-[10px] uppercase tracking-wider text-surface-400 font-extrabold bg-surface-50/40 dark:bg-surface-900/30">
                            <th className="py-2.5 px-4 w-12">#</th>
                            <th className="py-2.5 px-3 w-24">DSR Code</th>
                            <th className="py-2.5 px-3">Description</th>
                            <th className="py-2.5 px-3 w-28 text-right">Qty</th>
                            <th className="py-2.5 px-3 w-16 text-center">Unit</th>
                            <th className="py-2.5 px-3 w-28 text-right">Rate</th>
                            <th className="py-2.5 px-4 w-32 text-right">Amount</th>
                            <th className="py-2.5 px-2 w-12 text-center">Edit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-100 dark:divide-white/5">
                          {items.map((item, idx) => {
                            const globalIdx = editableLineItems.findIndex(i => i.item_code === item.item_code && i.description === item.description);
                            const isEditing = editingItemIdx === globalIdx;

                            return (
                              <tr key={`${stageKey}-${idx}`} className="hover:bg-surface-50/60 dark:hover:bg-surface-800/30 transition-colors">
                                <td className="py-2.5 px-4 font-mono text-surface-400">{idx + 1}</td>
                                <td className="py-2.5 px-3 font-mono font-bold text-accent">{item.item_code}</td>
                                <td className="py-2.5 px-3 text-foreground font-medium">
                                  <div className="flex items-center gap-1.5">
                                    <span>{item.description}</span>
                                    {item.isEdited && (
                                      <span className="px-1.5 py-0.2 text-[8px] font-black rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 uppercase">
                                        Edited
                                      </span>
                                    )}
                                  </div>
                                  {item.room_name && (
                                    <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                      📍 {item.room_name}
                                    </span>
                                  )}
                                </td>

                                {/* Quantity (Editable) */}
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                                  {isEditing ? (
                                    <input 
                                      type="number"
                                      value={editItemQty}
                                      onChange={(e) => setEditItemQty(e.target.value)}
                                      className="w-16 px-1.5 py-0.5 bg-surface-100 dark:bg-surface-800 border border-accent rounded text-right text-xs font-mono font-bold text-foreground outline-none"
                                    />
                                  ) : (
                                    item.quantity.toFixed(2)
                                  )}
                                </td>

                                <td className="py-2.5 px-3 text-center font-mono text-surface-400">{item.unit}</td>

                                {/* Rate (Editable) */}
                                <td className="py-2.5 px-3 text-right font-mono text-surface-500 font-bold">
                                  {isEditing ? (
                                    <input 
                                      type="number"
                                      value={editItemRate}
                                      onChange={(e) => setEditItemRate(e.target.value)}
                                      className="w-20 px-1.5 py-0.5 bg-surface-100 dark:bg-surface-800 border border-accent rounded text-right text-xs font-mono font-bold text-foreground outline-none"
                                    />
                                  ) : (
                                    `₹ ${item.rate.toFixed(2)}`
                                  )}
                                </td>

                                <td className="py-2.5 px-4 text-right font-mono font-black text-foreground">
                                  ₹ {Math.round(item.amount).toLocaleString('en-IN')}
                                </td>

                                {/* Edit Button */}
                                <td className="py-2.5 px-2 text-center">
                                  {isEditing ? (
                                    <div className="flex items-center justify-center gap-1">
                                      <button 
                                        onClick={() => saveEditLineItem(globalIdx)}
                                        className="p-1 rounded bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer"
                                      >
                                        <Check size={12} />
                                      </button>
                                      <button 
                                        onClick={() => setEditingItemIdx(null)}
                                        className="p-1 rounded bg-surface-200 dark:bg-surface-700 text-surface-600 hover:bg-surface-300 cursor-pointer"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => startEditLineItem(globalIdx)}
                                      className="p-1 text-surface-400 hover:text-accent cursor-pointer transition-colors"
                                      title="Edit rate & quantity"
                                    >
                                      <Pencil size={12} />
                                    </button>
                                  )}
                                </td>

                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── 🏠 TAB 3: By Space / Client View ───────────────────────────────── */}
        {activeTab === 'space' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(spaceGroups).map(([spaceKey, group]) => (
              <div 
                key={spaceKey}
                className="bg-surface-card border border-surface-200 dark:border-white/10 rounded-2xl p-5 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{group.icon}</span>
                      <div>
                        <h3 className="text-sm font-black text-foreground">{group.label}</h3>
                        <span className="text-[10px] text-surface-400 font-mono">{group.items.length} items</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-mono font-black text-foreground">{fmt(group.total)}</span>
                    </div>
                  </div>

                  {/* Items Summary List */}
                  <div className="space-y-1.5 pt-2 border-t border-surface-100 dark:border-white/5">
                    {group.items.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <span className="text-surface-400 truncate max-w-[240px]">• {item.description}</span>
                        <span className="font-mono font-bold text-foreground shrink-0 ml-2">
                          ₹ {Math.round(item.amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                    {group.items.length > 5 && (
                      <p className="text-[10px] text-accent font-bold pt-1">
                        + {group.items.length - 5} more line items
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-surface-100 dark:border-white/5 flex items-center justify-between text-[10px] text-surface-400 font-mono">
                  <span>Subtotal Contribution</span>
                  <span className="font-bold text-foreground">
                    {Math.round((group.total / (liveGrandTotal || 1)) * 100)}% of project
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
