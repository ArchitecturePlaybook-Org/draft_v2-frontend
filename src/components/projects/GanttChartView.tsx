"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Task } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type GroupBy = "phase" | "zone" | "trade";

interface GanttChartViewProps {
  tasks: Task[];
  criticalPathUids: string[];
  onTaskClick: (task: Task) => void;
  onTasksChanged: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

const formatDate = (ms: number) => new Date(ms).toISOString().split("T")[0];

const toMs = (dateStr: string) => new Date(dateStr).getTime();

const clamp = (val: number, min: number, max: number) =>
  Math.max(min, Math.min(max, val));

// ─── GanttTaskBar (interactive, draggable bar) ────────────────────────────────

interface GanttTaskBarProps {
  task: Task;
  totalDays: number;
  minDate: Date;
  isCritical: boolean;
  onTaskUpdate: (uid: string, start: string, end: string) => void;
  onClick: () => void;
  barRef: (el: HTMLDivElement | null) => void;
}

const GanttTaskBar: React.FC<GanttTaskBarProps> = ({
  task,
  totalDays,
  minDate,
  isCritical,
  onTaskUpdate,
  onClick,
  barRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const hasDates = task.start_date && task.end_date;
  const startMs = hasDates ? toMs(task.start_date!) : 0;
  const endMs = hasDates ? toMs(task.end_date!) : 0;

  const [draftStart, setDraftStart] = useState(startMs);
  const [draftEnd, setDraftEnd] = useState(endMs);
  const [mode, setMode] = useState<"idle" | "move" | "resize">("idle");
  const dragStartX = useRef(0);
  const initialStart = useRef(0);
  const initialEnd = useRef(0);

  useEffect(() => {
    if (mode === "idle" && hasDates) {
      setDraftStart(toMs(task.start_date!));
      setDraftEnd(toMs(task.end_date!));
    }
  }, [task.start_date, task.end_date, mode, hasDates]);

  if (!hasDates) {
    return (
      <div ref={containerRef} className="flex-1 relative h-12 flex items-center justify-center">
        <button
          onClick={onClick}
          className="text-[9px] font-bold text-accent uppercase tracking-widest bg-accent/5 px-4 py-2 rounded-full border border-accent/10 hover:bg-accent hover:text-white transition-all"
        >
          Set Timeline
        </button>
      </div>
    );
  }

  const msPerPixel = containerRef.current
    ? (totalDays * DAY_MS) / containerRef.current.offsetWidth
    : 0;

  const handlePointerDown = (
    e: React.PointerEvent,
    dragMode: "move" | "resize"
  ) => {
    e.stopPropagation();
    setMode(dragMode);
    dragStartX.current = e.clientX;
    initialStart.current = draftStart;
    initialEnd.current = draftEnd;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (mode === "idle" || !msPerPixel) return;
    const deltaMs = (e.clientX - dragStartX.current) * msPerPixel;
    const deltaDays = Math.round(deltaMs / DAY_MS);
    const snappedDeltaMs = deltaDays * DAY_MS;

    if (mode === "move") {
      setDraftStart(initialStart.current + snappedDeltaMs);
      setDraftEnd(initialEnd.current + snappedDeltaMs);
    } else if (mode === "resize") {
      const newEnd = initialEnd.current + snappedDeltaMs;
      if (newEnd >= draftStart + DAY_MS) {
        setDraftEnd(newEnd);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (mode === "idle") return;
    e.currentTarget.releasePointerCapture(e.pointerId);

    if (draftStart !== startMs || draftEnd !== endMs) {
      onTaskUpdate(task.uid, formatDate(draftStart), formatDate(draftEnd));
    }
    setMode("idle");
  };

  const taskDays = Math.max(
    1,
    Math.ceil((draftEnd - draftStart) / DAY_MS)
  );
  const offsetDays = Math.ceil(
    (draftStart - minDate.getTime()) / DAY_MS
  );

  const width = `${(taskDays / totalDays) * 100}%`;
  const left = `${(offsetDays / totalDays) * 100}%`;

  // Colors
  const barColor = isCritical
    ? "bg-red-500 shadow-red-300/40"
    : task.status === "DONE"
    ? "bg-emerald-500 shadow-emerald-200"
    : task.status === "WIP"
    ? "bg-accent shadow-accent/20"
    : "bg-primary shadow-primary/20";

  return (
    <div
      ref={(el) => {
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }}
      className="flex-1 relative h-12 bg-surface-50/50 rounded-2xl border border-dashed border-surface-100 flex items-center px-2"
    >
      <div
        ref={barRef}
        data-task-uid={task.uid}
        onPointerDown={(e) => handlePointerDown(e, "move")}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`absolute h-8 rounded-xl shadow-lg transition-colors cursor-grab active:cursor-grabbing flex items-center px-4 group/bar hover:scale-y-110 ${barColor} ${
          isCritical ? "ring-2 ring-red-300 ring-offset-1" : ""
        }`}
        style={{ width, left, touchAction: "none" }}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="flex-1 truncate flex items-center gap-2"
        >
          {isCritical && (
            <span className="text-[8px] text-white/90 font-black">⚡</span>
          )}
          <span className="text-[10px] text-white font-extrabold uppercase tracking-widest">
            {task.status}
          </span>
        </div>

        {/* Resize handle */}
        <div
          onPointerDown={(e) => handlePointerDown(e, "resize")}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="absolute right-0 top-0 bottom-0 w-4 cursor-col-resize hover:bg-black/10 rounded-r-xl flex items-center justify-center"
        >
          <div className="w-1 h-3 border-l-2 border-r-2 border-white/50" />
        </div>
      </div>
    </div>
  );
};

// ─── SVG Dependency Arrows ────────────────────────────────────────────────────

interface ArrowOverlayProps {
  tasks: Task[];
  barRefs: Map<string, HTMLDivElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  criticalPathUids: string[];
}

const ArrowOverlay: React.FC<ArrowOverlayProps> = ({
  tasks,
  barRefs,
  containerRef,
  criticalPathUids,
}) => {
  const [arrows, setArrows] = useState<
    { x1: number; y1: number; x2: number; y2: number; isCritical: boolean }[]
  >([]);

  const calculateArrows = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();

    const newArrows: typeof arrows = [];

    tasks.forEach((task) => {
      const depIds = task.depends_on || [];
      if (depIds.length === 0) return;

      const targetBar = barRefs.get(task.uid);
      if (!targetBar) return;
      const targetRect = targetBar.getBoundingClientRect();

      depIds.forEach((depId) => {
        const depTask = tasks.find((t) => t.id === depId);
        if (!depTask) return;
        const sourceBar = barRefs.get(depTask.uid);
        if (!sourceBar) return;
        const sourceRect = sourceBar.getBoundingClientRect();

        // right edge of source → left edge of target
        const x1 = sourceRect.right - containerRect.left;
        const y1 = sourceRect.top + sourceRect.height / 2 - containerRect.top;
        const x2 = targetRect.left - containerRect.left;
        const y2 = targetRect.top + targetRect.height / 2 - containerRect.top;

        const isCritical =
          criticalPathUids.includes(task.uid) &&
          criticalPathUids.includes(depTask.uid);

        newArrows.push({ x1, y1, x2, y2, isCritical });
      });
    });

    setArrows(newArrows);
  }, [tasks, barRefs, containerRef, criticalPathUids]);

  useEffect(() => {
    calculateArrows();
    window.addEventListener("resize", calculateArrows);
    return () => window.removeEventListener("resize", calculateArrows);
  }, [calculateArrows]);

  // Recalculate on any task date change
  useEffect(() => {
    const timer = setTimeout(calculateArrows, 50);
    return () => clearTimeout(timer);
  }, [tasks, calculateArrows]);

  if (arrows.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 5 }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
        </marker>
        <marker
          id="arrowhead-critical"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
        </marker>
      </defs>
      {arrows.map((a, i) => {
        // Orthogonal step path: go right, then down/up, then right
        const midX = (a.x1 + a.x2) / 2;
        const d = `M ${a.x1} ${a.y1} C ${midX} ${a.y1}, ${midX} ${a.y2}, ${a.x2} ${a.y2}`;

        return (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={a.isCritical ? "#ef4444" : "#cbd5e1"}
            strokeWidth={a.isCritical ? 2 : 1.5}
            strokeDasharray={a.isCritical ? "none" : "6 3"}
            markerEnd={
              a.isCritical
                ? "url(#arrowhead-critical)"
                : "url(#arrowhead)"
            }
            opacity={0.7}
          />
        );
      })}
    </svg>
  );
};

// ─── Main GanttChartView Component ────────────────────────────────────────────

export const GanttChartView: React.FC<GanttChartViewProps> = ({
  tasks,
  criticalPathUids,
  onTaskClick,
  onTasksChanged,
}) => {
  const topLevelTasks = useMemo(() => tasks.filter(t => !t.parent_task_id && !t.parent_task), [tasks]);
  const [groupBy, setGroupBy] = useState<GroupBy>("phase");
  const ganttContainerRef = useRef<HTMLDivElement>(null);
  const barRefsMap = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const [renderKey, setRenderKey] = useState(0);

  // ── Date range ──────────────────────────────────────────────────────────────

  const { minDate, maxDate, totalDays } = useMemo(() => {
    const tasksWithDates = topLevelTasks.filter((t) => t.start_date && t.end_date);
    let min: Date;
    let max: Date;

    if (tasksWithDates.length > 0) {
      min = new Date(
        Math.min(...tasksWithDates.map((t) => toMs(t.start_date!)))
      );
      max = new Date(
        Math.max(...tasksWithDates.map((t) => toMs(t.end_date!)))
      );
      min.setDate(min.getDate() - 7);
      max.setDate(max.getDate() + 7);
    } else {
      min = new Date();
      max = new Date();
      max.setDate(max.getDate() + 30);
    }

    const total = Math.max(
      1,
      Math.ceil((max.getTime() - min.getTime()) / DAY_MS)
    );
    return { minDate: min, maxDate: max, totalDays: total };
  }, [topLevelTasks]);

  // ── Today marker position ───────────────────────────────────────────────────

  const todayPercent = useMemo(() => {
    const now = Date.now();
    if (now < minDate.getTime() || now > maxDate.getTime()) return null;
    return (
      ((now - minDate.getTime()) / (maxDate.getTime() - minDate.getTime())) *
      100
    );
  }, [minDate, maxDate]);

  // ── Grouping logic ─────────────────────────────────────────────────────────

  const groupedTasks = useMemo(() => {
    const map = new Map<string, Task[]>();
    topLevelTasks.forEach((task) => {
      let key: string;
      switch (groupBy) {
        case "zone":
          key = task.zone_name || "Unzoned";
          break;
        case "trade":
          key = task.trade?.name || "No Trade";
          break;
        case "phase":
        default:
          key = task.phase_name || "Unphased";
          break;
      }
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    });
    return Array.from(map.entries());
  }, [topLevelTasks, groupBy]);

  // ── Auto-scheduling: cascade push dependents ────────────────────────────────

  const cascadePush = useCallback(
    async (
      movedTaskUid: string,
      newStart: string,
      newEnd: string
    ) => {
      // Build a quick lookup
      const uidToTask = new Map(topLevelTasks.map((t) => [t.uid, t]));
      const movedTask = uidToTask.get(movedTaskUid);
      if (!movedTask) return;

      const movedEndMs = toMs(newEnd);

      // Collect all tasks whose `depends_on` includes the moved task
      const updates: { uid: string; start: string; end: string }[] = [];

      const pushDependents = (parentId: number, parentEndMs: number) => {
        topLevelTasks.forEach((t) => {
          if (!t.depends_on?.includes(parentId)) return;
          if (!t.start_date || !t.end_date) return;

          const depStartMs = toMs(t.start_date);
          const depEndMs = toMs(t.end_date);
          const duration = depEndMs - depStartMs;

          if (depStartMs < parentEndMs) {
            // Push forward
            const newDepStart = parentEndMs;
            const newDepEnd = newDepStart + duration;
            updates.push({
              uid: t.uid,
              start: formatDate(newDepStart),
              end: formatDate(newDepEnd),
            });
            // Recursively push dependents of this task
            pushDependents(t.id, newDepEnd);
          }
        });
      };

      pushDependents(movedTask.id, movedEndMs);

      // Batch update all pushed tasks
      const batchPromises = updates.map((u) =>
        projectsApi.updateTask(u.uid, {
          start_date: u.start,
          end_date: u.end,
        })
      );

      try {
        await Promise.all(batchPromises);
      } catch (err) {
        console.error("Auto-schedule cascade error:", err);
      }
    },
    [topLevelTasks]
  );

  const handleTaskUpdate = useCallback(
    async (taskUid: string, start: string, end: string) => {
      try {
        await projectsApi.updateTask(taskUid, {
          start_date: start,
          end_date: end,
        });
        await cascadePush(taskUid, start, end);
        onTasksChanged();
        setRenderKey((k) => k + 1);
      } catch (err) {
        console.error(err);
        onTasksChanged(); // revert
      }
    },
    [cascadePush, onTasksChanged]
  );

  // ── Timeline header labels ──────────────────────────────────────────────────

  const timelineLabels = useMemo(() => {
    const labels: { percent: number; label: string }[] = [];
    const span = maxDate.getTime() - minDate.getTime();
    const totalWeeks = Math.ceil(span / (7 * DAY_MS));
    // Show week markers or monthly markers depending on span
    if (totalWeeks <= 12) {
      // Weekly labels
      for (let i = 0; i <= totalWeeks; i++) {
        const d = new Date(minDate.getTime() + i * 7 * DAY_MS);
        labels.push({
          percent: (i * 7 * DAY_MS) / span * 100,
          label: d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
        });
      }
    } else {
      // Monthly labels
      const startMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
      let cursor = new Date(startMonth);
      while (cursor <= maxDate) {
        const pct =
          ((cursor.getTime() - minDate.getTime()) / span) * 100;
        if (pct >= 0 && pct <= 100) {
          labels.push({
            percent: pct,
            label: cursor.toLocaleDateString("en-US", {
              month: "short",
              year: "2-digit",
            }),
          });
        }
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      }
    }
    return labels;
  }, [minDate, maxDate]);

  // ── Bar ref callback ────────────────────────────────────────────────────────

  const setBarRef = useCallback(
    (uid: string) => (el: HTMLDivElement | null) => {
      barRefsMap.current.set(uid, el);
    },
    []
  );

  // ── Empty state ─────────────────────────────────────────────────────────────

  if (!topLevelTasks || topLevelTasks.length === 0) {
    return (
      <div className="p-16 text-center text-surface-400 bg-surface-100 border-surface-200 rounded-2xl border border-surface-200 shadow-sm">
        <span className="text-5xl opacity-20 block mb-4">📊</span>
        <p className="text-sm font-bold">
          No tasks to display in the Gantt timeline.
        </p>
        <p className="text-xs text-surface-400 mt-1">
          Create tasks and assign start/end dates to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto bg-surface-100 border-surface-200 p-10 rounded-[2.5rem] border border-surface-200 shadow-2xl shadow-primary/5 animate-in fade-in duration-700">
      {/* ── Controls Bar ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-bold text-primary tracking-tight">
            Gantt Timeline
          </h3>
          <p className="text-[10px] font-bold text-surface-400 uppercase tracking-[0.2em] mt-1">
            Timeline Orchestration • {topLevelTasks.length} Tasks
          </p>
        </div>

        {/* Grouping Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-surface-400 uppercase tracking-widest mr-2">
            Group by
          </span>
          <div className="flex bg-surface-100 p-1 rounded-xl border border-surface-200">
            {(
              [
                { id: "phase", label: "Phase" },
                { id: "zone", label: "Zone" },
                { id: "trade", label: "Trade" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setGroupBy(opt.id)}
                className={`px-4 py-1.5 text-[9px] font-extrabold uppercase tracking-widest rounded-lg transition-all ${
                  groupBy === opt.id
                    ? "bg-surface-100 border-surface-200 shadow-md text-primary"
                    : "text-surface-500 text-surface-400 hover:text-primary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Chart Area ─────────────────────────────────────────────────────── */}
      <div className="min-w-[1200px]" ref={ganttContainerRef}>
        {/* Timeline Header */}
        <div className="flex border-b border-surface-100 pb-4 mb-6">
          <div className="w-1/4 pr-10">
            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-[0.2em]">
              Task Name
            </span>
          </div>
          <div className="flex-1 relative h-8">
            <div className="absolute inset-0 flex items-end">
              {timelineLabels.map((tl, i) => (
                <div
                  key={i}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${clamp(tl.percent, 0, 100)}%` }}
                >
                  <span className="text-[8px] font-extrabold text-surface-400 uppercase tracking-widest whitespace-nowrap">
                    {tl.label}
                  </span>
                  <div className="w-px h-2 bg-surface-200 mt-1" />
                </div>
              ))}
            </div>
            {/* Today marker */}
            {todayPercent !== null && (
              <div
                className="absolute top-0 bottom-0 w-px bg-red-400 z-10"
                style={{ left: `${todayPercent}%` }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full whitespace-nowrap">
                  Today
                </div>
              </div>
            )}
          </div>
          {/* Spacer for action button column */}
          <div className="w-14 shrink-0" />
        </div>

        {/* Task Rows — positioned container for SVG overlay */}
        <div className="relative">
          {/* SVG arrow overlay */}
          <ArrowOverlay
            key={renderKey}
            tasks={topLevelTasks}
            barRefs={barRefsMap.current}
            containerRef={ganttContainerRef}
            criticalPathUids={criticalPathUids}
          />

          {/* Grouped Sections */}
          <div className="space-y-8 relative" style={{ zIndex: 10 }}>
            {groupedTasks.map(([groupName, groupTasks]) => (
              <div key={groupName} className="space-y-3">
                <div className="flex items-center gap-3 pb-2 border-b border-surface-100">
                  <h4 className="text-xs font-black uppercase tracking-widest text-surface-500 text-surface-400">
                    {groupName}
                  </h4>
                  <span className="text-[9px] font-bold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">
                    {groupTasks.length}
                  </span>
                </div>
                <div className="space-y-4">
                  {groupTasks.map((task) => {
                    const isCritical = criticalPathUids.includes(task.uid);
                    return (
                      <div
                        key={task.uid}
                        className="flex items-center group"
                      >
                        {/* Task Label */}
                        <div className="w-1/4 pr-10 py-2">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-primary truncate group-hover:text-accent transition-colors">
                              {task.title}
                            </h4>
                            {isCritical && (
                              <span className="bg-red-100 text-red-700 text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border border-red-200 dark:border-red-800/30 shrink-0">
                                ⚡ Critical
                              </span>
                            )}
                          </div>
                          <p className="text-[9px] font-bold text-surface-400 uppercase tracking-tighter mt-0.5">
                            {task.start_date && task.end_date
                              ? `${task.start_date} → ${task.end_date}`
                              : "Timeline Not Defined"}
                          </p>
                          {task.zone_name && (
                            <span className="text-[8px] font-bold text-surface-400 uppercase">
                              📍 {task.zone_name}
                            </span>
                          )}
                        </div>

                        {/* Gantt Bar */}
                        <GanttTaskBar
                          task={task}
                          totalDays={totalDays}
                          minDate={minDate}
                          isCritical={isCritical}
                          onTaskUpdate={handleTaskUpdate}
                          onClick={() => onTaskClick(task)}
                          barRef={setBarRef(task.uid)}
                        />

                        {/* Action */}
                        <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity w-10 shrink-0">
                          <button
                            onClick={() => onTaskClick(task)}
                            className="w-10 h-10 rounded-xl bg-surface-100 text-surface-500 text-surface-400 hover:opacity-90 hover:text-white transition-all flex items-center justify-center text-xs"
                          >
                            ⚙️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Today line extending through rows */}
          {todayPercent !== null && (
            <div
              className="absolute top-0 bottom-0 w-px bg-red-400/30 pointer-events-none"
              style={{
                left: `calc(25% + ${todayPercent * 0.75}%)`,
                zIndex: 1,
              }}
            />
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-10 pt-6 border-t border-surface-100">
          <span className="text-[9px] font-bold text-surface-400 uppercase tracking-widest">
            Legend:
          </span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-2 bg-primary rounded-sm" />
            <span className="text-[9px] font-bold text-surface-500 text-surface-400">
              To Do
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-2 bg-accent rounded-sm" />
            <span className="text-[9px] font-bold text-surface-500 text-surface-400">
              In Progress
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-2 bg-emerald-500 rounded-sm" />
            <span className="text-[9px] font-bold text-surface-500 text-surface-400">
              Done
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-2 bg-red-500 rounded-sm ring-2 ring-red-300 ring-offset-1" />
            <span className="text-[9px] font-bold text-surface-500 text-surface-400">
              Critical Path
            </span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="24" height="8" className="text-surface-400">
              <line
                x1="0"
                y1="4"
                x2="20"
                y2="4"
                stroke="#cbd5e1"
                strokeWidth="1.5"
                strokeDasharray="4 2"
                markerEnd="url(#arrowhead)"
              />
            </svg>
            <span className="text-[9px] font-bold text-surface-500 text-surface-400">
              Dependency
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
