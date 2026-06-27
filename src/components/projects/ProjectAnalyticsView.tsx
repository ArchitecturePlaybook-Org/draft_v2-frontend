"use client";

import React, { useState, useEffect } from "react";
import { projectsApi } from "@/domains/projects/api";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";

interface ProjectAnalyticsViewProps {
  projectUid: string;
}

export function ProjectAnalyticsView({ projectUid }: ProjectAnalyticsViewProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await projectsApi.getProjectAnalytics(projectUid);
        setData(res);
      } catch (err) {
        console.error("Failed to load analytics", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [projectUid]);

  if (isLoading) return <div className="py-20 flex justify-center"><Spinner label="Loading analytics..." /></div>;
  if (!data) return <div className="py-20 text-center text-surface-500 text-surface-400">Failed to load data.</div>;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-end">
        <Button 
          variant="primary" 
          className="text-xs shadow-md shadow-primary/20 flex items-center gap-2"
          onClick={() => projectsApi.exportProjectReport(projectUid)}
        >
          <span>📄</span> Download Formal Status Report (PDF)
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Task Completion Card */}
      <div className="bg-surface-100 border-surface-200 p-6 rounded-2xl border border-surface-200 shadow-sm flex flex-col items-center justify-center min-h-[200px]">
        <div className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-4">Task Completion</div>
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-surface-100" />
            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray="251" strokeDashoffset={251 - (251 * data.completion_percentage) / 100} className="text-emerald-500 transition-all duration-1000 ease-out" />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-2xl font-extrabold text-primary">{data.completion_percentage}%</span>
          </div>
        </div>
        <div className="mt-4 text-xs font-bold text-surface-500 text-surface-400">
          {data.completed_tasks} of {data.total_tasks} tasks done
        </div>
      </div>

      {/* Task Status Distribution */}
      <div className="bg-surface-100 border-surface-200 p-6 rounded-2xl border border-surface-200 shadow-sm min-h-[200px]">
        <div className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-4">Task Status Distribution</div>
        <div className="space-y-4">
          {Object.entries(data.tasks_by_status).map(([status, count]: [string, any]) => (
            <div key={status} className="flex items-center gap-3">
              <div className="w-16 text-[10px] font-bold text-surface-500 text-surface-400">{status}</div>
              <div className="flex-1 h-3 bg-surface-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    status === 'DONE' ? 'bg-emerald-500' :
                    status === 'WIP' ? 'bg-accent' :
                    status === 'BLOCKED' ? 'bg-red-500' : 'bg-surface-300'
                  }`}
                  style={{ width: `${data.total_tasks > 0 ? (count / data.total_tasks) * 100 : 0}%` }}
                />
              </div>
              <div className="w-6 text-right text-[10px] font-bold text-primary">{count}</div>
            </div>
          ))}
        </div>
      </div>


        </div>
      </div>
  );
}
