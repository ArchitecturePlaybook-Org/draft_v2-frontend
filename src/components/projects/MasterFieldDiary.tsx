"use client";

import React, { useEffect, useState, useMemo } from "react";
import { fetchFromBff } from "@/shared/api/fetchFromBff";
import { toast } from "sonner";
import { DiaryEntryDetail } from "./DiaryEntryDetail";
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

export const MasterFieldDiary: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [entries, setEntries] = useState<any[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEntries();
  }, [projectId]);

  const fetchEntries = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const res = await fetchFromBff<any[]>(`/api/v1/projects/field-diaries/entries/?project_uid=${projectId}`);
      const data = Array.isArray(res) ? res : (res as any).results || [];
      setEntries(data);
      
      // Auto-select today's entry on first load
      const todayStr = new Date().toISOString().split("T")[0];
      const todayEntry = data.find((e: any) => e.entry_date === todayStr);
      if (todayEntry && !selectedEntry) {
        handleDateClick(todayStr, data);
      } else if (!todayEntry && !selectedEntry) {
        // If today's doesn't exist, we select today but it will auto-create
        handleDateClick(todayStr, data);
      }
    } catch (e) {
      console.warn("Failed to fetch entries", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateClick = async (dateStr: string, currentEntries = entries) => {
    let entry = currentEntries.find(e => e.entry_date === dateStr);
    
    if (!entry) {
      const loadId = toast.loading(`Creating diary for ${dateStr}...`);
      try {
        const projRes = await fetchFromBff<any>(`/api/v1/projects/projects/${projectId}/`);
        const res = await fetchFromBff<any>('/api/v1/projects/field-diaries/entries/', {
          method: 'POST',
          body: JSON.stringify({
            project: projRes.id,
            entry_date: dateStr,
            weather: "",
            site_conditions: ""
          })
        });
        entry = res;
        setEntries(prev => [res, ...prev]);
        toast.dismiss(loadId);
      } catch (err) {
        toast.error("Failed to create new diary entry.");
        return;
      }
    }
    
    try {
      const freshEntry = await fetchFromBff<any>(`/api/v1/projects/field-diaries/entries/${entry.id}/`);
      setSelectedEntry(freshEntry);
    } catch (e) {
      toast.error("Failed to load details");
    }
  };

  const handleUpdate = () => {
    fetchEntries();
    if (selectedEntry) {
      handleDateClick(selectedEntry.entry_date);
    }
  };

  // Month navigation
  const prevMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonthDate(new Date());
    handleDateClick(new Date().toISOString().split("T")[0]);
  };

  // Generate days in the selected month
  const daysInMonthList = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = daysInMonth; i >= 1; i--) { // Reverse order to show newest at top
      days.push(new Date(year, month, i));
    }
    return days;
  }, [currentMonthDate]);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-h-[1200px] max-w-7xl mx-auto bg-surface-50">
      
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-surface-200 shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-surface-800">Field Diaries</h1>
          <p className="text-sm text-surface-500">Track daily site conditions, labor, and progress.</p>
        </div>
        <button 
          onClick={goToToday}
          className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary font-bold rounded-lg hover:bg-primary/20 transition-colors"
        >
          <CalendarIcon className="w-4 h-4" /> Go to Today
        </button>
      </div>

      {/* Split Panel */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        
        {/* Left Panel: Entry List */}
        <div className="w-full md:w-80 lg:w-96 bg-white border-r border-surface-200 flex flex-col shrink-0">
          
          {/* Month Navigator */}
          <div className="flex justify-between items-center p-4 border-b border-surface-100 bg-surface-50/50">
            <button onClick={prevMonth} className="p-2 hover:bg-surface-200 rounded-full text-surface-500 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <h2 className="font-bold text-surface-700 tracking-wide">
              {currentMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={nextMonth} className="p-2 hover:bg-surface-200 rounded-full text-surface-500 transition-colors"><ChevronRight className="w-5 h-5" /></button>
          </div>

          {/* List of Days */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading && entries.length === 0 ? (
              <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
            ) : (
              daysInMonthList.map((dateObj, i) => {
                const dateStr = dateObj.toISOString().split("T")[0];
                const isToday = dateStr === new Date().toISOString().split("T")[0];
                const entry = entries.find(e => e.entry_date === dateStr);
                const isSelected = selectedEntry?.entry_date === dateStr;
                
                return (
                  <button
                    key={i}
                    onClick={() => handleDateClick(dateStr)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isSelected 
                        ? "bg-primary text-white border-primary shadow-md" 
                        : isToday
                          ? "bg-primary/5 border-primary/30 hover:bg-primary/10"
                          : "bg-white border-surface-200 hover:border-surface-300 hover:bg-surface-50"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`font-bold ${isSelected ? 'text-white' : 'text-surface-800'}`}>
                        {dateObj.toLocaleString('default', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {isToday && " (Today)"}
                      </span>
                      {entry && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          isSelected 
                            ? 'bg-white/20 text-white' 
                            : entry.status === 'signed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {entry.status}
                        </span>
                      )}
                    </div>
                    
                    {entry ? (
                      <div className={`text-xs mt-2 flex gap-3 ${isSelected ? 'text-primary-100' : 'text-surface-500'}`}>
                        {entry.activities?.length > 0 && <span>{entry.activities.length} tasks</span>}
                        {entry.labor_entries?.length > 0 && <span>{entry.labor_entries.length} crews</span>}
                        {entry.weather_delay && <span className="font-bold text-red-400">Delay</span>}
                        {!entry.activities?.length && !entry.labor_entries?.length && <span>No activity logged</span>}
                      </div>
                    ) : (
                      <div className={`text-xs mt-2 font-medium flex items-center gap-1 ${isSelected ? 'text-primary-100' : 'text-surface-400'}`}>
                        <Plus className="w-3 h-3" /> Create Entry
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Detail View */}
        <div className="flex-1 bg-surface-50 overflow-y-auto p-4 md:p-6">
          {selectedEntry ? (
            <div className="max-w-4xl mx-auto">
               <DiaryEntryDetail 
                 entry={selectedEntry} 
                 projectId={projectId} 
                 onUpdate={handleUpdate} 
               />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-surface-400">
               <CalendarIcon className="w-16 h-16 mb-4 text-surface-200" />
               <p className="text-lg font-medium">Select a date to view or create a field diary</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
