"use client";

import React, { useState, useEffect, useMemo } from "react";

import dynamic from "next/dynamic";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { projectsApi } from "@/domains/projects/api";
import { fetchFromBff } from "@/shared/api/fetchFromBff";
import { fieldDiaryCache } from "@/domains/projects/fieldDiaryCache";
import { DiaryEntryDetail } from "@/components/projects/DiaryEntryDetail";
import { toast } from "sonner";

import { AlertTriangle, Camera, File, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { SkeletonGrid, SkeletonTable } from "@/components/ui/Skeleton";

import { inventoryApi } from "@/domains/inventory/api";

const getLocalDateString = (date: Date = new Date()) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

type SiteOpsSubTab = "diary" | "labor" | "materials" | "inventory" | "delays" | "gallery";

interface SiteOpsTabProps {
  projectUid: string;
  projectTasks: any[];
  fetchProject: () => void;
  renderIssues?: () => React.ReactNode;
}

const SUBTABS: { id: SiteOpsSubTab; label: string; emoji: string }[] = [
  { id: "diary",     label: "Daily Log",           emoji: "📖" },
  { id: "labor",     label: "Labor & Equipment",    emoji: "👷" },
  { id: "materials", label: "Material Deliveries",  emoji: "📦" },
  { id: "inventory", label: "Available Site Stock", emoji: "🏗️" },
  { id: "delays",    label: "Delays & Issues",      emoji: "🚧" },
  { id: "gallery",   label: "Site Gallery",         emoji: "📸" },
];

// ── Labor & Equipment Panel ───────────────────────────────────────────────────
const SiteOpsLaborPanel: React.FC<{ projectUid: string }> = ({ projectUid }) => {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await projectsApi.getDiaryEntries(projectUid);
        setEntries(data);
      } catch (err) {
        console.error("Failed to load diary entries:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectUid]);

  if (loading) return <SkeletonGrid count={3} columns="grid-cols-1 md:grid-cols-3" />;

  const entriesWithLabor = entries.filter((e) => e.labor_entries?.length > 0 || e.equipment_entries?.length > 0);

  if (entriesWithLabor.length === 0) {
    return (
      <div className="text-center py-16 bg-surface-50 rounded-2xl border-2 border-dashed border-surface-200">
        <span className="text-5xl block mb-4">👷</span>
        <p className="text-lg font-bold text-primary mb-1">No Labor Data Yet</p>
        <p className="text-sm text-surface-400">Labor & equipment logs appear here as site engineers file their daily diary.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entriesWithLabor.map((entry) => (
        <div key={entry.id} className="bg-surface-50 border border-surface-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-primary text-sm">📅 {entry.entry_date}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400">{entry.author_name || "Engineer"}</p>
          </div>
          {entry.labor_entries?.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-2">👷 Labour</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {entry.labor_entries.map((l: any) => (
                  <div key={l.id} className="bg-surface-100 rounded-xl p-3 border border-surface-200/50 flex flex-col justify-between hover:shadow-xs transition-shadow">
                    <div>
                      <p className="font-bold text-xs text-primary truncate" title={l.crew_name || "General Crew"}>
                        {l.crew_name || "General Crew"}
                      </p>
                      <p className="text-[9px] text-surface-400 font-bold uppercase tracking-wider mt-0.5">
                        {l.trade_type || "General"}
                      </p>
                      {l.zone && (
                        <p className="text-[9px] text-surface-500 mt-1 truncate" title={`Zone: ${l.zone}`}>
                          📍 {l.zone}
                        </p>
                      )}
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-surface-200/40 flex justify-between items-center text-[10px] font-bold">
                      <span className="text-orange-600 bg-orange-50 dark:bg-orange-950/20 px-1.5 py-0.5 rounded">
                        {l.headcount} workers
                      </span>
                      <span className="text-surface-500 bg-surface-200/40 px-1.5 py-0.5 rounded">
                        ⏱️ {l.total_hours} hrs
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {entry.equipment_entries?.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-2">🚛 Equipment</p>
              <div className="space-y-1">
                {entry.equipment_entries.map((eq: any) => (
                  <div key={eq.id} className="flex items-center justify-between px-3 py-2 bg-surface-100 rounded-xl">
                    <p className="text-xs font-bold text-primary">{eq.equipment_name || "Equipment"}</p>
                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-lg ${eq.is_operational ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                      {eq.is_operational ? "Operational" : "Down"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ── Material Deliveries Panel ─────────────────────────────────────────────────
const SiteOpsMaterialsPanel: React.FC<{ projectUid: string }> = ({ projectUid }) => {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await projectsApi.getDiaryEntries(projectUid);
        setEntries(data);
      } catch (err) {
        console.error("Failed to load diary entries:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectUid]);

  if (loading) return <SkeletonTable rows={4} cols={4} />;

  const deliveries = entries.flatMap((e) =>
    (e.material_entries || []).map((m: any) => ({ ...m, entry_date: e.entry_date }))
  );

  if (deliveries.length === 0) {
    return (
      <div className="text-center py-16 bg-surface-50 rounded-2xl border-2 border-dashed border-surface-200">
        <span className="text-5xl block mb-4">📦</span>
        <p className="text-lg font-bold text-primary mb-1">No Deliveries Logged</p>
        <p className="text-sm text-surface-400">Material delivery entries appear here as they are logged in the field diary.</p>
      </div>
    );
  }

  const STATUS_STYLE: Record<string, string> = {
    good:     "bg-emerald-100 text-emerald-700 border-emerald-200",
    damaged:  "bg-red-100 text-red-700 border-red-200",
    rejected: "bg-amber-100 text-amber-700 border-amber-200",
  };

  return (
    <div className="space-y-3">
      {deliveries.map((m, i) => (
        <div key={i} className="bg-surface-50 border border-surface-200 rounded-2xl p-4 flex items-center gap-4">
          <span className="text-2xl">📦</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-primary text-sm">{m.material_name || "Material"}</p>
            <p className="text-[10px] text-surface-400 font-bold uppercase tracking-widest mt-0.5">
              {m.quantity} {m.unit || "units"} · {m.supplier || "Supplier not specified"}
            </p>
            <p className="text-[10px] text-surface-400 mt-0.5">📅 {m.entry_date}</p>
          </div>
          <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-lg border ${STATUS_STYLE[m.delivery_status] || STATUS_STYLE.good}`}>
            {m.delivery_status || "Good"}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Available Site Stock / Materials Panel ──────────────────────────────────
const SiteOpsInventoryPanel: React.FC<{ projectUid: string }> = ({ projectUid }) => {
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "HEALTHY" | "LOW" | "OUT">("ALL");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await inventoryApi.getAllBalances();
        setBalances(data);
      } catch (err) {
        console.error("Failed to load inventory stock balances", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getBalVal = (b: any) => Number(b.current_balance ?? b.available_stock ?? 0);
  const getMinThresh = (b: any) => Number(b.reorder_level ?? b.min_stock ?? b.minimum_threshold ?? 10);
  const getUnit = (b: any) => b.unit || b.material_unit || "Units";

  const stats = useMemo(() => {
    const total = balances.length;
    let healthy = 0;
    let lowStock = 0;
    let outOfStock = 0;

    balances.forEach((b) => {
      const avail = getBalVal(b);
      const minT = getMinThresh(b);
      if (avail <= 0) outOfStock++;
      else if (minT > 0 && avail <= minT) lowStock++;
      else healthy++;
    });

    return { total, healthy, lowStock, outOfStock };
  }, [balances]);

  const filteredBalances = useMemo(() => {
    return balances.filter((b) => {
      const matName = String(b.material_name || "").toLowerCase();
      const siteName = String(b.site_name || "").toLowerCase();
      const matchSearch = matName.includes(search.toLowerCase()) || siteName.includes(search.toLowerCase());
      if (!matchSearch) return false;

      const avail = getBalVal(b);
      const minThresh = getMinThresh(b);

      if (filterType === "HEALTHY") return avail > minThresh;
      if (filterType === "LOW") return avail > 0 && avail <= minThresh;
      if (filterType === "OUT") return avail <= 0;

      return true;
    });
  }, [balances, search, filterType]);

  if (loading) return <SkeletonTable rows={4} cols={4} />;

  return (
    <div className="space-y-4 font-sans">
      {/* KPI Stats Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface-50 border border-surface-200 p-3.5 rounded-xl shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-surface-400 block">Total Catalog Items</span>
          <span className="text-xl font-black text-primary mt-1 block">{stats.total}</span>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 p-3.5 rounded-xl shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Healthy Stock</span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">{stats.healthy}</span>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-3.5 rounded-xl shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block">Low Stock Alert</span>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 block">{stats.lowStock}</span>
        </div>
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 p-3.5 rounded-xl shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 block">Out of Stock</span>
          <span className="text-xl font-black text-red-600 dark:text-red-400 mt-1 block">{stats.outOfStock}</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-50 p-3 rounded-xl border border-surface-200">
        <input
          type="text"
          placeholder="Search available materials or site yard..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 px-3 text-xs bg-surface-100 border border-surface-200 rounded-lg text-primary placeholder-surface-400 focus:outline-none focus:border-accent w-full sm:w-72"
        />

        <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] font-bold">
          {[
            { id: "ALL", label: "All Items" },
            { id: "HEALTHY", label: "In Stock" },
            { id: "LOW", label: "Low Alert" },
            { id: "OUT", label: "Out of Stock" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id as any)}
              className={`px-3 py-1 rounded-lg border transition-all whitespace-nowrap cursor-pointer ${
                filterType === f.id
                  ? "bg-accent text-background font-extrabold border-accent shadow-xs"
                  : "bg-surface-100 text-surface-500 border-surface-200 hover:bg-surface-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stock Balances Table */}
      <div className="bg-surface-50 border border-surface-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-100 text-surface-500 uppercase tracking-wider font-extrabold border-b border-surface-200 text-[10px]">
              <tr>
                <th className="py-3 px-4">Material Name</th>
                <th className="py-3 px-4">Site Yard / Location</th>
                <th className="py-3 px-4 text-center">Available Stock</th>
                <th className="py-3 px-4 text-center">Reserved</th>
                <th className="py-3 px-4 text-center">Health Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200/60 text-primary font-medium">
              {filteredBalances.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-surface-400">
                    <span className="text-3xl block mb-2">🏗️</span>
                    <p className="font-bold text-sm text-surface-600">No Site Stock Balances Found</p>
                    <p className="text-xs text-surface-400">Site inventory stock updates automatically as materials are verified via GRNs.</p>
                  </td>
                </tr>
              ) : (
                filteredBalances.map((b, idx) => {
                  const avail = getBalVal(b);
                  const reserved = Number(b.reserved_stock || 0);
                  const minThresh = getMinThresh(b);
                  const unitStr = getUnit(b);

                  const healthStatus = b.health_status || (avail <= 0 ? "CRITICAL_LOW" : avail <= minThresh ? "REORDER_WARNING" : "HEALTHY");
                  const isOut = healthStatus === "CRITICAL_LOW" || avail <= 0;
                  const isLow = healthStatus === "REORDER_WARNING" || (avail > 0 && avail <= minThresh);

                  const statusText = isOut ? "Out of Stock" : isLow ? "Reorder Soon" : "Healthy";

                  return (
                    <tr key={b.id || idx} className="hover:bg-surface-100/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-primary">
                        <div>{b.material_name || `Material Item #${idx + 1}`}</div>
                        <div className="text-[10px] text-surface-400 font-normal mt-0.5">Unit: {unitStr}</div>
                      </td>
                      <td className="py-3 px-4 text-surface-500 font-semibold">
                        📍 {b.site_name || "Main Site Yard"}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-black text-sm">
                        <span className={isOut ? "text-red-500" : isLow ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400"}>
                          {avail} {unitStr}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-surface-400 font-bold">
                        {reserved} {unitStr}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border inline-block ${
                          isOut
                            ? "bg-red-500/20 text-red-600 border-red-300"
                            : isLow
                            ? "bg-amber-500/20 text-amber-600 border-amber-300 animate-pulse"
                            : "bg-emerald-500/20 text-emerald-600 border-emerald-300"
                        }`}>
                          {statusText}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <a
                          href="/dashboard/inventory/procurement?tab=requisitions"
                          className="px-3 py-1 text-[10px] font-extrabold rounded-lg bg-surface-200 hover:bg-surface-300 text-primary transition-colors inline-block"
                        >
                          Raise MRN
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ── Delays & Issues Panel ─────────────────────────────────────────────────────
const SiteOpsDelaysPanel: React.FC<{ projectUid: string }> = ({ projectUid }) => {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await projectsApi.getDiaryEntries(projectUid);
        setEntries(data);
      } catch (err) {
        console.error("Failed to load diary entries:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectUid]);

  if (loading) return <SkeletonTable rows={3} cols={3} />;

  const delays = entries.flatMap((e) =>
    (e.delay_entries || []).map((d: any) => ({ ...d, entry_date: e.entry_date }))
  );

  if (delays.length === 0) {
    return (
      <div className="text-center py-16 bg-surface-50 rounded-2xl border-2 border-dashed border-surface-200">
        <span className="text-5xl block mb-4">🚧</span>
        <p className="text-lg font-bold text-primary mb-1">No Delays Logged</p>
        <p className="text-sm text-surface-400">Project is running smoothly! Delays and issues will appear here when logged.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {delays.map((d, i) => (
        <div key={i} className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-3">
            <p className="font-bold text-red-800 text-sm uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> {d.delay_type}
            </p>
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-red-700">
              <span>📅 {d.entry_date}</span>
              <span className="bg-white/50 dark:bg-black/20 px-3 py-1 rounded-lg border border-red-200 dark:border-red-800/30">
                {d.duration_hours} HRS
              </span>
            </div>
          </div>
          <div className="bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-red-100 dark:border-red-800/20">
            <p className="text-sm text-red-900 font-medium"><span className="font-bold uppercase text-[10px] tracking-widest block mb-1 opacity-70">Impact / Description</span>{d.impacted_path || "No details provided."}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

import { resolveAssetFileUrl } from "@/lib/resolveAssetFileUrl";

// ── Site Gallery Panel ────────────────────────────────────────────────────────
const SiteOpsGalleryPanel: React.FC<{ projectUid: string }> = ({ projectUid }) => {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await projectsApi.getDiaryEntries(projectUid);
        setEntries(data);
      } catch (err) {
        console.error("Failed to load diary entries:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectUid]);

  if (loading) return <SkeletonGrid count={6} columns="grid-cols-2 md:grid-cols-3 lg:grid-cols-4" />;

  const attachments = entries.flatMap((e) =>
    (e.attachments || []).map((att: any) => ({ ...att, entry_date: e.entry_date }))
  );

  if (attachments.length === 0) {
    return (
      <div className="text-center py-16 bg-surface-50 rounded-2xl border-2 border-dashed border-surface-200 space-y-2">
        <span className="text-5xl block mb-2">📸</span>
        <p className="text-lg font-bold text-primary mb-1">No Site Photos Yet</p>
        <p className="text-sm text-surface-400 max-w-md mx-auto">
          Photos and documents attached to daily logs will automatically appear in this gallery.
        </p>
      </div>
    );
  }

  const isImageUrl = (urlStr?: string | null) => {
    if (!urlStr) return false;
    const clean = urlStr.split("?")[0].toLowerCase();
    return /\.(jpeg|jpg|gif|png|webp|avif|bmp|svg)$/i.test(clean);
  };

  const getCleanFileName = (urlStr?: string | null) => {
    if (!urlStr) return "Attachment";
    const clean = urlStr.split("?")[0];
    return clean.split("/").pop() || "Attachment";
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {attachments.map((att, i) => {
          const rawUrl = att.file || att.image || att.url || "";
          const resolvedUrl = resolveAssetFileUrl(rawUrl);
          const isImage = isImageUrl(rawUrl) || att.file_type?.startsWith("image/") || att.mime_type?.startsWith("image/");
          const fileName = getCleanFileName(rawUrl);

          return (
            <div 
              key={i} 
              onClick={() => isImage && setSelectedPhoto({ ...att, resolvedUrl, fileName })}
              className="group relative rounded-2xl overflow-hidden border border-surface-200 bg-surface-50 aspect-square flex flex-col cursor-pointer hover:shadow-lg transition-all duration-300"
            >
              {isImage ? (
                <img 
                  src={resolvedUrl} 
                  alt={att.caption || fileName || "Site photo"} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 bg-surface-200" 
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-surface-400 bg-surface-100 group-hover:bg-surface-200 transition-colors p-3">
                  <File className="w-10 h-10 mb-2 text-surface-400 shrink-0" />
                  <span className="text-[11px] font-bold text-surface-700 truncate w-full text-center">{fileName}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3.5">
                {att.caption && <p className="text-white text-xs font-bold mb-1 line-clamp-2">{att.caption}</p>}
                <div className="text-white/80 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between w-full">
                  <span>{att.entry_date}</span>
                  <a 
                    href={resolvedUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white/20 hover:bg-white/40 text-white px-2 py-1 rounded-md backdrop-blur-md transition-colors"
                  >
                    Open
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox Photo Preview */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
          onClick={() => setSelectedPhoto(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-surface-900 border border-surface-700 rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-surface-900/90 border-b border-surface-800 flex justify-between items-center text-white">
              <div>
                <h4 className="font-bold text-sm text-surface-100">{selectedPhoto.caption || selectedPhoto.fileName}</h4>
                <p className="text-xs text-surface-400">Log Date: {selectedPhoto.entry_date}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={selectedPhoto.resolvedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-accent text-background font-bold text-xs rounded-xl hover:opacity-90 transition-all"
                >
                  Download Original
                </a>
                <button 
                  onClick={() => setSelectedPhoto(null)}
                  className="w-8 h-8 rounded-full bg-surface-800 hover:bg-surface-700 flex items-center justify-center text-surface-300 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 bg-black flex items-center justify-center p-2 overflow-hidden">
              <img 
                src={selectedPhoto.resolvedUrl} 
                alt={selectedPhoto.caption || "Site photo"}
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-xl"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ── Main SiteOpsTab ───────────────────────────────────────────────────────────
export const SiteOpsTab: React.FC<SiteOpsTabProps> = ({ projectUid, projectTasks, fetchProject, renderIssues }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const subtabParam = searchParams.get("subtab");

  const [activeSubTab, setActiveSubTab] = useState<SiteOpsSubTab>(
    (subtabParam as SiteOpsSubTab) || "diary"
  );

  // Dedicated state for SiteOps Tab's Field Diary
  const [diaryEntries, setDiaryEntries] = useState<any[]>([]);
  const [selectedDiaryEntry, setSelectedDiaryEntry] = useState<any | null>(null);
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [loadingDiary, setLoadingDiary] = useState(false);

  useEffect(() => {
    if (subtabParam && subtabParam !== activeSubTab) {
      setActiveSubTab(subtabParam as SiteOpsSubTab);
    }
  }, [subtabParam]);

  useEffect(() => {
    if (activeSubTab === "diary" && projectUid) {
      fetchDiaryEntries();
    }
  }, [activeSubTab, projectUid]);

  const fetchDiaryEntries = async (forceRefresh = false) => {
    if (!projectUid) return;
    const cacheKey = `entries_${projectUid}`;
    const cachedData = fieldDiaryCache.get<any[]>(cacheKey);

    if (cachedData && !forceRefresh) {
      setDiaryEntries(cachedData);
      const todayStr = getLocalDateString();
      if (!selectedDiaryEntry) {
        handleDiaryDateClick(todayStr, cachedData);
      }
      fetchFromBff<any[]>(`/api/v1/projects/field-diaries/entries/?project_uid=${projectUid}`).then(res => {
        const fresh = Array.isArray(res) ? res : (res as any).results || [];
        setDiaryEntries(fresh);
        fieldDiaryCache.set(cacheKey, fresh);
      }).catch(() => {});
      return;
    }

    setLoadingDiary(true);
    try {
      const res = await fetchFromBff<any[]>(`/api/v1/projects/field-diaries/entries/?project_uid=${projectUid}`);
      const data = Array.isArray(res) ? res : (res as any).results || [];
      setDiaryEntries(data);
      fieldDiaryCache.set(cacheKey, data);
      
      const todayStr = getLocalDateString();
      if (!selectedDiaryEntry) {
        handleDiaryDateClick(todayStr, data);
      }
    } catch (e) {
      console.warn("Failed to fetch diary entries", e);
    } finally {
      setLoadingDiary(false);
    }
  };

  const handleDiaryDateClick = async (dateStr: string, currentEntries = diaryEntries) => {
    let entry = currentEntries.find(e => e.entry_date === dateStr);

    if (!entry) {
      const loadId = toast.loading(`Creating diary for ${dateStr}...`);
      try {
        let targetId = typeof projectUid === "number" || (!isNaN(Number(projectUid)) && !isNaN(parseFloat(String(projectUid)))) ? projectUid : null;
        if (!targetId) {
          try {
            const projRes = await fetchFromBff<any>(`/api/v1/projects/projects/${projectUid}/`);
            targetId = projRes.id;
          } catch (e) {
            console.warn("Failed to fetch project details:", e);
          }
        }
        if (!targetId) throw new Error("Project ID not found");

        const res = await fetchFromBff<any>('/api/v1/projects/field-diaries/entries/', {
          method: 'POST',
          body: JSON.stringify({
            project: targetId,
            entry_date: dateStr,
            weather: "",
            site_conditions: ""
          })
        });
        entry = res;
        setDiaryEntries(prev => {
          const updated = [res, ...prev];
          fieldDiaryCache.set(`entries_${projectUid}`, updated);
          return updated;
        });
        toast.dismiss(loadId);
      } catch (err) {
        toast.dismiss(loadId);
        try {
          const refetchRes = await fetchFromBff<any[]>(`/api/v1/projects/field-diaries/entries/?project_uid=${projectUid}`);
          const data = Array.isArray(refetchRes) ? refetchRes : (refetchRes as any).results || [];
          setDiaryEntries(data);
          fieldDiaryCache.set(`entries_${projectUid}`, data);
          entry = data.find((e: any) => e.entry_date === dateStr);
          if (!entry) throw new Error("Entry not found after refetch");
        } catch (e2) {
          toast.error("Failed to create or fetch diary entry.");
          return;
        }
      }
    }

    const detailCacheKey = `detail_${entry.id}`;
    const cachedDetail = fieldDiaryCache.get<any>(detailCacheKey);
    if (cachedDetail) {
      setSelectedDiaryEntry(cachedDetail);
      fetchFromBff<any>(`/api/v1/projects/field-diaries/entries/${entry.id}/`).then(fresh => {
        setSelectedDiaryEntry(fresh);
        fieldDiaryCache.set(detailCacheKey, fresh);
      }).catch(() => {});
      return;
    }

    try {
      const freshEntry = await fetchFromBff<any>(`/api/v1/projects/field-diaries/entries/${entry.id}/`);
      setSelectedDiaryEntry(freshEntry);
      fieldDiaryCache.set(detailCacheKey, freshEntry);
    } catch (e) {
      toast.error("Failed to load details");
    }
  };

  const handleDiaryUpdate = () => {
    fieldDiaryCache.invalidate(projectUid);
    fetchDiaryEntries(true);
    if (selectedDiaryEntry) {
      handleDiaryDateClick(selectedDiaryEntry.entry_date);
    }
  };

  const goToToday = () => {
    setCurrentMonthDate(new Date());
    handleDiaryDateClick(getLocalDateString());
  };

  const daysInMonthList = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = daysInMonth; i >= 1; i--) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [currentMonthDate]);

  const handleTabChange = (tab: SiteOpsSubTab) => {
    setActiveSubTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "site_ops");
    params.set("subtab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="w-full">
      {/* Sub-tab Navigation */}
      <div className="flex overflow-x-auto no-scrollbar gap-1 p-1 bg-surface-100/50 backdrop-blur-xl rounded-xl border border-surface-200/50 mb-3 shadow-sm w-full">
        {SUBTABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-extrabold text-[9px] uppercase tracking-wider transition-colors duration-300 whitespace-nowrap shrink-0 cursor-pointer ${
              activeSubTab === tab.id
                ? "text-accent"
                : "text-surface-400 hover:text-primary"
            }`}
          >
            {activeSubTab === tab.id && (
              <motion.div
                layoutId="siteOpsActiveTab"
                className="absolute inset-0 bg-surface-50 rounded-lg shadow-sm border border-surface-200/50"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 text-xs">{tab.emoji}</span>
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSubTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            {activeSubTab === "diary" && (
              <div className="w-full">
                {selectedDiaryEntry ? (
                  <DiaryEntryDetail
                    entry={selectedDiaryEntry}
                    projectId={projectUid}
                    onUpdate={handleDiaryUpdate}
                    onOpenCalendar={() => setIsCalendarModalOpen(true)}
                    onGoToToday={goToToday}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-center text-surface-400 min-h-[350px] bg-surface-50 border border-dashed border-surface-200 rounded-2xl">
                    <CalendarIcon className="w-12 h-12 mb-3 text-surface-300" />
                    <p className="text-sm font-bold text-surface-600">No date selected</p>
                    <button
                      onClick={() => setIsCalendarModalOpen(true)}
                      className="mt-3 px-4 py-2 bg-accent text-background font-bold text-xs rounded-xl shadow-md cursor-pointer"
                    >
                      📅 Open Calendar Picker
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeSubTab === "labor" && (
              <SiteOpsLaborPanel projectUid={projectUid} />
            )}

            {activeSubTab === "materials" && (
              <SiteOpsMaterialsPanel projectUid={projectUid} />
            )}

            {activeSubTab === "inventory" && (
              <SiteOpsInventoryPanel projectUid={projectUid} />
            )}

            {activeSubTab === "delays" && (
              <SiteOpsDelaysPanel projectUid={projectUid} />
            )}

            {activeSubTab === "gallery" && (
              <SiteOpsGalleryPanel projectUid={projectUid} />
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── CALENDAR DATE PICKER MODAL FOR SITE OPS TAB ── */}
      {isCalendarModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsCalendarModalOpen(false)}
        >
          <div 
            className="bg-surface-card border border-surface-200 rounded-2xl p-4 max-w-sm w-full shadow-2xl relative flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-surface-200 mb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-accent" />
                <h3 className="text-xs font-black uppercase tracking-wider text-primary">Field Diary Calendar</h3>
              </div>
              <button 
                onClick={() => setIsCalendarModalOpen(false)}
                className="w-6 h-6 rounded-full bg-surface-100 hover:bg-red-500 hover:text-white flex items-center justify-center text-surface-400 text-xs transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex justify-between items-center p-2 rounded-lg border border-surface-200 bg-surface-50 mb-3">
              <button onClick={() => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1))} className="p-1 hover:bg-surface-200 rounded-md text-surface-500 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <h4 className="font-extrabold text-xs text-surface-800 tracking-wide">
                {currentMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h4>
              <button onClick={() => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1))} className="p-1 hover:bg-surface-200 rounded-md text-surface-500 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 p-0.5 no-scrollbar">
              {loadingDiary && diaryEntries.length === 0 ? (
                <div className="flex justify-center p-6"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
              ) : (
                daysInMonthList.map((dateObj, i) => {
                  const dateStr = getLocalDateString(dateObj);
                  const isToday = dateStr === getLocalDateString();
                  const entry = diaryEntries.find(e => e.entry_date === dateStr);
                  const isSelected = selectedDiaryEntry?.entry_date === dateStr;
                  
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        handleDiaryDateClick(dateStr);
                        setIsCalendarModalOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs flex items-center justify-between ${
                        isSelected 
                          ? "bg-accent text-background border-primary shadow-sm font-bold" 
                          : isToday
                            ? "bg-primary/5 border-primary/30 hover:opacity-90"
                            : "bg-surface-50 border-surface-200 hover:border-accent hover:bg-surface-100"
                      }`}
                    >
                      <div>
                        <span className={`font-bold ${isSelected ? 'text-white' : 'text-surface-800'}`}>
                          {dateObj.toLocaleString('default', { weekday: 'short', month: 'short', day: 'numeric' })}
                          {isToday && " (Today)"}
                        </span>
                        {entry && (
                          <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-primary-100' : 'text-surface-400'}`}>
                            {entry.activities?.length || 0} tasks · {entry.labor_entries?.length || 0} crews
                          </p>
                        )}
                      </div>

                      {entry ? (
                        <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                          isSelected 
                            ? 'bg-surface-100 text-white' 
                            : entry.status === 'signed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {entry.status}
                        </span>
                      ) : (
                        <span className="text-[9px] text-surface-400 font-bold uppercase tracking-wider shrink-0">+ Create</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
