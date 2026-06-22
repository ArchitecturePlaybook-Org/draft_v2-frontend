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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hours || isNaN(Number(hours)) || Number(hours) <= 0) {
      toast.error("Please enter a valid number of hours");
      return;
    }

    setIsSubmitting(true);
    try {
      await projectsApi.createTaskTimeLog(task.uid, {
        date,
        hours: Number(hours),
        description,
        billable,
      });
      toast.success("Time log added");
      setHours("");
      setDescription("");
      fetchLogs();
      onUpdate(); // Trigger parent refresh to update total_hours_logged
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

      {/* Add Log Form */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
        <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          Log Time
        </h4>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Hours</label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="e.g. 2.5"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on?"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={billable}
                onChange={(e) => setBillable(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
              />
              Billable Time
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {isSubmitting ? "Saving..." : "Add Time Log"}
            </button>
          </div>
        </form>
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
