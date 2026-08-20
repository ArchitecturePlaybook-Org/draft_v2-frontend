"use client";

import React, { useState, useEffect } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { useRouter } from "next/navigation";
import { eventsApi, Event } from "@/domains/events/api";
import { projectsApi } from "@/domains/projects/api";
import { Task, Project } from "@/types/projects";
import { CreateEventModal } from "@/components/events/CreateEventModal";
import { 
  Calendar as CalendarIcon, 
  CheckSquare, 
  FolderGit2, 
  ChevronLeft, 
  ChevronRight, 
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
  
  const [currentDate, setCurrentDate] = useState(new Date());
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

  // Calendar Math
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const dates = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  
  const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Filter items for selected date
  const dayEvents = showMeetings ? events.filter(e => e.event_date && isSameDay(new Date(e.event_date), selectedDate)) : [];
  const dayTasks = showTasks ? tasks.filter(t => (t.due_date || t.end_date) && isSameDay(new Date((t.due_date || t.end_date) as string), selectedDate)) : [];
  const dayProjects = showProjects ? projects.filter(p => p.created_at && isSameDay(new Date(p.created_at), selectedDate)) : [];

  const totalItems = dayEvents.length + dayTasks.length + dayProjects.length;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in" onClick={onClose}>
        <div className="w-full md:w-2/3 bg-surface-card border-l border-surface-200 dark:border-white/10 h-full flex flex-col shadow-2xl relative overflow-hidden animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
          
          {/* Header */}
          <div className="p-4 border-b border-surface-200 dark:border-white/10 bg-surface-50/90 dark:bg-surface-900/90 backdrop-blur-md flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center border border-accent/20 shrink-0">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-primary dark:text-white tracking-tight flex items-center gap-1.5">
                  Agenda 
                  <Sparkles className="w-3 h-3 text-accent animate-pulse" />
                </h2>
                <p className="text-[10px] text-surface-400 dark:text-white/40 font-bold uppercase tracking-widest">Schedule & Milestones</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="p-1.5 px-3 rounded-lg bg-accent hover:bg-accent/90 text-background font-black text-[10px] uppercase tracking-widest transition-colors shadow-sm cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3 h-3 stroke-[3]" /> Add
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
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* Left side: Mini Calendar */}
            <div className="w-full md:w-[420px] md:border-r border-surface-200 dark:border-white/10 flex flex-col shrink-0 bg-surface-card">
              
              {/* Mini Calendar */}
              <div className="p-5 bg-surface-card shrink-0">
                <div className="flex items-center justify-between mb-5">
                  <button onClick={prevMonth} className="p-1.5 text-surface-400 hover:text-primary dark:hover:text-white transition-colors cursor-pointer">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-black uppercase tracking-wider text-primary dark:text-white/90">
                    {format(currentDate, "MMMM yyyy")}
                  </span>
                  <button onClick={nextMonth} className="p-1.5 text-surface-400 hover:text-primary dark:hover:text-white transition-colors cursor-pointer">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1.5 text-center mb-3">
                  {daysOfWeek.map(d => (
                    <div key={d} className="text-[10px] font-black text-surface-400 dark:text-white/30 uppercase tracking-widest">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {dates.map((date, i) => {
                    const isSelected = isSameDay(date, selectedDate);
                    const isCurrentMonth = isSameMonth(date, currentDate);
                    const isToday = isSameDay(date, new Date());
                    
                    // Dots for items
                    const hasE = events.some(e => e.event_date && isSameDay(new Date(e.event_date), date));
                    const hasT = tasks.some(t => (t.due_date || t.end_date) && isSameDay(new Date((t.due_date || t.end_date) as string), date));
                    const hasP = projects.some(p => p.created_at && isSameDay(new Date(p.created_at), date));

                    return (
                      <div 
                        key={i} 
                        onClick={() => setSelectedDate(date)}
                        className={`
                          relative h-12 flex items-center justify-center text-sm font-extrabold rounded-xl cursor-pointer transition-all
                          ${!isCurrentMonth ? "text-surface-300 dark:text-white/20" : "text-primary dark:text-white/80"}
                          ${isSelected ? "bg-accent text-white shadow-md scale-105" : "hover:bg-surface-100 dark:hover:bg-white/[0.04]"}
                          ${isToday && !isSelected ? "ring-2 ring-accent/60 text-accent" : ""}
                        `}
                      >
                        {format(date, "d")}
                        {/* Indicator dots */}
                        <div className="absolute bottom-1.5 flex gap-1 justify-center w-full">
                          {hasE && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-red-400'}`} />}
                          {hasT && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />}
                          {hasP && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-400'}`} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Right side: Selected Day & Agenda list */}
            <div className="flex-1 flex flex-col overflow-hidden bg-surface-50/40 dark:bg-[#0b0f19]/30">
              
              {/* Selected Date Header & Filters */}
              <div className="px-5 py-4 border-b border-surface-200 dark:border-white/10 shrink-0 bg-surface-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-xs font-black text-primary dark:text-white/95 uppercase tracking-widest">
                  {format(selectedDate, "EEEE, MMM d, yyyy")}
                </h3>
                
                {/* Custom Filters */}
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowMeetings(!showMeetings)}
                    className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all duration-200 flex items-center gap-1.5 focus:outline-none ${
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
                    className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all duration-200 flex items-center gap-1.5 focus:outline-none ${
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
                    className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all duration-200 flex items-center gap-1.5 focus:outline-none ${
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
              <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
                {isLoading ? (
                  <div className="text-center text-xs text-surface-400 py-12 font-black uppercase tracking-widest animate-pulse">Loading...</div>
                ) : totalItems === 0 ? (
                  <div className="text-center text-xs text-surface-400 py-12 font-black">No schedule for this day.</div>
                ) : (
                  <>
                    {dayEvents.map((evt, i) => (
                      <div 
                        key={`evt-${i}`} 
                        className="p-3.5 rounded-xl border border-red-500/10 dark:border-red-500/5 bg-red-500/[0.03] dark:bg-red-500/[0.015] hover:bg-red-500/[0.05] dark:hover:bg-red-500/[0.03] border-l-4 border-l-red-500 flex flex-col gap-1.5 transition-all hover:-translate-y-0.5 duration-200 shadow-xs"
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
                        className="p-3.5 rounded-xl border border-emerald-500/10 dark:border-emerald-500/5 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.015] hover:bg-emerald-500/[0.05] dark:hover:bg-emerald-500/[0.03] border-l-4 border-l-emerald-500 flex flex-col gap-1.5 cursor-pointer transition-all hover:-translate-y-0.5 duration-200 group shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="text-xs font-black text-primary dark:text-white/90 leading-tight group-hover:text-emerald-500 transition-colors">{task.title}</span>
                          </div>
                          <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 shrink-0">{task.status}</span>
                        </div>
                        {task.project_title && (
                          <span className="text-[9px] font-bold opacity-60 ml-6 uppercase tracking-widest truncate text-surface-400 dark:text-white/40">Project: {task.project_title}</span>
                        )}
                      </div>
                    ))}

                    {dayProjects.map((proj, i) => (
                      <div 
                        key={`proj-${i}`} 
                        onClick={() => {
                          onClose();
                          router.push(`/dashboard/projects/${proj.uid}`);
                        }}
                        className="p-3.5 rounded-xl border border-indigo-500/10 dark:border-indigo-500/5 bg-indigo-500/[0.03] dark:bg-indigo-500/[0.015] hover:bg-indigo-500/[0.05] dark:hover:bg-indigo-500/[0.03] border-l-4 border-l-indigo-500 flex flex-col gap-1.5 cursor-pointer transition-all hover:-translate-y-0.5 duration-200 group shadow-xs"
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
