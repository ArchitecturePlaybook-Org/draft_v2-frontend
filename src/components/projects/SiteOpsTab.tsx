"use client";

import React, { useState, useEffect } from "react";

import dynamic from "next/dynamic";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";

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

type SiteOpsSubTab = "diary" | "labor" | "materials";

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
];



// ── Labor & Equipment Panel ───────────────────────────────────────────────────
const SiteOpsLaborPanel: React.FC<{ projectUid: string }> = ({ projectUid }) => {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await projectsApi.getDiaryEntries(projectUid);
        setEntries(Array.isArray(data) ? data : data.results || []);
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
        setEntries(Array.isArray(data) ? data : data.results || []);
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


          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
