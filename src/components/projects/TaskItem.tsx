import React from "react";
import { Task } from "@/types/projects";

interface TaskItemProps {
  task: Task;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onClick, onDragStart }) => {
  return (
    <div 
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onClick={onClick}
      className="bg-white p-6 rounded-2xl border border-surface-200 hover:border-accent hover:shadow-lg transition-all group flex flex-col md:flex-row justify-between items-start md:items-center gap-6 cursor-pointer"
    >
      <div className="flex-1 space-y-2">
        <h4 className="text-sm font-bold text-primary tracking-tight group-hover:text-accent transition-colors">{task.title}</h4>
        <p className="text-[11px] text-surface-500 leading-relaxed font-medium">
          {task.description || "No specific architectural requirements detailed."}
        </p>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <span className={`px-3 py-1 text-[9px] font-bold uppercase tracking-[0.15em] rounded-md shadow-sm shrink-0 ${
          task.status === 'Done' ? 'bg-emerald-500 text-white' : 
          task.status === 'In Progress' ? 'bg-primary text-white' : 'bg-surface-200 text-surface-600'
        }`}>
          {task.status}
        </span>
        <div className="text-[10px] font-black text-accent bg-surface-50 px-3 py-1.5 rounded-lg border border-surface-200 tracking-widest uppercase">
          ${Number(task.cost).toLocaleString()}
        </div>
      </div>
    </div>
  );
};
