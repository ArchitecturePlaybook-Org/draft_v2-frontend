"use client";

import React, { useState, useEffect } from "react";
import { format, isSameDay } from "date-fns";
import { useRouter } from "next/navigation";
import { eventsApi, Event } from "@/domains/events/api";
import { projectsApi } from "@/domains/projects/api";
import { Task, Project } from "@/types/projects";
import { CreateEventModal } from "@/components/events/CreateEventModal";
import { FullCalendarView } from "@/components/calendar/FullCalendarView";
import { 
  Calendar as CalendarIcon, 
  CheckSquare, 
  FolderGit2, 
  Plus, 
  X, 
  Video, 
  Sparkles 
} from "lucide-react";

interface CalendarSidePanelDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CalendarSidePanelDrawer({ isOpen, onClose }: CalendarSidePanelDrawerProps) {
  const router = useRouter();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showMeetings, setShowMeetings] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [showProjects, setShowProjects] = useState(true);

  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async () => {
    if (!isOpen) return;
    setIsLoading(true);
    try {
      const [eventsData, tasksData, projectsData] = await Promise.all([
        eventsApi.listEvents(),
        projectsApi.getTasks(),
        projectsApi.getProjects(),
      ]);
      setEvents(Array.isArray(eventsData) ? eventsData : (eventsData as any).results || []);
      setTasks(Array.isArray(tasksData) ? tasksData : (tasksData as any).results || []);
      setProjects(Array.isArray(projectsData) ? projectsData : (projectsData as any).results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  const isDateInRange = (dateToCheck: Date, startStr?: string | null, endStr?: string | null) => {
    if (!startStr && !endStr) return false;
    const target = new Date(dateToCheck.getFullYear(), dateToCheck.getMonth(), dateToCheck.getDate()).getTime();

    if (startStr && endStr) {
      const sDate = new Date(startStr);
      const eDate = new Date(endStr);
      if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime())) {
        const s = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate()).getTime();
        const e = new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate(), 23, 59, 59).getTime();
        return target >= s && target <= e;
      }
    }

    if (startStr) {
      const sDate = new Date(startStr);
      if (!isNaN(sDate.getTime())) return isSameDay(sDate, dateToCheck);
    }

    if (endStr) {
      const eDate = new Date(endStr);
      if (!isNaN(eDate.getTime())) return isSameDay(eDate, dateToCheck);
    }

    return false;
  };

  // Filter items for selected date
  const dayEvents = showMeetings ? events.filter(e => isDateInRange(selectedDate, (e as any).start_date || e.event_date, (e as any).end_date || e.event_date)) : [];
  const dayTasks = showTasks ? tasks.filter(t => isDateInRange(selectedDate, t.start_date, t.due_date || t.end_date)) : [];
  const dayProjects = showProjects ? projects.filter(p => p.created_at && isSameDay(new Date(p.created_at), selectedDate)) : [];

  const totalItems = dayEvents.length + dayTasks.length + dayProjects.length;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in" onClick={onClose}>
        <div className="w-full md:w-[95%] lg:w-[92%] xl:w-[90%] max-w-[1700px] bg-surface-card border-l border-surface-200 dark:border-white/10 h-full flex flex-col shadow-2xl relative overflow-hidden animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
          
          {/* Header */}
          <div className="p-3 px-5 border-b border-surface-200 dark:border-white/10 bg-surface-50/90 dark:bg-surface-900/90 backdrop-blur-md flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center border border-accent/20 shrink-0">
                <CalendarIcon className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-xs font-black text-primary dark:text-white tracking-tight flex items-center gap-1.5 uppercase">
                Calendar Schedule
                <Sparkles className="w-3 h-3 text-accent animate-pulse" />
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="p-1.5 px-3 rounded-lg bg-accent hover:bg-accent/90 text-background font-black text-[10px] uppercase tracking-widest transition-colors shadow-sm cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3 h-3 stroke-[3]" /> Add Event
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-surface-200/60 dark:bg-white/5 hover:bg-surface-300 dark:hover:bg-white/10 text-surface-600 dark:text-white/70 font-bold flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Two-Column split body */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden h-full">
            
            {/* Left Column: FullCalendar View (Full Height) */}
            <div className="flex-1 h-full p-4 bg-surface-50/30 dark:bg-[#0b0f19]/30 border-r border-surface-200 dark:border-white/10 overflow-hidden flex flex-col">
              {isLoading ? (
                <div className="text-center text-xs text-surface-400 py-16 font-black uppercase tracking-widest animate-pulse">
                  Loading FullCalendar...
                </div>
              ) : (
                <FullCalendarView tasks={tasks} events={events} projects={projects} onDateSelect={setSelectedDate} />
              )}
            </div>

            {/* Right Side Column: Agenda & Selected Date Items List */}
            <div className="w-full lg:w-80 xl:w-96 flex flex-col overflow-hidden bg-surface-card shrink-0">
              {/* Selected Date Header & Filter Chips */}
              <div className="px-5 py-4 border-b border-surface-200 dark:border-white/10 shrink-0 bg-surface-50/50 dark:bg-surface-900/50 flex flex-col gap-3">
                <h3 className="text-xs font-black text-primary dark:text-white/95 uppercase tracking-widest flex items-center gap-2">
                  <span>📅</span> {format(selectedDate, "EEEE, MMM d, yyyy")}
                </h3>
                
                {/* Filter Chips */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMeetings(!showMeetings)}
                    className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all duration-200 flex items-center gap-1.5 focus:outline-none cursor-pointer ${
                      showMeetings
                        ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.12)]"
                        : "border-surface-200 dark:border-white/5 text-surface-400 bg-transparent hover:text-primary dark:hover:text-white"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    Meetings
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTasks(!showTasks)}
                    className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all duration-200 flex items-center gap-1.5 focus:outline-none cursor-pointer ${
                      showTasks
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.12)]"
                        : "border-surface-200 dark:border-white/5 text-surface-400 bg-transparent hover:text-primary dark:hover:text-white"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Tasks
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowProjects(!showProjects)}
                    className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all duration-200 flex items-center gap-1.5 focus:outline-none cursor-pointer ${
                      showProjects
                        ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.12)]"
                        : "border-surface-200 dark:border-white/5 text-surface-400 bg-transparent hover:text-primary dark:hover:text-white"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    Projects
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {isLoading ? (
                  <div className="text-center text-xs text-surface-400 py-12 font-black uppercase tracking-widest animate-pulse">Loading items...</div>
                ) : totalItems === 0 ? (
                  <div className="text-center text-xs text-surface-400 py-12 font-black">No schedule items for this day.</div>
                ) : (
                  <>
                    {dayEvents.map((evt, i) => (
                      <div 
                        key={`evt-${i}`} 
                        className="p-3 rounded-xl border border-red-500/10 dark:border-red-500/5 bg-red-500/[0.03] dark:bg-red-500/[0.015] hover:bg-red-500/[0.05] dark:hover:bg-red-500/[0.03] border-l-4 border-l-red-500 flex flex-col gap-1.5 transition-all hover:-translate-y-0.5 duration-200 shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Video className="w-4 h-4 text-red-500 shrink-0" />
                            <span className="text-xs font-black text-primary dark:text-white/90 leading-tight">{evt.title}</span>
                          </div>
                          <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 shrink-0">{evt.event_type}</span>
                        </div>
                      </div>
                    ))}
                    
                    {dayTasks.map((task, i) => (
                      <div 
                        key={`task-${i}`} 
                        onClick={() => {
                          onClose();
                          if (task.project_uid) router.push(`/dashboard/projects/${task.project_uid}?tab=data_hub`);
                        }}
                        className="p-3 rounded-xl border border-emerald-500/10 dark:border-emerald-500/5 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.015] hover:bg-emerald-500/[0.05] dark:hover:bg-emerald-500/[0.03] border-l-4 border-l-emerald-500 flex flex-col gap-1.5 cursor-pointer transition-all hover:-translate-y-0.5 duration-200 group shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="text-xs font-black text-primary dark:text-white/90 leading-tight group-hover:text-emerald-500 transition-colors">{task.title}</span>
                          </div>
                          <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 shrink-0">{task.status}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 ml-6 text-[9px] font-bold">
                          {task.project_title && (
                            <span className="opacity-60 uppercase tracking-widest text-surface-400 dark:text-white/40">Project: {task.project_title}</span>
                          )}
                          {(task.start_date || task.due_date || task.end_date) && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-extrabold uppercase tracking-wider flex items-center gap-1">
                              <span>📊 Timeline:</span>
                              <span>
                                {task.start_date && (task.due_date || task.end_date)
                                  ? `${task.start_date} → ${task.due_date || task.end_date}`
                                  : task.start_date
                                    ? `Start: ${task.start_date}`
                                    : `Due: ${task.due_date || task.end_date}`}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                    {dayProjects.map((proj, i) => (
                      <div 
                        key={`proj-${i}`} 
                        onClick={() => {
                          onClose();
                          router.push(`/dashboard/projects/${proj.uid}`);
                        }}
                        className="p-3 rounded-xl border border-indigo-500/10 dark:border-indigo-500/5 bg-indigo-500/[0.03] dark:bg-indigo-500/[0.015] hover:bg-indigo-500/[0.05] dark:hover:bg-indigo-500/[0.03] border-l-4 border-l-indigo-500 flex flex-col gap-1.5 cursor-pointer transition-all hover:-translate-y-0.5 duration-200 group shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <FolderGit2 className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span className="text-xs font-black text-primary dark:text-white/90 leading-tight group-hover:text-indigo-500 transition-colors">{proj.title}</span>
                          </div>
                          <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 shrink-0">{proj.status}</span>
                        </div>
                        {proj.client_name && (
                          <span className="text-[9px] font-bold opacity-60 ml-6 uppercase tracking-widest truncate text-surface-400 dark:text-white/40">Client: {proj.client_name}</span>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>

      <CreateEventModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={() => {
          setIsCreateModalOpen(false);
          loadData();
        }} 
      />
    </>
  );
}
