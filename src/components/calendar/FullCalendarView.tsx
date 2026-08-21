"use client";

import React, { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Task, Project } from "@/types/projects";
import { Event } from "@/domains/events/api";
import { useRouter } from "next/navigation";

interface FullCalendarViewProps {
  tasks: Task[];
  events: Event[];
  projects: Project[];
  onDateSelect?: (date: Date) => void;
}

export const FullCalendarView: React.FC<FullCalendarViewProps> = ({ tasks, events, projects, onDateSelect }) => {
  const router = useRouter();

  const calendarEvents = useMemo(() => {
    const formatted: any[] = [];

    // Process tasks
    tasks.forEach((task) => {
      const startStr = task.start_date || task.due_date || task.end_date;
      const endStr = task.due_date || task.end_date;

      if (!startStr) return;

      let endFormatted = undefined;
      if (endStr) {
        const d = new Date(endStr);
        d.setDate(d.getDate() + 1); // FullCalendar end date is exclusive for allDay events
        endFormatted = d.toISOString().split("T")[0];
      }

      formatted.push({
        id: `task-${task.uid}`,
        title: `☑ ${task.title}`,
        start: startStr,
        end: endFormatted || startStr,
        allDay: true,
        backgroundColor: (task.status as string) === "DONE" || (task.status as string) === "completed" ? "#10b981" : (task.status as string) === "WIP" || (task.status as string) === "in_progress" ? "#f59e0b" : "#6366f1",
        borderColor: "transparent",
        textColor: "#ffffff",
        extendedProps: {
          type: "task",
          projectUid: task.project_uid,
          task,
        },
      });
    });

    // Process events
    events.forEach((evt) => {
      const startStr = evt.event_date || (evt as any).start_date;
      if (!startStr) return;

      formatted.push({
        id: `evt-${evt.id}`,
        title: `📅 ${evt.title}`,
        start: startStr,
        end: (evt as any).end_date,
        allDay: true,
        backgroundColor: evt.event_type === "deadline" ? "#ef4444" : evt.event_type === "meeting" ? "#3b82f6" : "#8b5cf6",
        borderColor: "transparent",
        textColor: "#ffffff",
        extendedProps: {
          type: "event",
          event: evt,
        },
      });
    });

    // Process projects
    projects.forEach((proj) => {
      if (!proj.created_at) return;
      const startStr = proj.created_at.split("T")[0];
      formatted.push({
        id: `proj-${proj.uid}`,
        title: `🏗️ ${proj.title}`,
        start: startStr,
        allDay: true,
        backgroundColor: "#8b5cf6",
        borderColor: "transparent",
        textColor: "#ffffff",
        extendedProps: {
          type: "project",
          projectUid: proj.uid,
        },
      });
    });

    return formatted;
  }, [tasks, events, projects]);

  const handleEventClick = (info: any) => {
    if (info.event.start && onDateSelect) {
      onDateSelect(info.event.start);
    }
    const ext = info.event.extendedProps;
    if (ext.type === "task" && ext.projectUid) {
      router.push(`/dashboard/projects/${ext.projectUid}?tab=data_hub`);
    } else if (ext.type === "project" && ext.projectUid) {
      router.push(`/dashboard/projects/${ext.projectUid}`);
    }
  };

  const handleDateClick = (info: any) => {
    if (info.date && onDateSelect) {
      onDateSelect(info.date);
    }
  };

  return (
    <div className="fullcalendar-custom-container h-full flex flex-col bg-surface-card border border-surface-200 dark:border-white/10 p-5 rounded-3xl shadow-xl overflow-hidden">
      <style jsx global>{`
        .fullcalendar-custom-container .fc {
          --fc-border-color: rgba(255, 255, 255, 0.08);
          --fc-page-bg-color: transparent;
          --fc-neutral-bg-color: rgba(255, 255, 255, 0.02);
          --fc-list-event-hover-bg-color: rgba(255, 255, 255, 0.05);
          font-family: inherit;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .fullcalendar-custom-container .fc-view-harness {
          flex: 1 1 auto;
        }
        .fullcalendar-custom-container .fc-toolbar-title {
          font-size: 1.25rem !important;
          font-weight: 900 !important;
          text-transform: uppercase;
          letter-spacing: -0.025em;
        }
        .fullcalendar-custom-container .fc-button {
          background: rgba(var(--accent-rgb, 99, 102, 241), 0.15) !important;
          border: 1px solid rgba(var(--accent-rgb, 99, 102, 241), 0.3) !important;
          color: var(--color-primary, inherit) !important;
          font-weight: 800 !important;
          font-size: 0.75rem !important;
          text-transform: uppercase !important;
          border-radius: 0.75rem !important;
          padding: 0.4rem 0.8rem !important;
          transition: all 0.2s ease !important;
        }
        .fullcalendar-custom-container .fc-button:hover {
          background: rgba(var(--accent-rgb, 99, 102, 241), 0.3) !important;
        }
        .fullcalendar-custom-container .fc-button-active {
          background: var(--color-accent, #6366f1) !important;
          color: #ffffff !important;
        }
        .fullcalendar-custom-container .fc-event {
          border-radius: 0.5rem !important;
          padding: 3px 6px !important;
          font-size: 0.7rem !important;
          font-weight: 800 !important;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        .fullcalendar-custom-container .fc-event:hover {
          transform: scale(1.01);
          filter: brightness(1.1);
        }
        .fullcalendar-custom-container .fc-col-header-cell {
          padding: 10px 0 !important;
          font-size: 0.7rem !important;
          font-weight: 900 !important;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--color-surface-400, #9ca3af);
        }
      `}</style>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        events={calendarEvents}
        editable={false}
        selectable={true}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        height="100%"
      />
    </div>
  );
};
