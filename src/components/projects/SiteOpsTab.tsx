"use client";

import React, { useState, useEffect } from "react";
import HSEScorecard from "@/components/HSEScorecard";
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

type SiteOpsSubTab = "diary" | "issues" | "labor" | "materials" | "hse";

interface SiteOpsTabProps {
  projectUid: string;
  projectTasks: any[];
  fetchProject: () => void;
  renderIssues?: () => React.ReactNode;
}

const SUBTABS: { id: SiteOpsSubTab; label: string; emoji: string }[] = [
  { id: "diary",     label: "Daily Log",           emoji: "📖" },
  { id: "issues",    label: "Delays & Issues",      emoji: "⚠️" },
  { id: "labor",     label: "Labor & Equipment",    emoji: "👷" },
  { id: "materials", label: "Material Deliveries",  emoji: "📦" },
  { id: "hse",       label: "HSE & Safety",         emoji: "🛡️" },
];

// ── Delays & Issues Panel ─────────────────────────────────────────────────────
const SiteOpsIssuesPanel: React.FC<{ projectUid: string; projectTasks: any[]; onRefresh: () => void }> = ({
  projectUid, projectTasks, onRefresh,
}) => {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const loadIssues = async () => {
    setLoading(true);
    try {
      // Fetch all diary-sourced punch list items across tasks in this project
      const data = await projectsApi.getPunchListItems(projectUid);
      const diarySourced = (Array.isArray(data) ? data : []).filter(
        (item: any) => item.source_diary_entry != null
      );
      setIssues(diarySourced);
    } catch (err) {
      console.error("Failed to load site ops issues:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadIssues(); }, [projectUid]);

  const handleResolve = async (id: number) => {
    setResolvingId(id);
    try {
      await projectsApi.resolvePunchListItem(id);
      toast.success("Issue resolved — Field Diary status updated automatically.");
      await loadIssues();
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve issue.");
    } finally {
      setResolvingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-surface-200 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  const openIssues = issues.filter((i) => !i.is_resolved);
  const resolvedIssues = issues.filter((i) => i.is_resolved);

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-red-600">{openIssues.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mt-1">Open Issues</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-emerald-600">{resolvedIssues.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mt-1">Resolved</p>
        </div>
        <div className="bg-surface-100 border border-surface-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-primary">{issues.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mt-1">Total</p>
        </div>
      </div>

      {/* Open Issues */}
      {openIssues.length === 0 && (
        <div className="text-center py-16 bg-surface-50 rounded-2xl border-2 border-dashed border-surface-200">
          <span className="text-5xl block mb-4">✅</span>
          <p className="text-lg font-bold text-primary mb-1">No Open Issues</p>
          <p className="text-sm text-surface-400">All diary-sourced issues have been resolved.</p>
        </div>
      )}

      <div className="space-y-3">
        {openIssues.map((issue) => (
          <div key={issue.id} className="bg-surface-50 border border-surface-200 rounded-2xl p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse mt-1.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h4 className="font-bold text-primary text-sm">{issue.title}</h4>
                  {issue.task_title && (
                    <p className="text-[10px] text-surface-400 font-bold uppercase tracking-widest mt-0.5">
                      Task: {issue.task_title}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {issue.occurrence_count > 1 && (
                    <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-lg bg-amber-100 text-amber-700 border border-amber-200">
                      ×{issue.occurrence_count} occurrences
                    </span>
                  )}
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-lg bg-red-100 text-red-600 border border-red-200">
                    ● Active
                  </span>
                </div>
              </div>
              {issue.source_diary_entry_date && (
                <p className="text-[10px] text-surface-400 mt-1">
                  📅 Source: Diary {issue.source_diary_entry_date}
                </p>
              )}
              {issue.description && (
                <p className="text-xs text-surface-500 mt-2 line-clamp-2">{issue.description}</p>
              )}
            </div>
            <button
              onClick={() => handleResolve(issue.id)}
              disabled={resolvingId === issue.id}
              className="h-9 px-4 shrink-0 bg-emerald-500 text-white font-bold text-[9px] uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all disabled:opacity-40"
            >
              {resolvingId === issue.id ? "Resolving..." : "Resolve"}
            </button>
          </div>
        ))}
      </div>

      {/* Resolved Issues (collapsed) */}
      {resolvedIssues.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-widest text-surface-400 hover:text-primary transition-colors py-2 flex items-center gap-2">
            <span>✅ {resolvedIssues.length} Resolved Issues</span>
          </summary>
          <div className="mt-3 space-y-2">
            {resolvedIssues.map((issue) => (
              <div key={issue.id} className="bg-surface-50 border border-surface-200 rounded-xl p-4 flex items-center gap-3 opacity-60">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-primary line-through">{issue.title}</p>
                  {issue.task_title && <p className="text-[10px] text-surface-400 font-bold">{issue.task_title}</p>}
                </div>
                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200">
                  ✓ Resolved
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};

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

            {activeSubTab === "issues" && (
              <SiteOpsIssuesPanel
                projectUid={projectUid}
                projectTasks={projectTasks}
                onRefresh={fetchProject}
              />
            )}

            {activeSubTab === "labor" && (
              <SiteOpsLaborPanel projectUid={projectUid} />
            )}

            {activeSubTab === "materials" && (
              <SiteOpsMaterialsPanel projectUid={projectUid} />
            )}

            {activeSubTab === "hse" && (
              <HSEScorecard projectId={projectUid} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
