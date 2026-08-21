"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { eventsApi, Event } from "@/domains/events/api";
import { projectsApi } from "@/domains/projects/api";
import { Task, Project } from "@/types/projects";
import { CreateEventModal } from "@/components/events/CreateEventModal";
import { FullCalendarView } from "@/components/calendar/FullCalendarView";
import { GanttChartView } from "@/components/projects/GanttChartView";
import { motion, Variants } from "framer-motion";

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

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<"calendar" | "gantt">("calendar");
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadData = async () => {
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
  }, []);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 max-w-7xl mx-auto py-8"
    >
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-primary mb-3 tracking-tighter">Calendar & Schedule</h1>
          <p className="text-surface-400 font-bold uppercase tracking-widest text-[10px] leading-relaxed max-w-2xl">
            Upcoming architectural milestones, meetings, tasks, and project timelines.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-surface-100/60 dark:bg-white/5 border border-surface-200 dark:border-white/10 rounded-xl shadow-xs">
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === "calendar"
                  ? "bg-accent text-background shadow-xs"
                  : "text-surface-400 hover:text-primary dark:hover:text-white"
              }`}
            >
              📅 Full Calendar
            </button>
            <button
              onClick={() => setViewMode("gantt")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === "gantt"
                  ? "bg-accent text-background shadow-xs"
                  : "text-surface-400 hover:text-primary dark:hover:text-white"
              }`}
            >
              📊 Gantt Chart
            </button>
          </div>
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-accent hover:bg-accent text-background font-black uppercase tracking-[0.2em] text-[10px] h-10 px-6 shadow-[0_0_15px_rgba(var(--color-accent),0.4)] transition-all"
          >
            <span className="text-sm mr-2 leading-none">+</span> New Event
          </Button>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="text-center py-20 text-xs font-black uppercase tracking-widest text-surface-400 animate-pulse">
          Loading Calendar Schedule...
        </div>
      ) : viewMode === "calendar" ? (
        <motion.div variants={itemVariants}>
          <FullCalendarView tasks={tasks} events={events} projects={projects} />
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="bg-surface-card border border-surface-200 dark:border-white/10 rounded-3xl p-6 shadow-xl">
          <GanttChartView tasks={tasks} onTaskClick={() => {}} onTasksChanged={loadData} />
        </motion.div>
      )}

      <CreateEventModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={() => {
          setIsCreateModalOpen(false);
          loadData();
        }} 
      />
    </motion.div>
  );
}
