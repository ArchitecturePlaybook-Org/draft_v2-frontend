"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { eventsApi, Event } from "@/domains/events/api";

export default function CalendarPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await eventsApi.listEvents();
        // Handle pagination response if present
        const paginatedData = data as { results?: Event[] } | Event[];
        const items = Array.isArray(paginatedData) ? paginatedData : paginatedData?.results || [];
        setEvents(items);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  // Dummy calendar grid
  const dates = Array.from({ length: 35 }, (_, i) => i - 2);



  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-primary mb-3 tracking-tight">Calendar</h1>
          <p className="text-surface-600 leading-relaxed">
            Upcoming architectural milestones, meetings, and project deadlines.
          </p>
        </div>
        <Button leftIcon={<span className="text-xl">+</span>}>
          New Event
        </Button>
      </div>

      <div className="bg-white border border-surface-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-200">
          <h2 className="text-xl font-bold text-primary">November 2026</h2>
          <div className="flex gap-2">
            <button className="p-2 border border-surface-200 rounded hover:bg-surface-50 transition-colors">&larr;</button>
            <button className="px-4 py-2 text-sm font-bold border border-surface-200 rounded hover:bg-surface-50 transition-colors">Today</button>
            <button className="p-2 border border-surface-200 rounded hover:bg-surface-50 transition-colors">&rarr;</button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-surface-200 bg-surface-50">
          {days.map(day => (
            <div key={day} className="py-3 text-center text-[11px] font-bold text-surface-600 uppercase tracking-widest border-r border-surface-200 last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {dates.map((date, idx) => {
            const isCurrentMonth = date > 0 && date <= 30;
            const displayDate = date > 30 ? date - 30 : date <= 0 ? 31 + date : date;
            
            // Assuming event_date is string like YYYY-MM-DD
            const dayEvents = isCurrentMonth ? events.filter(e => {
                if (!e.event_date) return false;
                const eDate = new Date(e.event_date);
                return eDate.getDate() === date;
            }) : [];

            return (
              <div 
                key={idx} 
                className={`min-h-[120px] p-2 border-r border-b border-surface-200 last:border-r-0 transition-colors hover:bg-surface-50 cursor-pointer ${
                  !isCurrentMonth ? "bg-surface-50/50 opacity-50" : "bg-white"
                }`}
              >
                <div className="flex justify-end">
                  <span className={`text-sm font-medium ${date === 15 ? "bg-primary text-white w-6 h-6 flex items-center justify-center rounded-full" : "text-surface-600"}`}>
                    {displayDate}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  {dayEvents.map((evt, i) => (
                    <div 
                      key={i} 
                      className={`text-[10px] font-bold px-2 py-1 rounded truncate ${
                        evt.event_type === 'deadline' ? 'bg-red-100 text-red-700' :
                        evt.event_type === 'meeting' ? 'bg-accent/10 text-accent' :
                        'bg-surface-200 text-primary'
                      }`}
                    >
                      {evt.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
