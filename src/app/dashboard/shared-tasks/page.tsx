"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { projectsApi } from "@/domains/projects/api";
import { Task, Project } from "@/types/projects";
import { toast } from "sonner";
import { 
  Search, 
  ExternalLink, 
  Copy, 
  Check, 
  Layers, 
  ArrowUpRight,
  Building2,
  Maximize2,
  ChevronDown
} from "lucide-react";
import { SharedTaskFullScreenModal } from "@/components/projects/SharedTaskFullScreenModal";

export default function SharedTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [projectFilter, setProjectFilter] = useState<string>("ALL");
  const [copiedUid, setCopiedUid] = useState<string | null>(null);
  
  // Custom Project Dropdown Popover State
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  // Full-Screen Modal State
  const [selectedTaskUid, setSelectedTaskUid] = useState<string | null>(null);

  useEffect(() => {
    loadSharedTasks();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadSharedTasks = async () => {
    try {
      setLoading(true);
      const [data, projData] = await Promise.all([
        projectsApi.getSharedTasks(),
        projectsApi.getProjects().catch(() => [])
      ]);
      setTasks(data || []);
      setProjectsList(projData || []);
    } catch (err: any) {
      console.error("Failed to load shared tasks:", err);
      toast.error("Failed to load shared tasks.");
    } finally {
      setLoading(false);
    }
  };

  // Map of project ID/UID -> Human Readable Project Name
  const projectTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    projectsList.forEach((p) => {
      if (p.id) map.set(String(p.id), p.title);
      if (p.uid) map.set(p.uid, p.title);
    });
    return map;
  }, [projectsList]);

  // Helper to get actual project title for any task without showing code hashes
  const getTaskProjectTitle = (t: Task) => {
    if (t.project_title) return t.project_title;
    if ((t.project as any)?.title) return (t.project as any).title;
    if (t.project_uid && projectTitleMap.has(t.project_uid)) return projectTitleMap.get(t.project_uid)!;
    if (t.project && projectTitleMap.has(String(t.project))) return projectTitleMap.get(String(t.project))!;
    if (projectsList.length > 0 && projectsList[0].title) return projectsList[0].title;
    return "Demo Architecture Project";
  };

  const copyShareLink = (taskUid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/share/task/${taskUid}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedUid(taskUid);
    toast.success("Share link copied to clipboard!");
    setTimeout(() => setCopiedUid(null), 2000);
  };

  const openDirectUrl = (taskUid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`/share/task/${taskUid}`, "_blank");
  };

  // Extract unique project list with clean names for project-wise filtering
  const projectOptions = useMemo(() => {
    const map = new Map<string, { id: string; title: string }>();
    tasks.forEach((t) => {
      const projId = t.project_uid || String((t.project as any)?.id || (t.project as any)?.uid || t.project || "");
      const title = getTaskProjectTitle(t);
      if (projId && !map.has(projId)) {
        map.set(projId, { id: projId, title });
      }
    });

    // Also include any project from projectsList if tasks list was small
    projectsList.forEach((p) => {
      const id = p.uid || String(p.id);
      if (id && !map.has(id)) {
        map.set(id, { id, title: p.title });
      }
    });

    return Array.from(map.values());
  }, [tasks, projectsList, projectTitleMap]);

  const selectedProjectLabel = useMemo(() => {
    if (projectFilter === "ALL") return `All Projects (${projectOptions.length})`;
    const found = projectOptions.find(p => p.id === projectFilter);
    return found ? found.title : "All Projects";
  }, [projectFilter, projectOptions]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const projTitle = getTaskProjectTitle(t);
      const matchesSearch = 
        !searchQuery ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.task_code && t.task_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        projTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.trade?.name && t.trade.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = 
        statusFilter === "ALL" || 
        t.status === statusFilter;

      const projId = t.project_uid || String((t.project as any)?.id || (t.project as any)?.uid || t.project);
      const matchesProject =
        projectFilter === "ALL" ||
        projId === projectFilter ||
        String((t.project as any)?.id) === projectFilter ||
        String(t.project) === projectFilter;

      return matchesSearch && matchesStatus && matchesProject;
    });
  }, [tasks, searchQuery, statusFilter, projectFilter, projectTitleMap]);

  // Statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const wip = tasks.filter(t => t.status === "WIP").length;
    const done = tasks.filter(t => t.status === "DONE").length;
    const qa = tasks.filter(t => t.status === "QA").length;
    return { total, wip, done, qa };
  }, [tasks]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-card border border-surface-200 dark:border-surface-800 p-5 rounded-2xl backdrop-blur-xl shadow-sm dark:shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-accent/10 text-accent border border-accent/20">
              <ExternalLink className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-black text-primary tracking-tight">Shared Tasks</h1>
          </div>
          <p className="text-xs text-surface-500 font-medium">
            View and access public share links for all tasks assigned or shared with you.
          </p>
        </div>

        {/* Stats Badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-surface-100 border border-surface-200 dark:border-surface-700 flex items-center gap-2">
            <span className="text-surface-500 font-medium">Total:</span>
            <span className="font-black text-primary">{stats.total}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <span className="font-medium">In Progress:</span>
            <span className="font-black">{stats.wip}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center gap-2">
            <span className="font-medium">QA Review:</span>
            <span className="font-black">{stats.qa}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <span className="font-medium">Completed:</span>
            <span className="font-black">{stats.done}</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search tasks, trades, projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-card border border-surface-200 dark:border-surface-700/80 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all shadow-xs"
            />
          </div>

          {/* Custom Styled Project Filter Popover Dropdown */}
          <div className="relative w-full sm:w-auto shrink-0" ref={projectDropdownRef}>
            <button
              type="button"
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className="flex items-center justify-between gap-2.5 px-3.5 py-2 bg-surface-card border border-surface-200 dark:border-surface-700/80 rounded-xl text-xs font-bold text-primary shadow-xs hover:border-accent/40 transition-all w-full sm:min-w-[240px]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="w-4 h-4 text-accent shrink-0" />
                <span className="text-surface-400 font-semibold shrink-0">Project:</span>
                <span className="truncate text-primary font-bold">{selectedProjectLabel}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-surface-400 shrink-0" />
            </button>

            {isProjectDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-full sm:w-72 bg-surface-card border border-surface-300 dark:border-surface-700 rounded-xl shadow-2xl z-50 p-1.5 space-y-0.5 animate-in fade-in-50 zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setProjectFilter("ALL");
                    setIsProjectDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-bold text-left flex items-center justify-between transition-colors ${
                    projectFilter === "ALL"
                      ? "bg-accent/10 text-accent font-black"
                      : "text-primary hover:bg-surface-200/60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>🏗️</span>
                    <span>All Projects ({projectOptions.length})</span>
                  </div>
                  {projectFilter === "ALL" && <Check className="w-3.5 h-3.5 text-accent stroke-[3]" />}
                </button>

                <div className="h-px bg-surface-200/60 dark:bg-surface-800 my-1" />

                <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
                  {projectOptions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setProjectFilter(p.id);
                        setIsProjectDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-bold text-left flex items-center justify-between transition-colors ${
                        projectFilter === p.id
                          ? "bg-accent/10 text-accent font-black"
                          : "text-primary hover:bg-surface-200/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="shrink-0">📁</span>
                        <span className="truncate">{p.title}</span>
                      </div>
                      {projectFilter === p.id && <Check className="w-3.5 h-3.5 text-accent stroke-[3] shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0">
          {["ALL", "TODO", "WIP", "QA", "DONE"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                statusFilter === st
                  ? "bg-accent text-background shadow-md shadow-accent/20"
                  : "bg-surface-card text-surface-500 border border-surface-200 dark:border-surface-800 hover:text-primary hover:border-surface-300 dark:hover:border-surface-700"
              }`}
            >
              {st === "ALL" ? "All Statuses" : st}
            </button>
          ))}
        </div>
      </div>

      {/* Compact Task List */}
      {loading ? (
        <div className="space-y-3 py-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-surface-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-surface-200 dark:border-surface-800 rounded-2xl bg-surface-card/50">
          <Layers className="w-8 h-8 text-surface-400 mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-bold text-primary">No shared tasks found</h3>
          <p className="text-xs text-surface-500 mt-1 max-w-sm mx-auto">
            {searchQuery || statusFilter !== "ALL" || projectFilter !== "ALL"
              ? "No tasks match your current project, status, or search filters."
              : "Tasks shared with you or assigned across organization projects will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((t) => {
            const displayProjectTitle = getTaskProjectTitle(t);

            return (
              <div
                key={t.uid}
                onClick={() => setSelectedTaskUid(t.uid)}
                className="p-3.5 rounded-xl border border-surface-200/80 dark:border-surface-800 bg-surface-card hover:border-accent/50 hover:shadow-lg transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 group"
              >
                {/* Left Column: Status, Trade, Title, Project */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Status Badge */}
                  <span
                    className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider shrink-0 border ${
                      t.status === "DONE"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : t.status === "WIP"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        : t.status === "QA"
                        ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                        : "bg-surface-200 text-surface-600 border-surface-300 dark:border-surface-700"
                    }`}
                  >
                    {t.status}
                  </span>

                  {/* Trade Badge if available */}
                  {t.trade && (
                    <span
                      className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: t.trade.color_hex || "#3b82f6" }}
                    >
                      {t.trade.name}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-primary truncate group-hover:text-accent transition-colors">
                        {t.title}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-surface-500 mt-0.5 flex-wrap font-medium">
                      <span className="text-accent font-semibold truncate">
                        🏗️ {displayProjectTitle}
                      </span>
                      {t.zone_name && <span>📍 {t.zone_name}</span>}
                      {t.due_date && <span>📅 Due: {t.due_date}</span>}
                    </div>
                  </div>
                </div>

                {/* Right Column: Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {/* Open Full Screen View Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedTaskUid(t.uid)}
                    className="px-3 py-1.5 rounded-lg bg-accent text-background font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 hover:opacity-95 transition-all shadow-sm active:scale-95"
                  >
                    <span>Open Task</span>
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Open Direct Share URL in New Tab */}
                  <button
                    type="button"
                    onClick={(e) => openDirectUrl(t.uid, e)}
                    className="p-1.5 rounded-lg bg-surface-200/70 dark:bg-surface-800 hover:bg-surface-300 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 border border-surface-300/50 dark:border-surface-700 transition-all"
                    title="Open Direct URL in New Tab"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Copy Link Button */}
                  <button
                    type="button"
                    onClick={(e) => copyShareLink(t.uid, e)}
                    className="p-1.5 rounded-lg bg-surface-200/70 dark:bg-surface-800 hover:bg-surface-300 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 border border-surface-300/50 dark:border-surface-700 transition-all"
                    title="Copy Share Link"
                  >
                    {copiedUid === t.uid ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full-Screen Shared Task Modal Overlay */}
      {selectedTaskUid && (
        <SharedTaskFullScreenModal
          taskUid={selectedTaskUid}
          onClose={() => setSelectedTaskUid(null)}
        />
      )}
    </div>
  );
}
