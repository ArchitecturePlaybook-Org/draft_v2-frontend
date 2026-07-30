"use client";

import React, { useState, useEffect } from "react";

import dynamic from "next/dynamic";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";

import { AlertTriangle, Camera, File } from "lucide-react";

const MasterFieldDiary = dynamic(
  () => import("@/components/projects/MasterFieldDiary").then((mod) => mod.MasterFieldDiary),
  {
    loading: () => (
      <div className="p-12 text-center text-surface-500 font-bold tracking-[0.2em] uppercase text-xs bg-surface-50/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-surface-200 border-t-accent rounded-full animate-spin" />
        Loading Field Diary...
      </div>
    ),
  }
);

type SiteOpsSubTab = "diary" | "labor" | "materials" | "delays" | "gallery";

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

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-surface-200 border-t-accent rounded-full animate-spin" /></div>;

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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {entry.labor_entries.map((l: any) => (
                  <div key={l.id} className="bg-surface-100 rounded-xl p-3 text-center">
                    <p className="text-lg font-black text-primary">{l.headcount}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-surface-400">{l.trade_type || "General"}</p>
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

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-surface-200 border-t-accent rounded-full animate-spin" /></div>;

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

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-surface-200 border-t-accent rounded-full animate-spin" /></div>;

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-4 border-surface-200 border-t-accent rounded-full animate-spin" />
        <span className="text-xs font-bold text-surface-400 uppercase tracking-widest">Loading site gallery...</span>
      </div>
    );
  }

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

  useEffect(() => {
    if (subtabParam && subtabParam !== activeSubTab) {
      setActiveSubTab(subtabParam as SiteOpsSubTab);
    }
  }, [subtabParam]);

  const handleTabChange = (tab: SiteOpsSubTab) => {
    setActiveSubTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "site_ops");
    params.set("subtab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="w-full">
      {/* Sub-Navigation Pills */}
      <div className="flex flex-wrap gap-2 p-2 bg-surface-100/50 backdrop-blur-xl rounded-2xl border border-surface-200/50 mb-8 shadow-sm w-full">
        {SUBTABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`relative flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-colors duration-300 ${
              activeSubTab === tab.id
                ? "text-accent"
                : "text-surface-400 hover:text-primary"
            }`}
          >
            {activeSubTab === tab.id && (
              <motion.div
                layoutId="siteOpsActiveTab"
                className="absolute inset-0 bg-surface-50 rounded-xl shadow-[0_0_15px_rgba(var(--color-accent),0.1)] border border-surface-200/50"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.emoji}</span>
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
              <MasterFieldDiary projectId={projectUid} />
            )}

            {activeSubTab === "labor" && (
              <SiteOpsLaborPanel projectUid={projectUid} />
            )}

            {activeSubTab === "materials" && (
              <SiteOpsMaterialsPanel projectUid={projectUid} />
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
    </div>
  );
};
