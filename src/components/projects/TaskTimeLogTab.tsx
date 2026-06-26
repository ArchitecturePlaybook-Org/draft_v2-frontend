import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Clock, Plus, Trash2 } from "lucide-react";
import { Task, TaskTimeLog } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";

interface TaskTimeLogTabProps {
  task: Task;
  onUpdate: () => void;
}

export function TaskTimeLogTab({ task, onUpdate }: TaskTimeLogTabProps) {
  const [logs, setLogs] = useState<TaskTimeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [hours, setHours] = useState<string>("");
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [task.uid]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await projectsApi.getTaskTimeLogs(task.uid);
      setLogs(data);
    } catch (err) {
      toast.error("Failed to fetch time logs");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAdd = async (h: number) => {
    setIsSubmitting(true);
    try {
      await projectsApi.createTaskTimeLog(task.uid, {
        date: format(new Date(), "yyyy-MM-dd"),
        hours: h,
        description: description.trim() || "Task execution",
        billable: true,
      });
      toast.success(`Logged ${h} hours`);
      setDescription("");
      fetchLogs();
      onUpdate();
    } catch (err) {
      toast.error("Failed to add time log");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (logId: number) => {
    try {
      await projectsApi.deleteTaskTimeLog(logId);
      toast.success("Time log deleted");
      fetchLogs();
      onUpdate();
    } catch (err) {
      toast.error("Failed to delete time log");
    }
  };

  const totalLogged = logs.reduce((sum, log) => sum + Number(log.hours), 0);

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <p className="text-sm text-slate-400 mb-1">Total Time Logged</p>
          <div className="text-2xl font-semibold text-white">
            {task.total_hours_logged || totalLogged} <span className="text-sm text-slate-400 font-normal">hours</span>
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <p className="text-sm text-slate-400 mb-1">Estimated Effort</p>
          <div className="text-2xl font-semibold text-white">
            {task.estimated_hours || 0} <span className="text-sm text-slate-400 font-normal">hours</span>
          </div>
        </div>
      </div>

      {/* Quick Add Log */}
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
        <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          Quick Log
        </h4>
        <div className="space-y-4">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did you work on? (Optional)"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
          />
          <div className="flex gap-3 flex-wrap">
            {[1, 2, 4, 8].map(h => (
              <button
                key={h}
                type="button"
                disabled={isSubmitting}
                onClick={() => handleQuickAdd(h)}
                className="flex-1 py-3 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 rounded-lg text-sm font-bold transition-colors border border-emerald-500/20 disabled:opacity-50"
              >
                +{h}h
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* History List */}
      <div>
        <h4 className="text-sm font-medium text-white mb-4">Time History</h4>
        {isLoading ? (
          <div className="text-center text-sm text-slate-400 py-4">Loading history...</div>
        ) : logs.length === 0 ? (
          <div className="text-center text-sm text-slate-400 py-8 bg-slate-800/30 rounded-xl border border-slate-700/50">
            No time logged yet
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50 flex justify-between items-start group">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white">{log.user_name}</span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-400">{log.date}</span>
                    {log.billable && (
                      <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                        Billable
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-300">{log.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-emerald-400">{log.hours}h</span>
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete log"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
