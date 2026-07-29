"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { eventsApi, Event } from "@/domains/events/api";
import { projectsApi } from "@/domains/projects/api";
import { Task } from "@/types/projects";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { CreateEventModal } from "@/components/events/CreateEventModal";
import { motion, Variants } from "framer-motion";
import { useRouter } from "next/navigation";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

function DayDetailsModal({
  data,
  onClose,
}: {
  data: { date: Date; events: Event[]; tasks: Task[] } | null;
  onClose: () => void;
}) {
  const router = useRouter();

  if (!data) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md bg-surface-100 border border-surface-200 rounded-xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-surface-200 bg-surface-50/50">
          <h2 className="text-lg font-bold text-primary flex items-center gap-2 tracking-tight">
            <span className="text-accent">📅</span> {format(data.date, "MMMM d, yyyy")}
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-surface-200 text-surface-400 hover:text-primary transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
          {data.events.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1.5">Events</h3>
              {data.events.map((evt, i) => (
                <div key={`modal-evt-${i}`} className={`text-xs font-black p-3 rounded-lg border shadow-sm ${
                  evt.event_type === 'deadline' ? 'bg-red-500/10 text-red-500 border-red-500/20 shadow-red-500/20' :
                  evt.event_type === 'meeting' ? 'bg-accent/10 text-accent border-accent/20 shadow-accent/20' :
                  'bg-surface-500/10 text-primary border-surface-500/20'
                }`}>
                  <div className="flex justify-between items-start">
                    <span>{evt.title}</span>
                    <span className="text-[9px] uppercase opacity-70">{evt.event_type}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {data.tasks.length > 0 && (
            <div className="space-y-2 mt-4">
              <h3 className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1.5">Tasks</h3>
              {data.tasks.map((task, i) => (
                <div 
                  key={`modal-task-${i}`} 
                  onClick={() => task.project_uid && router.push(`/dashboard/projects/${task.project_uid}?tab=data_hub`)}
                  className="text-xs font-black p-3 rounded-lg border shadow-sm bg-success/10 text-success border-success/20 shadow-success/20 hover:bg-success/20 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span className="shrink-0">☑</span> 
                    <div className="flex flex-col">
                      <span>{task.title}</span>
                      <span className="text-[10px] font-bold opacity-70 mt-1">{task.project_uid ? `Project: ${task.project_uid.substring(0,8)}` : ''} - Status: {task.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {data.events.length === 0 && data.tasks.length === 0 && (
            <p className="text-surface-500 text-sm italic text-center">No schedule for this day.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<{ date: Date; events: Event[]; tasks: Task[] } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [eventsData, tasksData] = await Promise.all([
        eventsApi.listEvents(),
        projectsApi.getTasks(),
      ]);
      const eventsList = Array.isArray(eventsData) ? eventsData : (eventsData as any).results || [];
      const tasksList = Array.isArray(tasksData) ? tasksData : (tasksData as any).results || [];
      
      setEvents(eventsList);
      setTasks(tasksList);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dates = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 max-w-7xl mx-auto py-8"
    >
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-primary mb-3 tracking-tighter">Calendar</h1>
          <p className="text-surface-400 font-bold uppercase tracking-widest text-[10px] leading-relaxed max-w-2xl">
            Upcoming architectural milestones, meetings, and project deadlines.
          </p>
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-accent hover:bg-accent text-background font-black uppercase tracking-[0.2em] text-[10px] h-10 px-6 shadow-[0_0_15px_rgba(var(--color-accent),0.4)] transition-all"
          >
            <span className="text-sm mr-2 leading-none">+</span> New Event
          </Button>
        </motion.div>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-surface-50/40 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-[2rem] overflow-hidden shadow-2xl shadow-primary/5 relative">
        <div className="absolute top-0 right-0 w-full h-full arch-grid opacity-[0.03] pointer-events-none mix-blend-overlay" />
        
        {/* Calendar Header */}
        <div className="relative z-10 flex items-center justify-between p-8 border-b border-white/10 bg-surface-900/10">
          <h2 className="text-2xl font-black text-primary tracking-tight">
            {format(currentDate, "MMMM")} <span className="text-surface-400 font-bold">{format(currentDate, "yyyy")}</span>
          </h2>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-surface-400 hover:text-primary">&larr;</button>
            <button onClick={goToToday} className="px-6 py-2 text-[10px] font-black uppercase tracking-widest border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-primary shadow-inner">Today</button>
            <button onClick={nextMonth} className="p-2 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-surface-400 hover:text-primary">&rarr;</button>
          </div>
        </div>

        {/* Days Header */}
        <div className="relative z-10 grid grid-cols-7 border-b border-white/10 bg-surface-900/20">
          {days.map(day => (
            <div key={day} className="py-4 text-center text-[9px] font-black text-surface-400 uppercase tracking-[0.2em] border-r border-white/10 last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="relative z-10 grid grid-cols-7"
        >
          {dates.map((date, idx) => {
            const isCurrentMonth = isSameMonth(date, monthStart);
            const isToday = isSameDay(date, new Date());
            
            // Assuming event_date is string like YYYY-MM-DD
            const dayEvents = events.filter(e => {
                if (!e.event_date) return false;
                const eDate = new Date(e.event_date);
                return isSameDay(eDate, date);
            });

            // Filter tasks where due_date or end_date is the same day
            const dayTasks = tasks.filter(t => {
                const targetDate = t.due_date || t.end_date;
                if (!targetDate) return false;
                const tDate = new Date(targetDate);
                return isSameDay(tDate, date);
            });

            const allItems = [
              ...dayEvents.map(e => ({ type: 'event' as const, data: e })),
              ...dayTasks.map(t => ({ type: 'task' as const, data: t }))
            ];
            
            const displayItems = allItems.slice(0, 3);
            const hiddenCount = allItems.length - 3;

            return (
              <motion.div 
                variants={itemVariants}
                key={idx} 
                onClick={() => setSelectedDay({ date, events: dayEvents, tasks: dayTasks })}
                whileHover={{ scale: 1.02, zIndex: 10 }}
                className={`min-h-[140px] p-3 border-r border-b border-white/10 last:border-r-0 transition-colors hover:bg-white/5 cursor-pointer group relative bg-surface-50/40 backdrop-blur-md ${
                  !isCurrentMonth ? "bg-black/5 dark:bg-black/20 opacity-50" : "bg-transparent"
                }`}
              >
                <div className="flex justify-end mb-2">
                  <span className={`text-[10px] font-black tracking-widest w-7 h-7 flex items-center justify-center rounded-full transition-all ${
                    isToday ? "bg-accent text-background shadow-[0_0_10px_rgba(var(--color-accent),0.8)]" : "text-surface-500 group-hover:text-primary group-hover:bg-white/10"
                  }`}>
                    {format(date, "d")}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {displayItems.map((item, i) => {
                    if (item.type === 'event') {
                      const evt = item.data as Event;
                      return (
                        <div 
                          key={`evt-${i}`} 
                          className={`text-[9px] font-black px-2.5 py-1.5 rounded-md truncate uppercase tracking-[0.1em] border shadow-sm transition-transform hover:scale-[1.02] ${
                            evt.event_type === 'deadline' ? 'bg-red-500/10 text-red-500 border-red-500/20 shadow-red-500/20' :
                            evt.event_type === 'meeting' ? 'bg-accent/10 text-accent border-accent/20 shadow-accent/20' :
                            'bg-surface-500/10 text-primary border-surface-500/20'
                          }`}
                        >
                          {evt.title}
                        </div>
                      );
                    } else {
                      const task = item.data as Task;
                      return (
                        <div 
                          key={`task-${i}`} 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (task.project_uid) {
                              router.push(`/dashboard/projects/${task.project_uid}?tab=data_hub`);
                            }
                          }}
                          className="text-[9px] font-black px-2.5 py-1.5 rounded-md truncate uppercase tracking-[0.1em] border shadow-sm transition-transform hover:scale-[1.02] bg-success/10 text-success border-success/20 shadow-success/20 flex items-center gap-1 hover:bg-success/20 cursor-pointer"
                        >
                          <span className="shrink-0 text-[10px]">☑</span> {task.title}
                        </div>
                      );
                    }
                  })}
                  
                  {hiddenCount > 0 && (
                    <div className="text-[9px] font-black px-2.5 py-1.5 rounded-md uppercase tracking-[0.1em] bg-surface-200/50 text-surface-400 border border-surface-200/50 shadow-sm text-center hover:bg-surface-200 transition-colors">
                      + {hiddenCount} More
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>

      <CreateEventModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={() => {
          setIsCreateModalOpen(false);
          loadData();
        }} 
      />

      <DayDetailsModal 
        data={selectedDay}
        onClose={() => setSelectedDay(null)}
      />
    </motion.div>
  );
}
