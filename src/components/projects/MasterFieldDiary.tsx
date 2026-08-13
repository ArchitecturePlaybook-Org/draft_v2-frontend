"use client";

import React, { useEffect, useState, useMemo } from "react";
import { fetchFromBff } from "@/shared/api/fetchFromBff";
import { toast } from "sonner";
import { DiaryEntryDetail } from "./DiaryEntryDetail";
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { fieldDiaryCache } from "@/domains/projects/fieldDiaryCache";

const getLocalDateString = (date: Date = new Date()) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const MasterFieldDiary: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [entries, setEntries] = useState<any[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEntries();
  }, [projectId]);

  const fetchEntries = async (forceRefresh = false) => {
    if (!projectId) return;
    const cacheKey = `entries_${projectId}`;
    const cachedData = fieldDiaryCache.get<any[]>(cacheKey);

    if (cachedData && !forceRefresh) {
      setEntries(cachedData);
      setIsLoading(false);
      
      const todayStr = getLocalDateString();
      const todayEntry = cachedData.find((e: any) => e.entry_date === todayStr);
      if (todayEntry && !selectedEntry) {
        handleDateClick(todayStr, cachedData);
      } else if (!todayEntry && !selectedEntry) {
        handleDateClick(todayStr, cachedData);
      }
      
      // Silent background revalidation
      fetchFromBff<any[]>(`/api/v1/projects/field-diaries/entries/?project_uid=${projectId}`).then(res => {
        const fresh = Array.isArray(res) ? res : (res as any).results || [];
        setEntries(fresh);
        fieldDiaryCache.set(cacheKey, fresh);
      }).catch(() => {});
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetchFromBff<any[]>(`/api/v1/projects/field-diaries/entries/?project_uid=${projectId}`);
      const data = Array.isArray(res) ? res : (res as any).results || [];
      setEntries(data);
      fieldDiaryCache.set(cacheKey, data);
      
      // Auto-select today's entry on first load
      const todayStr = getLocalDateString();
      const todayEntry = data.find((e: any) => e.entry_date === todayStr);
      if (todayEntry && !selectedEntry) {
        handleDateClick(todayStr, data);
      } else if (!todayEntry && !selectedEntry) {
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
        let targetId = typeof projectId === "number" || (!isNaN(Number(projectId)) && !isNaN(parseFloat(String(projectId)))) ? projectId : null;
        if (!targetId) {
          try {
            const projRes = await fetchFromBff<any>(`/api/v1/projects/projects/${projectId}/`);
            targetId = projRes.id;
          } catch (e) {
            console.warn("Failed to fetch project details:", e);
          }
        }
        if (!targetId) throw new Error("Project ID not found");

        const res = await fetchFromBff<any>('/api/v1/projects/field-diaries/entries/', {
          method: 'POST',
          body: JSON.stringify({
            project: targetId,
            entry_date: dateStr,
            weather: "",
            site_conditions: ""
          })
        });
        entry = res;
        setEntries(prev => {
          const updated = [res, ...prev];
          fieldDiaryCache.set(`entries_${projectId}`, updated);
          return updated;
        });
        toast.dismiss(loadId);
      } catch (err) {
        toast.dismiss(loadId);
        try {
          const refetchRes = await fetchFromBff<any[]>(`/api/v1/projects/field-diaries/entries/?project_uid=${projectId}`);
          const data = Array.isArray(refetchRes) ? refetchRes : (refetchRes as any).results || [];
          setEntries(data);
          fieldDiaryCache.set(`entries_${projectId}`, data);
          entry = data.find((e: any) => e.entry_date === dateStr);
          if (!entry) throw new Error("Entry not found after refetch");
        } catch (e2) {
          toast.error("Failed to create or fetch diary entry.");
          return;
        }
      }
    }
    
    const detailCacheKey = `detail_${entry.id}`;
    const cachedDetail = fieldDiaryCache.get<any>(detailCacheKey);
    if (cachedDetail) {
      setSelectedEntry(cachedDetail);
      fetchFromBff<any>(`/api/v1/projects/field-diaries/entries/${entry.id}/`).then(fresh => {
        setSelectedEntry(fresh);
        fieldDiaryCache.set(detailCacheKey, fresh);
      }).catch(() => {});
      return;
    }

    try {
      const freshEntry = await fetchFromBff<any>(`/api/v1/projects/field-diaries/entries/${entry.id}/`);
      setSelectedEntry(freshEntry);
      fieldDiaryCache.set(detailCacheKey, freshEntry);
    } catch (e) {
      toast.error("Failed to load details");
    }
  };

  const handleUpdate = () => {
    fieldDiaryCache.invalidate(projectId);
    fetchEntries(true);
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
    handleDateClick(getLocalDateString());
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

  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  const handleSelectDateFromModal = (dateStr: string) => {
    handleDateClick(dateStr);
    setIsCalendarModalOpen(false);
  };

  return (
    <div className="flex flex-col w-full min-h-[500px] bg-surface-50 rounded-xl overflow-hidden border border-surface-200 shadow-sm min-w-0">
      
      {/* Header Bar */}
      <div className="flex flex-wrap justify-between items-center px-3.5 py-2.5 bg-surface-100 border-b border-surface-200 shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-bold text-xs shrink-0">
            📖
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-black flex items-center gap-1.5 text-surface-800 truncate">
              Field Diary — {selectedEntry ? selectedEntry.entry_date : getLocalDateString()}
            </h1>
            <p className="text-[10px] text-surface-400 truncate">Log weather, site conditions, labor crews, & deliveries</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={() => setIsCalendarModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-background font-bold text-[10px] uppercase tracking-wider rounded-lg hover:opacity-90 transition-all shadow-sm shadow-accent/20"
          >
            <CalendarIcon className="w-3.5 h-3.5" /> 
            <span>{selectedEntry ? `Date: ${selectedEntry.entry_date}` : "Select Date / Calendar"}</span>
          </button>
          
          <button 
            onClick={goToToday}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-surface-200 text-primary font-bold text-[10px] uppercase tracking-wider rounded-lg hover:bg-surface-300 transition-colors"
          >
            Go to Today
          </button>
        </div>
      </div>

      {/* Main Full-Width Body Focus */}
      <div className="flex-1 min-w-0 bg-surface-50 p-3 sm:p-4 overflow-y-auto">
        {selectedEntry ? (
          <div className="w-full max-w-5xl mx-auto">
             <DiaryEntryDetail 
               entry={selectedEntry} 
               projectId={projectId} 
               onUpdate={handleUpdate} 
             />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-surface-400 min-h-[350px]">
             <CalendarIcon className="w-12 h-12 mb-3 text-surface-300" />
             <p className="text-sm font-bold text-surface-600">No date selected</p>
             <button
               onClick={() => setIsCalendarModalOpen(true)}
               className="mt-3 px-4 py-2 bg-accent text-background font-bold text-xs rounded-xl shadow-md"
             >
               📅 Open Calendar Picker
             </button>
          </div>
        )}
      </div>

      {/* ── CALENDAR DATE PICKER MODAL ── */}
      {isCalendarModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsCalendarModalOpen(false)}
        >
          <div 
            className="bg-surface-card border border-surface-200 rounded-2xl p-4 max-w-sm w-full shadow-2xl relative flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-surface-200 mb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-accent" />
                <h3 className="text-xs font-black uppercase tracking-wider text-primary">Field Diary Calendar</h3>
              </div>
              <button 
                onClick={() => setIsCalendarModalOpen(false)}
                className="w-6 h-6 rounded-full bg-surface-100 hover:bg-red-500 hover:text-white flex items-center justify-center text-surface-400 text-xs transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Month Navigator */}
            <div className="flex justify-between items-center p-2 rounded-lg border border-surface-200 bg-surface-50 mb-3">
              <button onClick={prevMonth} className="p-1 hover:bg-surface-200 rounded-md text-surface-500 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <h4 className="font-extrabold text-xs text-surface-800 tracking-wide">
                {currentMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h4>
              <button onClick={nextMonth} className="p-1 hover:bg-surface-200 rounded-md text-surface-500 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>

            {/* List of Days */}
            <div className="flex-1 overflow-y-auto space-y-1.5 p-0.5 no-scrollbar">
              {isLoading && entries.length === 0 ? (
                <div className="flex justify-center p-6"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
              ) : (
                daysInMonthList.map((dateObj, i) => {
                  const dateStr = getLocalDateString(dateObj);
                  const isToday = dateStr === getLocalDateString();
                  const entry = entries.find(e => e.entry_date === dateStr);
                  const isSelected = selectedEntry?.entry_date === dateStr;
                  
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelectDateFromModal(dateStr)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs flex items-center justify-between ${
                        isSelected 
                          ? "bg-accent text-background border-primary shadow-sm font-bold" 
                          : isToday
                            ? "bg-primary/5 border-primary/30 hover:opacity-90"
                            : "bg-surface-50 border-surface-200 hover:border-accent hover:bg-surface-100"
                      }`}
                    >
                      <div>
                        <span className={`font-bold ${isSelected ? 'text-white' : 'text-surface-800'}`}>
                          {dateObj.toLocaleString('default', { weekday: 'short', month: 'short', day: 'numeric' })}
                          {isToday && " (Today)"}
                        </span>
                        {entry && (
                          <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-primary-100' : 'text-surface-400'}`}>
                            {entry.activities?.length || 0} tasks · {entry.labor_entries?.length || 0} crews
                          </p>
                        )}
                      </div>

                      {entry ? (
                        <div className="flex items-center gap-1 shrink-0">
                          {entry.status !== 'signed' && (
                            <span className="text-[10px] animate-pulse" title="Draft - Unlocked">⚠️</span>
                          )}
                          <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                            isSelected 
                              ? 'bg-surface-100 text-white' 
                              : entry.status === 'signed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {entry.status}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[9px] text-surface-400 font-bold uppercase tracking-wider shrink-0">+ Create</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
