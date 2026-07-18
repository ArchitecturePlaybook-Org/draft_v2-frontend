import React from "react";
import Link from "next/link";
import { Task } from "@/types/projects";

interface TaskSubtasksTabProps {
  task: Task;
  isUpdating: boolean;
  isAdmin: boolean;
  isArchitect: boolean;
  handleUpdateSubtask: (subtaskUid: string, data: any) => void;
  handleCreateSubtask: (title: string, description: string) => void;
}

export const TaskSubtasksTab: React.FC<TaskSubtasksTabProps> = ({
  task,
  isUpdating,
  isAdmin,
  isArchitect,
  handleUpdateSubtask,
  handleCreateSubtask,
}) => {
  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto h-[calc(100vh-280px)]">
      <div className="flex items-center justify-between bg-surface-100 border-surface-200 p-6 rounded-2xl border border-surface-200 shadow-sm">
        <div>
          <h3 className="text-xl font-bold text-primary">Subtasks</h3>
          <p className="text-xs text-surface-500 text-surface-400 font-medium mt-1">Break this task down into smaller actionable steps.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        {task.subtasks && task.subtasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-2">
            {task.subtasks.map((subtask: any) => (
              <div 
                key={subtask.uid} 
                onClick={() => {
                  const nextStatus = subtask.status === "DONE" ? "TODO" : subtask.status === "TODO" ? "WIP" : "DONE";
                  handleUpdateSubtask(subtask.uid, { status: nextStatus });
                }}
                className={`p-5 rounded-2xl border shadow-sm cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md ${
                  subtask.status === "DONE" ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30" :
                  subtask.status === "WIP" ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/30" :
                  "bg-surface-100 border-surface-200 border-surface-200 hover:border-accent"
                }`}
              >
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h4 className={`text-sm font-bold ${subtask.status === "DONE" ? "text-surface-500 text-surface-400 line-through" : "text-primary"}`}>{subtask.title}</h4>
                  <span className={`shrink-0 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md border ${
                    subtask.status === "DONE" ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:border-emerald-800/30" :
                    subtask.status === "WIP" ? "bg-blue-100 text-blue-700 border-blue-200 dark:border-blue-800/30" :
                    "bg-surface-100 text-surface-500 text-surface-400 border-surface-200"
                  }`}>
                    {subtask.status}
                  </span>
                </div>
                {subtask.description && (
                  <p className={`text-xs mt-2 line-clamp-3 ${subtask.status === "DONE" ? "text-emerald-700/60" : "text-surface-500 text-surface-400"}`}>{subtask.description}</p>
                )}
                {subtask.assigned_to && (
                  <Link href={`/dashboard/team/${subtask.assigned_to.id}`} className="mt-4 flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className="w-5 h-5 rounded-full bg-accent text-background flex items-center justify-center text-[8px] font-bold uppercase">
                      {subtask.assigned_to.name.charAt(0)}
                    </div>
                    <span className={`text-[10px] font-bold hover:underline ${subtask.status === "DONE" ? "text-emerald-700/60" : "text-surface-500 text-surface-400"}`}>{subtask.assigned_to.name}</span>
                  </Link>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 bg-surface-50 rounded-2xl border-2 border-dashed border-surface-200">
            <svg className="w-8 h-8 text-surface-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
            <p className="text-surface-500 text-surface-400 font-medium text-sm">No subtasks added yet.</p>
          </div>
        )}
      </div>

      {(isAdmin || isArchitect) && (
        <div className="bg-surface-50 p-5 rounded-2xl border border-surface-200 shadow-inner shrink-0">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const title = formData.get("title") as string;
              const description = formData.get("description") as string;
              if (title.trim()) {
                handleCreateSubtask(title.trim(), description?.trim() || "");
                e.currentTarget.reset();
              }
            }}
            className="flex flex-col gap-3"
          >
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-surface-500 text-surface-400">Create Subtask</h4>
            <input
              type="text"
              name="title"
              placeholder="Subtask title..."
              className="bg-surface-100 border-surface-200 border border-surface-200 rounded-lg px-4 py-2.5 text-sm font-bold text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent placeholder:text-surface-400 placeholder:font-medium transition-all"
              required
              disabled={isUpdating}
            />
            <textarea
              name="description"
              placeholder="Description (optional)..."
              rows={2}
              className="bg-surface-100 border-surface-200 border border-surface-200 rounded-lg px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent placeholder:text-surface-400 transition-all resize-none"
              disabled={isUpdating}
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isUpdating}
                className="px-6 py-2.5 bg-accent text-background text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-accent transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                Add Subtask Card
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
