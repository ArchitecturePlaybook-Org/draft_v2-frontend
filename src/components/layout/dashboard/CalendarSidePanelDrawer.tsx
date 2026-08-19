"use client";

import React, { useState, useEffect } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { useRouter } from "next/navigation";
import { eventsApi, Event } from "@/domains/events/api";
import { projectsApi } from "@/domains/projects/api";
import { Task, Project } from "@/types/projects";
import { CreateEventModal } from "@/components/events/CreateEventModal";

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
      <div className="fixed inset-0 z-[100] flex justify-end bg-black/50 backdrop-blur-xs animate-fade-in select-none" onClick={onClose}>
        <div className="w-full max-w-sm bg-surface-card border-l border-surface-200 dark:border-surface-800 h-full flex flex-col shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
          
          {/* Header */}
          <div className="p-4 border-b border-surface-200 dark:border-surface-800 bg-surface-50/90 dark:bg-surface-900/90 backdrop-blur-md flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent/20 text-accent flex items-center justify-center font-bold text-sm border border-accent/30 shrink-0">
                📅
              </div>
              <div>
                <h2 className="text-sm font-black text-primary tracking-tight">Agenda</h2>
                <p className="text-[10px] text-surface-400 font-bold uppercase tracking-widest">Schedule & Milestones</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="p-1.5 px-3 rounded-lg bg-accent hover:bg-accent/90 text-background font-black text-[10px] uppercase tracking-widest transition-colors shadow-sm cursor-pointer"
              >
                + Add
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-surface-200/60 dark:bg-surface-800 hover:bg-surface-300 text-surface-600 dark:text-surface-300 font-bold flex items-center justify-center text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Mini Calendar */}
          <div className="p-4 border-b border-surface-200 dark:border-surface-800 bg-surface-card shrink-0">
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-1 text-surface-400 hover:text-primary transition-colors text-sm font-bold cursor-pointer">&larr;</button>
              <span className="text-xs font-black uppercase tracking-widest text-primary">
                {format(currentDate, "MMMM yyyy")}
              </span>
              <button onClick={nextMonth} className="p-1 text-surface-400 hover:text-primary transition-colors text-sm font-bold cursor-pointer">&rarr;</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {daysOfWeek.map(d => (
                <div key={d} className="text-[9px] font-black text-surface-400 uppercase tracking-widest">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
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
                      relative h-8 flex items-center justify-center text-[11px] font-bold rounded-lg cursor-pointer transition-all
                      ${!isCurrentMonth ? "text-surface-300 dark:text-surface-600" : "text-primary"}
                      ${isSelected ? "bg-accent text-white shadow-sm" : "hover:bg-surface-100 dark:hover:bg-surface-800"}
                      ${isToday && !isSelected ? "ring-1 ring-accent text-accent" : ""}
                    `}
                  >
                    {format(date, "d")}
                    {/* Indicator dots */}
                    <div className="absolute bottom-0.5 flex gap-0.5">
                      {hasE && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-red-400'}`} />}
                      {hasT && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-success'}`} />}
                      {hasP && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-400'}`} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          <div className="px-4 py-3 flex gap-2 border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900 shrink-0 overflow-x-auto no-scrollbar">
            <label className="flex items-center gap-1.5 shrink-0 cursor-pointer text-[10px] font-black uppercase tracking-widest text-surface-600 hover:text-primary">
              <input type="checkbox" checked={showMeetings} onChange={e => setShowMeetings(e.target.checked)} className="accent-red-500 rounded-sm w-3 h-3 cursor-pointer" />
              Meetings
            </label>
            <label className="flex items-center gap-1.5 shrink-0 cursor-pointer text-[10px] font-black uppercase tracking-widest text-surface-600 hover:text-primary">
              <input type="checkbox" checked={showTasks} onChange={e => setShowTasks(e.target.checked)} className="accent-success rounded-sm w-3 h-3 cursor-pointer" />
              Tasks
            </label>
            <label className="flex items-center gap-1.5 shrink-0 cursor-pointer text-[10px] font-black uppercase tracking-widest text-surface-600 hover:text-primary">
              <input type="checkbox" checked={showProjects} onChange={e => setShowProjects(e.target.checked)} className="accent-indigo-500 rounded-sm w-3 h-3 cursor-pointer" />
              Projects
            </label>
          </div>

          {/* Selected Date Header */}
          <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-800 shrink-0">
            <h3 className="text-xs font-black text-primary uppercase tracking-widest">
              {format(selectedDate, "EEEE, MMM d, yyyy")}
            </h3>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-50/40 dark:bg-surface-900/30">
            {isLoading ? (
              <div className="text-center text-xs text-surface-400 py-8 font-black uppercase tracking-widest animate-pulse">Loading...</div>
            ) : totalItems === 0 ? (
              <div className="text-center text-xs text-surface-400 py-8 font-black">No schedule for this day.</div>
            ) : (
              <>
                {dayEvents.map((evt, i) => (
                  <div key={`evt-${i}`} className="p-3 rounded-xl border shadow-sm bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 flex flex-col gap-1 transition-all hover:border-red-500/40">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black truncate">{evt.title}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-red-500/20">{evt.event_type}</span>
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
                    className="p-3 rounded-xl border shadow-sm bg-success/10 text-success border-success/20 flex flex-col gap-1 cursor-pointer transition-all hover:bg-success/20 hover:border-success/40 group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] shrink-0">☑</span>
                      <span className="text-xs font-black truncate group-hover:text-success-600">{task.title}</span>
                    </div>
                    {task.project_uid && (
                      <span className="text-[9px] font-bold opacity-70 ml-5 uppercase tracking-widest truncate">Project: {task.project_uid.substring(0,8)}</span>
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
                    className="p-3 rounded-xl border shadow-sm bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 flex flex-col gap-1 cursor-pointer transition-all hover:bg-indigo-500/20 hover:border-indigo-500/40 group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] shrink-0">🏗️</span>
                      <span className="text-xs font-black truncate group-hover:text-indigo-500">{proj.title}</span>
                    </div>
                    <span className="text-[9px] font-bold opacity-70 ml-5 uppercase tracking-widest">Status: {proj.status}</span>
                  </div>
                ))}
              </>
            )}
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
