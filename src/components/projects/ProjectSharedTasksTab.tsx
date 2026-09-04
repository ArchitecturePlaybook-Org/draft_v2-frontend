"use client";

import React, { useState, useMemo } from "react";
import { 
  Share2, 
  Search, 
  Copy, 
  Check, 
  ExternalLink, 
  Lock, 
  Globe, 
  Clock, 
  Layers, 
  ArrowUpRight,
  Filter,
  CheckCircle2
} from "lucide-react";
import { Task } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";
import { SharedTaskFullScreenModal } from "@/components/projects/SharedTaskFullScreenModal";

interface ProjectSharedTasksTabProps {
  projectUid: string;
  projectTasks?: Task[];
  onTaskUpdated?: () => void;
}

export const ProjectSharedTasksTab: React.FC<ProjectSharedTasksTabProps> = ({
  projectUid,
  projectTasks = [],
  onTaskUpdated,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [copiedUid, setCopiedUid] = useState<string | null>(null);
  const [selectedTaskUid, setSelectedTaskUid] = useState<string | null>(null);
  const [togglingUid, setTogglingUid] = useState<string | null>(null);

  // Filter project tasks that are marked as shared or filter by searchQuery
  const filteredTasks = useMemo(() => {
    return projectTasks.filter((task) => {
      // Must match search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = task.title.toLowerCase().includes(q);
        const descMatch = task.description?.toLowerCase().includes(q);
        const codeMatch = task.code?.toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !codeMatch) return false;
      }

      // Must match status filter
      if (statusFilter !== "ALL") {
        if (task.status !== statusFilter) return false;
      }

      return true;
    });
  }, [projectTasks, searchQuery, statusFilter]);

  const sharedTasksCount = useMemo(() => {
    return projectTasks.filter((t) => (t as any).is_shared).length;
  }, [projectTasks]);

  const copyShareLink = (taskUid: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const shareUrl = `${origin}/public/tasks/${taskUid}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedUid(taskUid);
    toast.success("Public Share URL copied to clipboard!");
    setTimeout(() => setCopiedUid(null), 2000);
  };

  const toggleTaskSharing = async (task: Task) => {
    const currentShared = (task as any).is_shared || false;
    const newShared = !currentShared;
    setTogglingUid(task.uid);

    try {
      await projectsApi.updateTask(task.uid, { is_shared: newShared } as any);
      toast.success(newShared ? "Task sharing enabled!" : "Task sharing revoked!");
      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update task sharing state.");
    } finally {
      setTogglingUid(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-surface-100/80 dark:bg-surface-800/40 border border-surface-200/80 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-primary tracking-tight">Project Shared Tasks</h2>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                {sharedTasksCount} Active Shared
              </span>
            </div>
            <p className="text-xs text-surface-400 mt-0.5">
              Manage public access links, client preview URLs, and collaboration sharing for this project's tasks.
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-50 dark:bg-surface-900/60 p-3 rounded-2xl border border-surface-200/80 dark:border-white/10">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-surface-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search tasks by name, code, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3 text-xs bg-surface-100/70 dark:bg-surface-800/50 border border-surface-200/80 dark:border-white/10 rounded-xl text-primary focus:outline-none focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
          <Filter className="w-3.5 h-3.5 text-surface-400 ml-1" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-surface-400 whitespace-nowrap">Filter Status:</span>
          {["ALL", "TODO", "WIP", "DONE", "ON_HOLD"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap ${
                statusFilter === st
                  ? "bg-accent text-background shadow-xs font-black"
                  : "bg-surface-100/70 dark:bg-surface-800/50 text-surface-400 hover:text-primary"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Task Grid */}
      {filteredTasks.length === 0 ? (
        <div className="p-16 text-center border-2 border-dashed border-surface-200 dark:border-white/10 rounded-3xl bg-surface-50/50 dark:bg-surface-900/30">
          <Share2 className="w-10 h-10 text-surface-400 mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-bold text-primary">No Tasks Found</h3>
          <p className="text-xs text-surface-400 max-w-sm mx-auto mt-1">
            No project tasks match your search or status filter. Toggle task sharing to generate client preview links.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => {
            const isShared = (task as any).is_shared;
            const isToggling = togglingUid === task.uid;

            return (
              <div
                key={task.uid}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                  isShared
                    ? "bg-surface-50/90 dark:bg-surface-900/90 border-accent/30 shadow-sm"
                    : "bg-surface-50/50 dark:bg-surface-900/40 border-surface-200/80 dark:border-white/10 hover:border-surface-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-[10px] font-bold text-accent px-2 py-0.5 rounded bg-accent/10 border border-accent/20">
                      {task.code || task.uid.substring(0, 8)}
                    </span>
                    <span
                      className={`text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded ${
                        task.status === "DONE"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : task.status === "WIP" || task.status === "IN_PROGRESS"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          : "bg-surface-200 dark:bg-surface-800 text-surface-400"
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-primary line-clamp-2 leading-snug">
                    {task.title}
                  </h3>

                  {task.description && (
                    <p className="text-xs text-surface-400 line-clamp-2 mt-1.5 leading-relaxed">
                      {task.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-surface-200/80 dark:border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-surface-400 flex items-center gap-1">
                      {isShared ? (
                        <>
                          <Globe className="w-3.5 h-3.5 text-emerald-500" />
                          <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">Public Link Active</strong>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-surface-400" />
                          <span>Private to Firm</span>
                        </>
                      )}
                    </span>

                    <button
                      onClick={() => toggleTaskSharing(task)}
                      disabled={isToggling}
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        isShared
                          ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
                          : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20"
                      }`}
                    >
                      {isToggling ? "Saving..." : isShared ? "Revoke Share" : "Enable Share"}
                    </button>
                  </div>

                  {isShared && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => copyShareLink(task.uid)}
                        className="flex-1 h-8 px-3 rounded-lg bg-surface-200/80 dark:bg-surface-800 hover:bg-surface-300 text-primary text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {copiedUid === task.uid ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-accent" /> Copy Link
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setSelectedTaskUid(task.uid)}
                        className="h-8 px-3 rounded-lg bg-accent text-background hover:bg-accent/90 text-[11px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer"
                        title="View Full Task Preview"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        Preview
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Shared Task Full Screen Preview Modal */}
      {selectedTaskUid && (
        <SharedTaskFullScreenModal
          taskUid={selectedTaskUid}
          isOpen={!!selectedTaskUid}
          onClose={() => setSelectedTaskUid(null)}
        />
      )}
    </div>
  );
};
