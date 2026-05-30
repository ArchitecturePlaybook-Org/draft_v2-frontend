"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { projectsApi } from "@/domains/projects/api";
import { TaskExecutionModal } from "@/components/projects/TaskExecutionModal";
import { Task } from "@/types/projects";
import { toast } from "sonner";

export default function SharedTaskPage() {
  const params = useParams();
  const router = useRouter();
  const uid = params.uid as string;

  const [loading, setLoading] = useState(true);
  const [publicInfo, setPublicInfo] = useState<any>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (uid) {
      loadAccessInfo();
    }
  }, [uid]);

  const loadAccessInfo = async () => {
    setLoading(true);
    try {
      const info = await projectsApi.getTaskPublicInfo(uid);
      setPublicInfo(info);
      if (info.has_access) {
        await loadFullTask();
      }
    } catch (err: any) {
      if (err.status === 404) {
        toast.error("Task not found or unavailable.");
      } else {
        toast.error("Failed to load task information.");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadFullTask = async () => {
    try {
      const fullTask = await projectsApi.getTask(uid);
      setTask(fullTask);
    } catch (err) {
      toast.error("Failed to load full task details.");
    }
  };

  const handleRequestAccess = async () => {
    setIsRequesting(true);
    try {
      await projectsApi.requestTaskAccess(uid);
      toast.success("Access requested successfully.");
      await loadAccessInfo();
    } catch (err: any) {
      toast.error(err.message || "Failed to request access.");
    } finally {
      setIsRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!publicInfo) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm text-center max-w-md w-full border border-surface-200">
          <p className="text-3xl mb-4">🔍</p>
          <h2 className="text-xl font-bold text-primary mb-2">Task Not Found</h2>
          <p className="text-sm text-surface-500 mb-6">This task link might be invalid or has been deleted.</p>
          <button onClick={() => router.push("/dashboard")} className="h-11 px-6 bg-primary text-white font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-accent transition-all w-full">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // If user has access and full task is loaded, show the full screen details
  if (publicInfo.has_access && task) {
    return (
      <div className="min-h-screen bg-surface-50">
        {/* We use the TaskExecutionModal but override some styles or let it be fullscreen */}
        <TaskExecutionModal 
          task={task}
          projectAssets={[]}
          onClose={() => router.push("/dashboard")}
          onTaskUpdated={loadFullTask}
          projectUid={typeof publicInfo.project === "object" ? publicInfo.project.uid : undefined}
        />
      </div>
    );
  }

  // Request Access Wall
  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 arch-grid opacity-10 pointer-events-none" />
      <div className="bg-white p-10 rounded-3xl shadow-xl border border-surface-200 max-w-lg w-full relative z-10">
        <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        <h2 className="text-3xl font-extrabold text-primary mb-2 tracking-tight">Private Task</h2>
        <p className="text-surface-500 mb-8 font-medium">
          You need permission to access <strong className="text-primary">"{publicInfo.title}"</strong> in <strong className="text-primary">{publicInfo.project_title}</strong>.
        </p>

        {publicInfo.request_status === "Pending" ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <span className="text-3xl mb-2 block">⏳</span>
            <h3 className="font-bold text-amber-800 mb-1">Request Pending</h3>
            <p className="text-xs text-amber-700 font-medium">The project manager has been notified. You will get access once they approve your request.</p>
          </div>
        ) : publicInfo.request_status === "Rejected" ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <span className="text-3xl mb-2 block">🚫</span>
            <h3 className="font-bold text-red-800 mb-1">Request Denied</h3>
            <p className="text-xs text-red-700 font-medium">Your request to access this task was declined.</p>
          </div>
        ) : (
          <button 
            onClick={handleRequestAccess}
            disabled={isRequesting}
            className="h-12 w-full bg-primary text-white font-bold text-[12px] uppercase tracking-widest rounded-xl hover:bg-accent transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {isRequesting ? "Requesting..." : "Request Access"}
          </button>
        )}
      </div>
    </div>
  );
}
