import React, { useState, useEffect, useRef } from "react";
import { Task } from "@/types/projects";
import { useProjectStore } from "@/store/project-store";
import { motion, AnimatePresence } from "framer-motion";

const GanttTaskBar = ({ task, totalDays, minDate, onTaskUpdate, onClick }: { task: Task, totalDays: number, minDate: Date, onTaskUpdate: (uid: string, start: string, end: string) => void, onClick: () => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const hasDates = !!(task.start_date && task.end_date);
  const startMs = hasDates ? new Date(task.start_date!).getTime() : 0;
  const endMs = hasDates ? new Date(task.end_date!).getTime() : 0;
  
  const [draftStart, setDraftStart] = useState(startMs);
  const [draftEnd, setDraftEnd] = useState(endMs);
  const [mode, setMode] = useState<"idle" | "move" | "resize">("idle");
  const dragStartX = useRef(0);
  const initialStart = useRef(0);
  const initialEnd = useRef(0);

  useEffect(() => {
    if (mode === "idle" && hasDates) {
      setDraftStart(new Date(task.start_date!).getTime());
      setDraftEnd(new Date(task.end_date!).getTime());
    }
  }, [task.start_date, task.end_date, mode, hasDates]);

  if (!hasDates) {
    return (
      <button 
        onClick={onClick}
        className="mx-auto text-[9px] font-bold text-accent uppercase tracking-widest bg-accent/5 px-4 py-2 rounded-xl border border-accent/20 hover:bg-accent hover:text-white hover:shadow-[0_0_15px_var(--accent-glow)] transition-all duration-300 hover:-translate-y-1"
      >
        Initialize Timeline Protocol
      </button>
    );
  }

  const msPerPixel = containerRef.current 
    ? (totalDays * 24 * 60 * 60 * 1000) / containerRef.current.offsetWidth 
    : 0;

  const handlePointerDown = (e: React.PointerEvent, dragMode: "move" | "resize") => {
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
    
    const deltaDays = Math.round(deltaMs / (24 * 60 * 60 * 1000));
    const snappedDeltaMs = deltaDays * 24 * 60 * 60 * 1000;

    if (mode === "move") {
      setDraftStart(initialStart.current + snappedDeltaMs);
      setDraftEnd(initialEnd.current + snappedDeltaMs);
    } else if (mode === "resize") {
      const newEnd = initialEnd.current + snappedDeltaMs;
      if (newEnd >= draftStart) {
        setDraftEnd(newEnd);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (mode === "idle") return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    if (draftStart !== startMs || draftEnd !== endMs) {
      const format = (ms: number) => new Date(ms).toISOString().split('T')[0];
      onTaskUpdate(task.uid, format(draftStart), format(draftEnd));
    }
    setMode("idle");
  };

  const taskDays = Math.max(1, Math.ceil((draftEnd - draftStart) / (1000 * 60 * 60 * 24)));
  const offsetDays = Math.ceil((draftStart - minDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const width = `${(taskDays / totalDays) * 100}%`;
  const left = `${(offsetDays / totalDays) * 100}%`;

  return (
    <div 
      ref={containerRef}
      className="flex-1 relative h-12 bg-surface-100/30 dark:bg-surface-800/30 rounded-2xl border border-dashed border-surface-200/50 flex items-center px-2 group/track"
    >
      <div 
        onPointerDown={(e) => handlePointerDown(e, "move")}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`absolute h-8 rounded-xl transition-all duration-200 cursor-grab active:cursor-grabbing flex items-center px-4 group/bar hover:-translate-y-[2px] ${
          task.status === "DONE" 
            ? "bg-emerald-500/80 backdrop-blur-md shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-400/50" 
            : task.status === "WIP" 
              ? "bg-accent/80 backdrop-blur-md shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)] border border-accent/50" 
              : "bg-surface-800/80 dark:bg-surface-200/80 backdrop-blur-md shadow-xl border border-surface-400/50"
        }`}
        style={{ width, left, touchAction: "none" }}
      >
        <div onClick={(e) => { e.stopPropagation(); onClick(); }} className="flex-1 truncate">
          <span className="text-[10px] text-white font-extrabold uppercase tracking-widest">{task.status}</span>
        </div>
        
        <div 
          onPointerDown={(e) => handlePointerDown(e, "resize")}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="absolute right-0 top-0 bottom-0 w-5 cursor-col-resize hover:bg-black/20 dark:hover:bg-white/20 rounded-r-xl flex items-center justify-center group/handle transition-colors"
        >
          <div className="w-1.5 h-4 border-l-2 border-r-2 border-white/50 group-hover/handle:border-white transition-colors" />
        </div>
      </div>
    </div>
  );
};

export const GanttTab: React.FC = () => {
  const { project, updateTaskDates, setActiveTask } = useProjectStore();

  if (!project || !project.tasks || project.tasks.length === 0) {
    return <div className="p-8 text-center text-surface-400">No tasks to display in Gantt chart.</div>;
  }
  
  const tasksWithDates = project.tasks.filter(t => t.start_date && t.end_date);
  let minDate: Date;
  let maxDate: Date;

  if (tasksWithDates.length > 0) {
    minDate = new Date(Math.min(...tasksWithDates.map(t => new Date(t.start_date!).getTime())));
    maxDate = new Date(Math.max(...tasksWithDates.map(t => new Date(t.end_date!).getTime())));
    // Add padding
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);
  } else {
    minDate = new Date();
    maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
  }

  const totalDays = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));

  const handleTaskUpdate = async (taskId: string, start: string, end: string) => {
    updateTaskDates(taskId, start, end);
  };

  // Group tasks by Phase
  const phasesMap = new Map<string, Task[]>();
  project.tasks.forEach(task => {
    const phaseName = task.phase_name || "Unphased";
    if (!phasesMap.has(phaseName)) phasesMap.set(phaseName, []);
    phasesMap.get(phaseName)!.push(task);
  });
  const groupedPhases = Array.from(phasesMap.entries());

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full overflow-x-auto bg-surface-50/40 dark:bg-surface-900/40 backdrop-blur-3xl p-10 rounded-[2.5rem] border border-white/10 shadow-2xl shadow-black/5"
    >
      <div className="min-w-[1200px] relative z-10">
        {/* Full Height Grid Overlay */}
        <div className="absolute inset-0 top-16 pointer-events-none flex z-0 opacity-20">
          <div className="w-1/4 pr-10" /> {/* Spacer for titles */}
          <div className="flex-1 flex justify-between px-2">
            {[0, 0.25, 0.5, 0.75, 1].map(p => (
               <div key={p} className="w-px h-full bg-surface-300 dark:bg-surface-600" />
            ))}
          </div>
        </div>

        {/* Timeline Header */}
        <div className="flex border-b border-surface-200/50 pb-6 mb-8 relative z-10">
          <div className="w-1/4 pr-10">
            <h3 className="text-xl font-bold text-primary tracking-tight">Project Phases</h3>
            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-[0.2em] mt-1">Timeline Orchestration</p>
          </div>
          <div className="flex-1 relative h-10">
            <div className="absolute inset-0 flex justify-between px-2">
              {[0, 0.25, 0.5, 0.75, 1].map(p => {
                const d = new Date(minDate.getTime() + (maxDate.getTime() - minDate.getTime()) * p);
                return (
                  <div key={p} className="flex flex-col items-center">
                    <span className="text-[9px] font-extrabold text-surface-400 uppercase tracking-widest px-2 py-1 bg-surface-100/50 rounded-md backdrop-blur-md">
                      {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <div className="w-px h-3 bg-surface-300 dark:bg-surface-600 mt-2" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Task Rows Grouped by Phase */}
        <div className="space-y-12 relative z-10">
          {groupedPhases.map(([phaseName, phaseTasks], phaseIdx) => (
            <motion.div 
              key={phaseName} 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: phaseIdx * 0.1 }}
              className="space-y-4"
            >
              <div className="sticky left-0 w-max z-20">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-surface-500 bg-surface-100/80 backdrop-blur-xl px-4 py-2 rounded-xl border border-surface-200/50 shadow-sm inline-block">
                  {phaseName}
                </h4>
              </div>
              
              <div className="space-y-6 mt-4">
                {phaseTasks.map((task) => (
                  <div key={task.uid} className="flex items-center group relative z-10">
                    <div className="w-1/4 pr-10 py-2">
                      <div className="flex items-baseline gap-2">
                        <h4 className="text-sm font-bold text-primary truncate group-hover:text-accent transition-colors">{task.title}</h4>
                        {task.zone_name && <span className="text-[10px] font-bold text-surface-400 uppercase truncate">({task.zone_name})</span>}
                      </div>
                      <p className="text-[9px] font-bold text-surface-400 uppercase tracking-tighter mt-0.5">
                        {task.start_date && task.end_date ? `${task.start_date} → ${task.end_date}` : "Timeline Not Defined"}
                      </p>
                    </div>
                    <GanttTaskBar 
                      task={task} 
                      totalDays={totalDays} 
                      minDate={minDate} 
                      onTaskUpdate={handleTaskUpdate} 
                      onClick={() => setActiveTask(task)} 
                    />
                    <div className="ml-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setActiveTask(task)}
                        className="w-10 h-10 rounded-xl bg-surface-200/50 backdrop-blur-md border border-surface-300 text-surface-500 hover:scale-110 hover:text-primary transition-all flex items-center justify-center text-xs shadow-sm hover:shadow-md"
                      >
                        ⚙️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
