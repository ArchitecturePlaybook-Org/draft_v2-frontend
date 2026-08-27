"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { boqApi } from "@/domains/boq/api";
import { DSRRateMasterDB, STATE_OPTIONS } from "@/domains/boq/types";
import { toast } from "sonner";
import { 
  Database, 
  Search, 
  Filter, 
  Save, 
  RefreshCw, 
  Plus, 
  Edit3, 
  ArrowLeft, 
  DollarSign, 
  BookOpen, 
  Sliders, 
  Percent,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown
} from "lucide-react";

export const CPWD_CHAPTERS = [
  { no: 0, name: "All Sub-Heads" },
  { no: 1, name: "1. Carriage" },
  { no: 2, name: "2. Earth Work" },
  { no: 3, name: "3. Mortars" },
  { no: 4, name: "4. Concrete (PCC)" },
  { no: 5, name: "5. Reinforced Concrete (RCC)" },
  { no: 6, name: "6. Brick & AAC" },
  { no: 7, name: "7. Stone Work" },
  { no: 8, name: "8. Cladding" },
  { no: 9, name: "9. Wood & UPVC" },
  { no: 10, name: "10. Steel & Railings" },
  { no: 11, name: "11. Flooring" },
  { no: 12, name: "12. Roofing" },
  { no: 13, name: "13. Finishing" },
  { no: 14, name: "14. Repairs" },
  { no: 15, name: "15. Demolition" },
  { no: 16, name: "16. Road Work" },
  { no: 17, name: "17. Sanitary" },
  { no: 18, name: "18. Water Supply" },
  { no: 19, name: "19. Drainage" },
  { no: 20, name: "20. Pile Work" },
  { no: 21, name: "21. Aluminium" },
  { no: 22, name: "22. Chemicals" },
];

export const STAGE_OPTIONS = [
  { value: "all", label: "All Construction Stages" },
  { value: "earthwork", label: "Earthwork" },
  { value: "substructure", label: "Substructure & Foundation" },
  { value: "superstructure", label: "Superstructure Masonry" },
  { value: "rcc", label: "RCC Concrete & Steel" },
  { value: "plaster", label: "Plastering" },
  { value: "flooring", label: "Flooring" },
  { value: "doors_windows", label: "Doors & Windows" },
  { value: "painting", label: "Painting" },
  { value: "mep", label: "MEP Services" },
  { value: "external", label: "External Works" },
];

export default function CPWDRateMasterPage() {
  const [rates, setRates] = useState<DSRRateMasterDB[]>([]);
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedChapter, setSelectedChapter] = useState<number>(0);
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Sorting state
  const [sortBy, setSortBy] = useState<"item_code" | "rate" | "effective" | "chapter_no">("chapter_no");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Edit Rate Modal State
  const [editingRate, setEditingRate] = useState<DSRRateMasterDB | null>(null);

  // Create Rate Modal State
  const [isCreatingRate, setIsCreatingRate] = useState(false);
  const [newRate, setNewRate] = useState<Partial<DSRRateMasterDB>>({
    item_code: "",
    state: "national",
    state_sor_name: "CPWD Delhi DSR 2023",
    chapter_no: 5,
    chapter_name: "Reinforced Cement Concrete",
    description: "",
    unit: "m3",
    rate: 0,
    labor_component: 0,
    material_component: 0,
    stage: "rcc",
    is_code_ref: "CPWD DSR 2023",
    state_multiplier: 1.0,
    is_active: true,
  });

  // State Multiplier Bulk Tool State
  const [bulkMultiplier, setBulkMultiplier] = useState<number>(1.08);
  const [isApplyingBulk, setIsApplyingBulk] = useState(false);

  const fetchRates = async () => {
    setIsLoading(true);
    try {
      const data = await boqApi.adminGetRates();
      setRates(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load CPWD DSR rates from database.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedState, selectedChapter, selectedStage, statusFilter, searchQuery, pageSize]);

  const handleSaveRate = async () => {
    if (!editingRate) return;
    setIsSaving(true);
    try {
      await boqApi.adminUpdateRate(editingRate.item_code, {
        state: editingRate.state,
        state_sor_name: editingRate.state_sor_name,
        rate: Number(editingRate.rate),
        labor_component: Number(editingRate.labor_component) || 0,
        material_component: Number(editingRate.material_component) || 0,
        state_multiplier: Number(editingRate.state_multiplier),
        description: editingRate.description,
        is_code_ref: editingRate.is_code_ref,
        is_active: editingRate.is_active,
        chapter_no: editingRate.chapter_no,
        chapter_name: editingRate.chapter_name,
      });
      toast.success(`Rate item for ${editingRate.item_code} updated.`);
      setEditingRate(null);
      await fetchRates();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save rate.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRate = async () => {
    if (!newRate.item_code || !newRate.description || !newRate.rate) {
      toast.error("Please fill in Item Code, Description, and Base Rate.");
      return;
    }
    setIsSaving(true);
    try {
      await boqApi.adminCreateRate({
        ...newRate,
        rate: Number(newRate.rate),
        labor_component: Number(newRate.labor_component) || 0,
        material_component: Number(newRate.material_component) || 0,
        state_multiplier: Number(newRate.state_multiplier) || 1.0,
      });
      toast.success(`Rate item "${newRate.item_code}" created successfully.`);
      setIsCreatingRate(false);
      setNewRate({
        item_code: "",
        state: "national",
        state_sor_name: "CPWD Delhi DSR 2023",
        chapter_no: 5,
        chapter_name: "Reinforced Cement Concrete",
        description: "",
        unit: "m3",
        rate: 0,
        labor_component: 0,
        material_component: 0,
        stage: "rcc",
        is_code_ref: "CPWD DSR 2023",
        state_multiplier: 1.0,
        is_active: true,
      });
      await fetchRates();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create rate item.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyStateMultiplier = async () => {
    if (!confirm(`Apply state multiplier ${bulkMultiplier} to all ${filteredAndSortedRates.length} filtered items?`)) {
      return;
    }
    setIsApplyingBulk(true);
    try {
      let count = 0;
      for (const item of filteredAndSortedRates) {
        await boqApi.adminUpdateRate(item.item_code, { state_multiplier: bulkMultiplier });
        count++;
      }
      toast.success(`Updated state multiplier on ${count} items.`);
      await fetchRates();
    } catch (err: any) {
      toast.error("Failed to apply bulk state multiplier.");
    } finally {
      setIsApplyingBulk(false);
    }
  };

  // Filter and Sort Pipeline
  const filteredAndSortedRates = useMemo(() => {
    let result = rates.filter((r) => {
      const matchesState = selectedState === "all" || (r.state || "national") === selectedState;
      const matchesChapter = selectedChapter === 0 || r.chapter_no === selectedChapter;
      const matchesStage = selectedStage === "all" || r.stage === selectedStage;
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" ? r.is_active : !r.is_active);
      const matchesSearch = !searchQuery || 
        r.item_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.is_code_ref || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.state_sor_name || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesState && matchesChapter && matchesStage && matchesStatus && matchesSearch;
    });

    result.sort((a, b) => {
      let valA: any;
      let valB: any;
      if (sortBy === "item_code") {
        valA = a.item_code;
        valB = b.item_code;
      } else if (sortBy === "rate") {
        valA = Number(a.rate);
        valB = Number(b.rate);
      } else if (sortBy === "effective") {
        valA = Number(a.rate) * Number(a.state_multiplier);
        valB = Number(b.rate) * Number(b.state_multiplier);
      } else {
        valA = a.chapter_no || 0;
        valB = b.chapter_no || 0;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [rates, selectedState, selectedChapter, selectedStage, statusFilter, searchQuery, sortBy, sortOrder]);

  // Paginated Slices
  const totalItems = filteredAndSortedRates.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRates = filteredAndSortedRates.slice(startIndex, startIndex + pageSize);

  const toggleSort = (field: "item_code" | "rate" | "effective" | "chapter_no") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 text-foreground p-6 space-y-6">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-200 dark:border-surface-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link 
              href="/dashboard/admin/boq-rules"
              className="text-xs font-bold text-surface-400 hover:text-accent flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to BOQ Rules & Typologies
            </Link>
            <span className="text-surface-400">/</span>
            <span className="text-xs font-bold text-accent uppercase tracking-wider">Super Admin Management</span>
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-accent" />
            <span>CPWD & State PWD Schedule of Rates (SOR)</span>
          </h1>
          <p className="text-xs text-surface-500 max-w-3xl mt-1 leading-relaxed">
            Real-time multi-state Schedule of Rates database featuring National CPWD DSR 2023, Karnataka (KPWD SOR 2023-24),
            and Tamil Nadu (TNPWD Schedule 2023-24).
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchRates}
            disabled={isLoading}
            className="h-8.5 px-3.5 rounded-lg border border-surface-300 dark:border-surface-700 bg-surface-100 dark:bg-surface-800 text-xs font-bold hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-accent" : ""}`} />
            <span>Reload Rates</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCreatingRate(true)}
            className="h-8.5 px-3.5 rounded-lg bg-accent text-background text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Rate Item</span>
          </button>
        </div>
      </div>

      {/* ── STATE & REGIONAL SOR TABS ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        <span className="text-[10px] font-black uppercase text-surface-400 shrink-0 flex items-center gap-1">
          <MapPin className="w-3 h-3 text-accent" />
          <span>State / SOR Jurisdiction:</span>
        </span>
        {STATE_OPTIONS.map((st) => {
          const count = st.value === "all" 
            ? rates.length 
            : rates.filter((r) => (r.state || "national") === st.value).length;
          return (
            <button
              key={st.value}
              type="button"
              onClick={() => setSelectedState(st.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedState === st.value
                  ? "bg-accent text-background font-black shadow-xs"
                  : "bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 text-surface-400 hover:text-foreground"
              }`}
            >
              <span>{st.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                selectedState === st.value ? "bg-background/20 text-background font-bold" : "bg-surface-200 dark:bg-surface-800 text-surface-400"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── FILTER & TOOLBAR CARD ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-surface-100/90 dark:bg-surface-900 p-3.5 rounded-2xl border border-surface-200/80 dark:border-surface-800">
        {/* Search */}
        <div>
          <label className="block text-[10px] font-black uppercase text-surface-400 mb-1">Search Items & Codes</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              placeholder="e.g. KA-5.1.2, TN-2.8.1, M25, excavation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-lg pl-8.5 pr-3 text-xs outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Stage Filter */}
        <div>
          <label className="block text-[10px] font-black uppercase text-surface-400 mb-1">Stage Filter</label>
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="w-full h-8 bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-lg px-2.5 text-xs outline-none focus:border-accent"
          >
            {STAGE_OPTIONS.map((st) => (
              <option key={st.value} value={st.value}>{st.label}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-[10px] font-black uppercase text-surface-400 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full h-8 bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-lg px-2.5 text-xs outline-none focus:border-accent"
          >
            <option value="all">All Statuses (Active & Inactive)</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        {/* State Multiplier Tool */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-[10px] font-black uppercase text-accent mb-1 flex items-center gap-1 truncate">
              <Percent className="w-3 h-3" />
              <span>Bulk Multiplier</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.5"
              max="2.0"
              value={bulkMultiplier}
              onChange={(e) => setBulkMultiplier(parseFloat(e.target.value) || 1.0)}
              className="w-full h-8 bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-lg px-2 font-mono text-xs font-bold text-accent outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleApplyStateMultiplier}
            disabled={isApplyingBulk || totalItems === 0}
            className="h-8 px-3 rounded-lg bg-surface-200 dark:bg-surface-800 hover:bg-accent hover:text-background text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs shrink-0"
            title="Apply multiplier to currently filtered items"
          >
            <Sliders className="w-3 h-3" />
            <span>Apply</span>
          </button>
        </div>
      </div>

      {/* ── CHAPTER / SUB-HEAD FILTER PILLS ─────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 custom-scrollbar">
        {CPWD_CHAPTERS.map((ch) => {
          const count = ch.no === 0 
            ? rates.filter((r) => selectedState === "all" || (r.state || "national") === selectedState).length 
            : rates.filter((r) => (selectedState === "all" || (r.state || "national") === selectedState) && r.chapter_no === ch.no).length;
          return (
            <button
              key={ch.no}
              type="button"
              onClick={() => setSelectedChapter(ch.no)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedChapter === ch.no
                  ? "bg-accent/20 border border-accent text-accent font-black shadow-2xs"
                  : "bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 text-surface-400 hover:text-foreground"
              }`}
            >
              <span>{ch.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                selectedChapter === ch.no ? "bg-accent text-background font-black" : "bg-surface-200 dark:bg-surface-800 text-surface-400"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── PAGINATION TOP SUMMARY ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-surface-400">
        <div>
          Showing <span className="font-bold text-foreground">{totalItems > 0 ? startIndex + 1 : 0}</span> to{" "}
          <span className="font-bold text-foreground">{Math.min(startIndex + pageSize, totalItems)}</span> of{" "}
          <span className="font-bold text-accent">{totalItems}</span> rate items
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px]">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-7 bg-surface-100 dark:bg-surface-900 border border-surface-300 dark:border-surface-700 rounded-lg px-2 text-xs text-foreground font-bold outline-none cursor-pointer"
          >
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* ── CPWD & STATE RATES TABLE ────────────────────────────────────────── */}
      <div className="bg-surface-100/80 dark:bg-surface-900 rounded-2xl border border-surface-200/80 dark:border-surface-800 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-surface-200 dark:border-surface-800 bg-surface-200/50 dark:bg-surface-850 text-surface-400 font-bold uppercase text-[10px] tracking-wider">
              <th className="py-2.5 px-3 cursor-pointer hover:text-accent" onClick={() => toggleSort("item_code")}>
                <div className="flex items-center gap-1">
                  <span>Item Code</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th className="py-2.5 px-3">State / Jurisdiction</th>
              <th className="py-2.5 px-3 cursor-pointer hover:text-accent" onClick={() => toggleSort("chapter_no")}>
                <div className="flex items-center gap-1">
                  <span>Sub-Head</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th className="py-2.5 px-3">Description</th>
              <th className="py-2.5 px-3">Unit</th>
              <th className="py-2.5 px-3 text-right cursor-pointer hover:text-accent" onClick={() => toggleSort("rate")}>
                <div className="flex items-center justify-end gap-1">
                  <span>Base Rate (₹)</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th className="py-2.5 px-3 text-right">Labor / Mat Breakdown</th>
              <th className="py-2.5 px-3 text-center">Multiplier</th>
              <th className="py-2.5 px-3 text-right cursor-pointer hover:text-accent" onClick={() => toggleSort("effective")}>
                <div className="flex items-center justify-end gap-1">
                  <span>Effective Rate (₹)</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th className="py-2.5 px-3">IS / PWD Ref</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-200 dark:divide-surface-800 font-medium">
            {paginatedRates.length > 0 ? (
              paginatedRates.map((rate) => {
                const effectiveRate = Number(rate.rate) * Number(rate.state_multiplier);
                return (
                  <tr key={rate.item_code} className="hover:bg-surface-200/30 dark:hover:bg-surface-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-black text-accent whitespace-nowrap">
                      {rate.item_code}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        rate.state === "karnataka" 
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : rate.state === "tamil_nadu"
                          ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}>
                        {rate.state || "National"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[10px] font-bold text-surface-400 whitespace-nowrap">
                      {rate.chapter_no ? `Sub-Head ${rate.chapter_no}` : rate.stage}
                    </td>
                    <td className="py-2.5 px-3 text-foreground max-w-[300px]">
                      <div className="line-clamp-2" title={rate.description}>
                        {rate.description}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-surface-400 font-mono">
                      {rate.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground whitespace-nowrap">
                      ₹{Number(rate.rate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[10px] text-surface-400 whitespace-nowrap">
                      {rate.labor_component && rate.material_component ? (
                        <div>
                          <span className="text-amber-400" title="Labor">👷 ₹{rate.labor_component}</span>
                          <span className="mx-1">/</span>
                          <span className="text-blue-400" title="Material">🧱 ₹{rate.material_component}</span>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold">
                      {rate.state_multiplier}×
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-400 whitespace-nowrap">
                      ₹{effectiveRate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-[10px] text-surface-400 font-mono whitespace-nowrap">
                      {rate.is_code_ref || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        rate.is_active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400"
                      }`}>
                        {rate.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => setEditingRate(rate)}
                        className="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-400 hover:text-accent transition-colors cursor-pointer"
                        title="Edit rate or multiplier"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={12} className="py-8 text-center text-surface-400">
                  No rate items match the selected state, chapter, and search filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── PAGINATION BOTTOM CONTROLS ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-surface-200 dark:border-surface-800">
        <div className="text-xs text-surface-400">
          Page <span className="font-bold text-foreground">{currentPage}</span> of{" "}
          <span className="font-bold text-foreground">{totalPages}</span> ({totalItems} items total)
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-surface-300 dark:border-surface-700 bg-surface-100 dark:bg-surface-900 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-200 dark:hover:bg-surface-800 cursor-pointer"
            title="First Page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-surface-300 dark:border-surface-700 bg-surface-100 dark:bg-surface-900 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-200 dark:hover:bg-surface-800 cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page Number Buttons */}
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5 && currentPage > 3) {
                pageNum = currentPage - 2 + i;
                if (pageNum > totalPages) pageNum = totalPages - (4 - i);
              }
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7.5 h-7.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currentPage === pageNum
                      ? "bg-accent text-background font-black shadow-xs"
                      : "bg-surface-100 dark:bg-surface-900 border border-surface-300 dark:border-surface-700 hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-400"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-surface-300 dark:border-surface-700 bg-surface-100 dark:bg-surface-900 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-200 dark:hover:bg-surface-800 cursor-pointer"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-surface-300 dark:border-surface-700 bg-surface-100 dark:bg-surface-900 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-200 dark:hover:bg-surface-800 cursor-pointer"
            title="Last Page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── EDIT RATE MODAL ─────────────────────────────────────────────────── */}
      {editingRate && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-surface-100 dark:bg-surface-900 border border-surface-300 dark:border-surface-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-surface-200 dark:border-surface-800 pb-3">
              <h3 className="text-base font-black text-foreground flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-accent" />
                <span>Edit Item: {editingRate.item_code}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingRate(null)}
                className="text-surface-400 hover:text-foreground font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-surface-400 font-bold mb-1">State / Jurisdiction</label>
                  <select
                    value={editingRate.state || "national"}
                    onChange={(e) => {
                      const st = e.target.value;
                      const stObj = STATE_OPTIONS.find(s => s.value === st);
                      setEditingRate({
                        ...editingRate,
                        state: st,
                        state_sor_name: stObj?.label || "",
                      });
                    }}
                    className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2.5 text-xs text-foreground outline-none focus:border-accent"
                  >
                    {STATE_OPTIONS.filter(s => s.value !== "all").map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-surface-400 font-bold mb-1">Sub-Head Chapter</label>
                  <select
                    value={editingRate.chapter_no || 1}
                    onChange={(e) => {
                      const chNo = Number(e.target.value);
                      const chObj = CPWD_CHAPTERS.find(c => c.no === chNo);
                      setEditingRate({
                        ...editingRate,
                        chapter_no: chNo,
                        chapter_name: chObj?.name.replace(/^\d+\.\s*/, "") || "",
                      });
                    }}
                    className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2.5 text-xs text-foreground outline-none focus:border-accent"
                  >
                    {CPWD_CHAPTERS.filter(c => c.no > 0).map(c => (
                      <option key={c.no} value={c.no}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-surface-400 font-bold mb-1">Description</label>
                <textarea
                  value={editingRate.description}
                  onChange={(e) => setEditingRate({ ...editingRate, description: e.target.value })}
                  rows={3}
                  className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2.5 text-xs text-foreground outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-surface-400 font-bold mb-1">Base Rate (₹ / {editingRate.unit})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRate.rate}
                    onChange={(e) => setEditingRate({ ...editingRate, rate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2 font-mono text-xs text-emerald-400 font-bold outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-surface-400 font-bold mb-1">State Multiplier</label>
                  <input
                    type="number"
                    step="0.001"
                    value={editingRate.state_multiplier}
                    onChange={(e) => setEditingRate({ ...editingRate, state_multiplier: parseFloat(e.target.value) || 1.0 })}
                    className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2 font-mono text-xs text-foreground outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-surface-400 font-bold mb-1">Labor Component (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRate.labor_component || 0}
                    onChange={(e) => setEditingRate({ ...editingRate, labor_component: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2 font-mono text-xs text-amber-400 outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-surface-400 font-bold mb-1">Material Component (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRate.material_component || 0}
                    onChange={(e) => setEditingRate({ ...editingRate, material_component: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2 font-mono text-xs text-blue-400 outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-surface-400 font-bold mb-1">IS / PWD Code Clause Ref</label>
                <input
                  type="text"
                  value={editingRate.is_code_ref || ""}
                  onChange={(e) => setEditingRate({ ...editingRate, is_code_ref: e.target.value })}
                  className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2 font-mono text-xs text-foreground outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-200 dark:border-surface-800">
              <button
                type="button"
                onClick={() => setEditingRate(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-surface-400 hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRate}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-accent text-background font-black text-xs uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? "Saving..." : "Save to DB"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE RATE MODAL ───────────────────────────────────────────────── */}
      {isCreatingRate && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-surface-100 dark:bg-surface-900 border border-surface-300 dark:border-surface-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-surface-200 dark:border-surface-800 pb-3">
              <h3 className="text-base font-black text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4 text-accent" />
                <span>Add New Schedule Rate Item</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreatingRate(false)}
                className="text-surface-400 hover:text-foreground font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-surface-400 font-bold mb-1">Item Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. KA-5.1.5 or TN-2.8.3"
                    value={newRate.item_code}
                    onChange={(e) => setNewRate({ ...newRate, item_code: e.target.value })}
                    className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2.5 font-mono text-xs text-foreground outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-surface-400 font-bold mb-1">State / Jurisdiction</label>
                  <select
                    value={newRate.state || "national"}
                    onChange={(e) => {
                      const st = e.target.value;
                      const stObj = STATE_OPTIONS.find(s => s.value === st);
                      setNewRate({
                        ...newRate,
                        state: st,
                        state_sor_name: stObj?.label || "",
                      });
                    }}
                    className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2.5 text-xs text-foreground outline-none focus:border-accent"
                  >
                    {STATE_OPTIONS.filter(s => s.value !== "all").map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-surface-400 font-bold mb-1">Description *</label>
                <textarea
                  placeholder="Technical description of the work..."
                  value={newRate.description}
                  onChange={(e) => setNewRate({ ...newRate, description: e.target.value })}
                  rows={3}
                  className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2.5 text-xs text-foreground outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-surface-400 font-bold mb-1">Base Rate in INR (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newRate.rate}
                    onChange={(e) => setNewRate({ ...newRate, rate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2 font-mono text-xs text-emerald-400 font-bold outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-surface-400 font-bold mb-1">Unit</label>
                  <select
                    value={newRate.unit}
                    onChange={(e) => setNewRate({ ...newRate, unit: e.target.value })}
                    className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2.5 font-mono text-xs text-foreground outline-none focus:border-accent"
                  >
                    <option value="m3">m³ (Cubic Metre)</option>
                    <option value="m2">m² (Square Metre)</option>
                    <option value="m">m (Running Metre)</option>
                    <option value="kg">kg (Kilogram)</option>
                    <option value="nos">nos (Numbers)</option>
                    <option value="mt">mt (Metric Tonne)</option>
                    <option value="ls">ls (Lump Sum)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-surface-400 font-bold mb-1">IS / PWD Code Clause Ref</label>
                <input
                  type="text"
                  placeholder="e.g. KPWD SR 2023 / IS 456"
                  value={newRate.is_code_ref || ""}
                  onChange={(e) => setNewRate({ ...newRate, is_code_ref: e.target.value })}
                  className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2 font-mono text-xs text-foreground outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-200 dark:border-surface-800">
              <button
                type="button"
                onClick={() => setIsCreatingRate(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-surface-400 hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateRate}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-accent text-background font-black text-xs uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? "Creating..." : "Save to DB"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
