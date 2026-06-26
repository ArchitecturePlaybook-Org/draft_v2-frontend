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
        <div className="flex justify-between text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1.5">
          <span>Progress</span>
          <span className="text-primary">{tasksDone} / {tasksTotal} tasks</span>
        </div>
        <div className="h-1.5 w-full bg-surface-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 bg-surface-100 border-surface-200/60 backdrop-blur-md rounded-xl p-3 border border-surface-200 shadow-sm">
      {/* Progress Bar */}
      <div className="flex-1 min-w-[200px]">
        <div className="flex justify-between text-xs font-bold text-surface-500 text-surface-400 mb-2">
          <span>Task Progress</span>
          <span className="text-primary">{progressPercent}%</span>
        </div>
        <div className="h-2 w-full bg-surface-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="hidden sm:block w-px h-8 bg-surface-200" />

      {/* Budget Info */}
      {(budgetUsed !== undefined && budgetTotal !== undefined) && (
        <>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest font-bold text-surface-400">Budget</span>
            <span className="text-sm font-black text-primary">
              ${(budgetUsed / 1000).toFixed(0)}k <span className="text-surface-400 font-bold">/ ${(budgetTotal / 1000).toFixed(0)}k</span>
            </span>
          </div>
          <div className="hidden sm:block w-px h-8 bg-surface-200" />
        </>
      )}

      {/* Overdue Alert */}
      <div className="flex items-center gap-2">
        {overdueCount > 0 ? (
          <div className="px-2.5 py-1 bg-red-50 dark:bg-red-900/20 border border-red-100 rounded-md flex items-center gap-2">
            <span className="text-sm">⚠️</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-600">
              {overdueCount} Overdue
            </span>
          </div>
        ) : (
          <div className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 rounded-md flex items-center gap-2">
            <span className="text-sm">✅</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
              On Track
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
