import React from "react";

interface ProjectProgressBarProps {
  tasksTotal: number;
  tasksDone: number;
  budgetUsed?: number;
  budgetTotal?: number;
  overdueCount?: number;
  compact?: boolean;
}

export const ProjectProgressBar: React.FC<ProjectProgressBarProps> = ({
  tasksTotal,
  tasksDone,
  budgetUsed,
  budgetTotal,
  overdueCount = 0,
  compact = false,
}) => {
  const progressPercent = tasksTotal === 0 ? 0 : Math.round((tasksDone / tasksTotal) * 100);
  
  if (compact) {
    return (
      <div className="w-full">
        <div className="flex justify-between text-[10px] font-bold text-surface-400 dark:text-slate-400 uppercase tracking-widest mb-1.5">
          <span>Progress</span>
          <span className="text-primary dark:text-amber-400 font-extrabold">{tasksDone} / {tasksTotal} tasks</span>
        </div>
        <div className="h-1.5 w-full bg-surface-200/80 dark:bg-slate-800/80 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-emerald-500 rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 bg-surface-100/90 dark:bg-slate-900/80 border-surface-200/60 dark:border-slate-800/90 backdrop-blur-md rounded-xl p-3.5 border shadow-sm">
      {/* Progress Bar */}
      <div className="flex-1 min-w-[200px]">
        <div className="flex justify-between text-xs font-bold text-surface-500 dark:text-slate-300 mb-2">
          <span className="uppercase text-[10px] tracking-wider text-surface-400 dark:text-slate-400">Task Progress</span>
          <span className="text-primary dark:text-emerald-400 font-extrabold">{progressPercent}%</span>
        </div>
        <div className="h-2 w-full bg-surface-200 dark:bg-slate-800/90 rounded-full overflow-hidden shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-emerald-500 rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="hidden sm:block w-px h-8 bg-surface-200 dark:bg-slate-800" />

      {/* Budget Info */}
      {(budgetUsed !== undefined && budgetTotal !== undefined) && (
        <>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest font-bold text-surface-400 dark:text-slate-400">Budget</span>
            <span className="text-sm font-black text-primary dark:text-slate-100">
              ₹{(budgetUsed / 1000).toFixed(0)}k <span className="text-surface-400 dark:text-slate-400 font-bold">/ ₹{(budgetTotal / 1000).toFixed(0)}k</span>
            </span>
          </div>
          <div className="hidden sm:block w-px h-8 bg-surface-200 dark:bg-slate-800" />
        </>
      )}

      {/* Overdue Alert */}
      <div className="flex items-center gap-2">
        {overdueCount > 0 ? (
          <div className="px-2.5 py-1 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-500/30 rounded-md flex items-center gap-2">
            <span className="text-sm">⚠️</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400">
              {overdueCount} Overdue
            </span>
          </div>
        ) : (
          <div className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-500/30 rounded-md flex items-center gap-2">
            <span className="text-sm">✅</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              On Track
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
