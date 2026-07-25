import React, { useState, useEffect } from "react";
import { Task } from "@/types/projects";
import { toast } from "sonner";
import { DiaryEntryDetail } from "./DiaryEntryDetail";
import { projectsApi } from "@/domains/projects/api";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, Clock } from "lucide-react";
import { fieldDiaryCache } from "@/domains/projects/fieldDiaryCache";

interface TaskFieldDiaryTabProps {
  task: Task;
  projectUid: string;
}

export const TaskFieldDiaryTab: React.FC<TaskFieldDiaryTabProps> = ({ task, projectUid }) => {
  const [loading, setLoading] = useState(true);
  const [todayEntry, setTodayEntry] = useState<any | null>(null);
  
  // Quick log states
  const [quickLogHours, setQuickLogHours] = useState("");
  const [quickLogProgress, setQuickLogProgress] = useState("");
  const [quickLogNote, setQuickLogNote] = useState("");
  const [isSubmittingQuickLog, setIsSubmittingQuickLog] = useState(false);

  const fetchOrCreateTodayEntry = async (forceRefresh = false) => {
    if (!projectUid) return;
    const cacheKey = `today_${projectUid}`;
    const cachedToday = fieldDiaryCache.get<any>(cacheKey);

    if (cachedToday && !forceRefresh) {
      setTodayEntry(cachedToday);
      setLoading(false);
      
      const todayStr = new Date().toISOString().split("T")[0];
      projectsApi.getDiaryEntries(projectUid).then(async (res) => {
        const entry = res.find((e: any) => e.entry_date === todayStr);
        if (entry) {
          const fullEntry = await projectsApi.getDiaryEntryDetail(entry.id);
          setTodayEntry(fullEntry);
          fieldDiaryCache.set(cacheKey, fullEntry);
        }
      }).catch(() => {});
      return;
    }

    try {
      const todayStr = new Date().toISOString().split("T")[0];
      
      const res = await projectsApi.getDiaryEntries(projectUid);
      const entry = res.find((e: any) => e.entry_date === todayStr);
      
      if (entry) {
        const fullEntry = await projectsApi.getDiaryEntryDetail(entry.id);
        setTodayEntry(fullEntry);
        fieldDiaryCache.set(cacheKey, fullEntry);
        setLoading(false);
        return;
      }

      const projRes = await projectsApi.getProjectDetails(projectUid);
      if (!projRes || !projRes.id) throw new Error("Could not find project ID");

      const createRes = await projectsApi.createDiaryEntry({
        project: projRes.id,
        entry_date: todayStr,
        weather_am: "",
        weather_pm: ""
      } as any);
      
      const fullEntry = await projectsApi.getDiaryEntryDetail(createRes.id);
      setTodayEntry(fullEntry);
      fieldDiaryCache.set(cacheKey, fullEntry);
    } catch (err: any) {
      console.warn("Failed to load or create today's entry:", err);
      if (err.status === 400 || err.message?.includes("must make a unique set")) {
         try {
           const todayStr = new Date().toISOString().split("T")[0];
           const res = await projectsApi.getDiaryEntries(projectUid);
           const entry = res.find((e: any) => e.entry_date === todayStr);
           if (entry) {
             const fullEntry = await projectsApi.getDiaryEntryDetail(entry.id);
             setTodayEntry(fullEntry);
             fieldDiaryCache.set(cacheKey, fullEntry);
             setLoading(false);
             return;
           }
         } catch (fallbackErr) {}
      }
      toast.error("Failed to load today's field diary.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrCreateTodayEntry();
  }, [projectUid]);

  const handleUpdate = () => {
    fetchOrCreateTodayEntry(true);
  };

  const handleQuickLog = async () => {
    if (!todayEntry) return;
    if (!quickLogHours && !quickLogProgress && !quickLogNote) {
      toast.error("Please enter at least some progress, hours, or notes.");
      return;
    }
    
    setIsSubmittingQuickLog(true);
    try {
      await projectsApi.createDiarySubEntry(todayEntry.id, "activity", {
        task_uid: task.uid,
        activity_type: "work",
        description: quickLogNote || `Worked on ${task.title}`,
        hours: quickLogHours || null,
        progress_percent: quickLogProgress || null,
      });
      toast.success("Progress logged successfully!");
      setQuickLogHours("");
      setQuickLogProgress("");
      setQuickLogNote("");
      handleUpdate();
    } catch (e) {
      toast.error("Failed to log progress.");
    } finally {
      setIsSubmittingQuickLog(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center border-2 border-dashed border-surface-200 rounded-2xl bg-surface-50">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
         <p className="text-surface-500 text-surface-400 font-bold">Loading Today's Field Diary...</p>
      </div>
    );
  }

  if (!todayEntry) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center border-2 border-dashed border-red-200 dark:border-red-800/30 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-500">
         <p className="font-bold">Failed to load or create today's diary.</p>
         <button onClick={fetchOrCreateTodayEntry} className="mt-4 px-4 py-2 bg-surface-100 border-surface-200 rounded-lg border border-red-200 dark:border-red-800/30 font-bold hover:bg-red-100">
           Retry
         </button>
      </div>
    );
  }

  const isLocked = todayEntry.status === "signed";

  return (
    <div className="w-full flex flex-col gap-6">
       
       {/* Pinned Task Context Strip */}
       <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 shadow-sm">
         <div className="flex items-center gap-2 mb-4">
           <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest">Active Task</span>
           <h3 className="font-bold text-indigo-900">{task.title}</h3>
         </div>
         
         {!isLocked ? (
           <div className="flex flex-col md:flex-row gap-3 items-end">
             <div className="flex-1 w-full relative">
               <label className="block text-xs font-bold text-indigo-700 uppercase mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Hours Worked</label>
               <input 
                 type="number" 
                 placeholder="e.g. 4" 
                 value={quickLogHours}
                 onChange={e => setQuickLogHours(e.target.value)}
                 className="w-full h-10 px-3 rounded-lg border border-indigo-200 focus:ring-indigo-500 focus:border-indigo-500 text-sm" 
               />
             </div>
             <div className="flex-1 w-full relative">
               <label className="block text-xs font-bold text-indigo-700 uppercase mb-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Progress (%)</label>
               <input 
                 type="number" 
                 placeholder="e.g. 25" 
                 value={quickLogProgress}
                 onChange={e => setQuickLogProgress(e.target.value)}
                 className="w-full h-10 px-3 rounded-lg border border-indigo-200 focus:ring-indigo-500 focus:border-indigo-500 text-sm" 
               />
             </div>
             <div className="flex-[2] w-full">
               <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">Notes (Optional)</label>
               <input 
                 type="text" 
                 placeholder="What was accomplished?" 
                 value={quickLogNote}
                 onChange={e => setQuickLogNote(e.target.value)}
                 className="w-full h-10 px-3 rounded-lg border border-indigo-200 focus:ring-indigo-500 focus:border-indigo-500 text-sm" 
               />
             </div>
             <Button 
               onClick={handleQuickLog} 
               disabled={isSubmittingQuickLog}
               className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white whitespace-nowrap"
             >
               {isSubmittingQuickLog ? "Logging..." : "Log Progress"}
             </Button>
           </div>
         ) : (
           <div className="bg-surface-100 border-surface-200/50 p-3 rounded-lg border border-indigo-100 text-sm text-indigo-800 font-medium flex items-center gap-2">
             <CheckCircle2 className="w-4 h-4 text-green-600" />
             Today's diary is signed and locked. You cannot log more progress today.
           </div>
         )}
       </div>

       {/* Full Site Diary Below */}
       <div className="w-full">
         <DiaryEntryDetail 
           entry={todayEntry} 
           projectId={projectUid} 
           onUpdate={handleUpdate} 
         />
       </div>
    </div>
  );
};
