"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { ExpandedFeedPayload, ExpandedFeedSection, TaskStatus } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { TaskItem } from "../projects/TaskItem";
import { TaskExecutionModal } from "../projects/TaskExecutionModal";
import { toast } from "sonner";
import { useWindowVirtualizer } from "@tanstack/react-virtual";

interface ExpandedFeedViewProps {
  projectUid: string;
  userRole?: "contractor" | "qa_inspector" | "admin";
}

const COLUMNS: { id: TaskStatus; label: string; color: string; dotColor: string }[] = [
  { id: "TODO", label: "To Do", color: "bg-surface-100 border-surface-200", dotColor: "bg-surface-400" },
  { id: "WIP", label: "In Progress", color: "bg-blue-50 border-blue-100", dotColor: "bg-accent" },
  { id: "QA", label: "Under Inspection", color: "bg-amber-50 border-amber-100", dotColor: "bg-amber-400" },
  { id: "DONE", label: "Done", color: "bg-emerald-50 border-emerald-100", dotColor: "bg-emerald-500" },
];

export const ExpandedFeedView: React.FC<ExpandedFeedViewProps> = ({
  projectUid,
  userRole = "admin",
}) => {
  const [sections, setSections] = useState<ExpandedFeedSection[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const [selectedTask, setSelectedTask] = useState<any>(null);
  
  // Drag state
  const [draggingTask, setDraggingTask] = useState<{uid: string, sourceBlockId: number} | null>(null);
  const [dragTarget, setDragTarget] = useState<{blockId: number, status: TaskStatus} | null>(null);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  const loadFeed = useCallback(async (pageToLoad: number, append: boolean = false) => {
    try {
      const appendMode = append ? true : false;
      if (!appendMode) setIsLoading(true);
      else setIsLoadingMore(true);

      const payload = await projectsApi.getExpandedFeed(projectUid, pageToLoad);
      
      if (appendMode) {
        setSections(prev => [...prev, ...payload.sections]);
      } else {
        setSections(payload.sections);
      }
      
      setHasNext(payload.has_next);
      setPage(payload.page);
    } catch (err: any) {
      toast.error(err.message || "Failed to load expanded feed.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [projectUid]);

  // Initial load
  useEffect(() => {
    loadFeed(1, false);
  }, [loadFeed]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (isLoading || isLoadingMore || !hasNext) return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        loadFeed(page + 1, true);
      }
    }, { rootMargin: "200px" });

    if (loaderRef.current) {
      observerRef.current.observe(loaderRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [isLoading, isLoadingMore, hasNext, page, loadFeed]);

  // ── Drag & Drop Handlers ───────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, taskUid: string, blockId: number) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggingTask({ uid: taskUid, sourceBlockId: blockId });
  };

  const handleDragOver = (e: React.DragEvent, blockId: number, status: TaskStatus) => {
    e.preventDefault();
    if (!draggingTask || draggingTask.sourceBlockId !== blockId) return; // Prevent dragging across blocks
    e.dataTransfer.dropEffect = "move";
    setDragTarget({ blockId, status });
  };

  const handleDrop = async (e: React.DragEvent, targetBlockId: number, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragTarget(null);

    if (!draggingTask || draggingTask.sourceBlockId !== targetBlockId) {
      setDraggingTask(null);
      return;
    }

    const { uid: taskUid, sourceBlockId } = draggingTask;
    setDraggingTask(null);

    // Find task
    let taskToMove: any = null;
    let sectionIdx = -1;
    let blockIdx = -1;

    for (let s = 0; s < sections.length; s++) {
      for (let b = 0; b < sections[s].blocks.length; b++) {
        if (sections[s].blocks[b].id === sourceBlockId) {
          taskToMove = sections[s].blocks[b].tasks.find((t: any) => t.uid === taskUid);
          sectionIdx = s;
          blockIdx = b;
          break;
        }
      }
      if (taskToMove) break;
    }

    if (!taskToMove || taskToMove.status === targetStatus) return;

    // Optimistic update
    const previousSections = JSON.parse(JSON.stringify(sections));
    
    setSections(prev => {
      const newSections = [...prev];
      const block = newSections[sectionIdx].blocks[blockIdx];
      block.tasks = block.tasks.map((t: any) => t.uid === taskUid ? { ...t, status: targetStatus } : t);
      return newSections;
    });

    try {
      const updated = await projectsApi.moveConstructionTask(taskUid, targetStatus);
      
      // Update with server response
      setSections(prev => {
        const newSections = [...prev];
        const block = newSections[sectionIdx].blocks[blockIdx];
        block.tasks = block.tasks.map((t: any) => t.uid === updated.uid ? updated : t);
        return newSections;
      });
      
      toast.success(`Moved to ${COLUMNS.find(c => c.id === targetStatus)?.label}`);
    } catch (err: any) {
      // Revert on failure
      setSections(previousSections);
      toast.error(err?.message || "Cannot move task — gate rule violated.");
    }
  };

  const handleTaskUpdated = (updated: any) => {
    setSections(prev => prev.map(sec => ({
      ...sec,
      blocks: sec.blocks.map(b => ({
        ...b,
        tasks: b.tasks.map(t => t.id === updated.id ? updated : t)
      }))
    })));
  };

  const handleTaskDeleted = (taskId: number) => {
    setSections(prev => prev.map(sec => ({
      ...sec,
      blocks: sec.blocks.map(b => ({
        ...b,
        tasks: b.tasks.filter(t => t.id !== taskId)
      }))
    })));
  };

  const virtualizer = useWindowVirtualizer({
    count: sections.length,
    estimateSize: () => 400,
    overscan: 2,
  });

  if (isLoading && sections.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        <p className="text-sm font-bold text-surface-400">Loading expanded feed...</p>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <div style={{ position: "relative", height: `${virtualizer.getTotalSize()}px`, width: "100%" }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const section = sections[virtualRow.index];
          return (
            <div
              key={section.phase.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
                paddingBottom: "3rem"
              }}
            >
              <div className="bg-white rounded-3xl border border-surface-200 overflow-hidden shadow-sm">
                {/* Phase Header */}
          <div 
            className="px-8 py-5 border-b border-surface-200 sticky top-0 z-20 shadow-sm"
            style={{ backgroundColor: `${section.phase.color_hex}10` }} // 10% opacity hex
          >
            <div className="flex items-center gap-3">
              <span 
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-xl"
                style={{ backgroundColor: section.phase.color_hex }}
              >
                {section.phase.sequence_order}
              </span>
              <div>
                <h2 className="text-2xl font-black text-primary tracking-tight">{section.phase.name}</h2>
                {section.phase.description && (
                  <p className="text-sm text-surface-500 font-medium">{section.phase.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Zones Row (Horizontal Scroll) */}
          <div className="flex overflow-x-auto p-8 gap-8 snap-x snap-mandatory">
            {section.blocks.map(block => {
              const isLocked = block.status === "LOCKED";
              
              return (
                <div 
                  key={block.id} 
                  className={`
                    snap-center shrink-0 w-[420px] rounded-2xl border-2 flex flex-col relative overflow-hidden
                    ${isLocked ? "border-dashed border-surface-200 bg-surface-50/50" : "border-surface-200 bg-white shadow-sm"}
                  `}
                >
                  {/* Block Header */}
                  <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between shrink-0">
                    <div>
                      <h3 className="font-bold text-lg text-primary">{block.zone_name}</h3>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mt-0.5">
                        {block.total_tasks} Tasks · {block.completed_tasks} Done
                      </p>
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                      block.status === "DONE" ? "bg-emerald-100 text-emerald-700" :
                      block.status === "ACTIVE" ? "bg-accent/10 text-accent" :
                      "bg-surface-200 text-surface-500"
                    }`}>
                      {block.status}
                    </span>
                  </div>

                  {/* Kanban Mini-Board */}
                  <div className="flex-1 p-4 bg-surface-50">
                    {isLocked ? (
                      <div className="h-64 flex flex-col items-center justify-center text-center px-6">
                        <svg className="w-12 h-12 text-surface-300 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <p className="font-bold text-surface-500 text-sm">Zone Locked</p>
                        <p className="text-xs text-surface-400 mt-1 font-medium">Complete this zone in the previous phase to unlock tasks here.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {COLUMNS.map(col => {
                          const colTasks = block.tasks.filter(t => t.status === col.id);
                          const isDragTarget = dragTarget?.blockId === block.id && dragTarget?.status === col.id;
                          
                          return (
                            <div 
                              key={col.id}
                              onDragOver={e => handleDragOver(e, block.id, col.id)}
                              onDrop={e => handleDrop(e, block.id, col.id)}
                              className={`
                                rounded-xl p-3 border-2 transition-all
                                ${isDragTarget ? "border-accent bg-accent/5 scale-[1.02]" : "border-transparent bg-white"}
                              `}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                                  <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">{col.label}</h4>
                                </div>
                                <span className="text-[10px] font-black tabular-nums bg-surface-100 text-surface-500 px-2 rounded-full">
                                  {colTasks.length}
                                </span>
                              </div>
                              
                              <div className="space-y-2">
                                {colTasks.map((task: any) => (
                                  <TaskItem
                                    key={task.uid}
                                    task={task}
                                    isLocked={false}
                                    onDragStart={(e) => handleDragStart(e, task.uid, block.id)}
                                    onClick={() => setSelectedTask(task)}
                                  />
                                ))}
                                {colTasks.length === 0 && (
                                  <div className="h-10 rounded-lg border-2 border-dashed border-surface-200 flex items-center justify-center">
                                    <span className="text-[9px] font-bold text-surface-300 uppercase tracking-widest">
                                      {isDragTarget ? "Drop here" : "Empty"}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
            </div>
          );
        })}
      </div>

      {/* Infinite Scroll Loader */}
      <div ref={loaderRef} className="py-8 flex justify-center">
        {isLoadingMore && (
          <div className="flex items-center justify-center py-6 gap-2">
            <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <span className="text-xs font-bold text-surface-400">Loading earlier phases...</span>
          </div>
        )}
        <div ref={loaderRef} className="h-4" />
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskExecutionModal
          task={selectedTask}
          projectUid={projectUid}
          projectAssets={[]}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={() => {
            projectsApi.getTask(selectedTask.uid).then(updated => {
              handleTaskUpdated(updated);
              setSelectedTask(updated);
            });
          }}
        />
      )}
    </div>
  );
};
