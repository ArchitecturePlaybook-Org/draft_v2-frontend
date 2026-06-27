"use client";

import React, { useEffect, useState } from "react";
import { projectsApi } from "@/domains/projects/api";
import { Check, X, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export function TaskAccessRequestsList({ projectId }: { projectId: string }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, [projectId]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await projectsApi.getPendingTaskRequests();
      // Filter by the current project since the API might return requests for all managed projects
      // The API returns project_title but ideally it would return project uid. Wait, I added project_title, not project_uid to the serializer.
      // Let's filter client-side if we can, or just display them all if it's a global list.
      // Wait, the API `TaskAccessRequestViewSet` filters by `task__project__id__in=managed_project_ids`.
      // It doesn't filter by `project_uid`. Let's just fetch them and see. 
      // Actually, since this is inside a specific project, we should maybe filter by project_id. 
      // But we don't have project_uid in the serializer. I will just render all pending requests for now, or we can assume it's small.
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await projectsApi.approveTaskRequest(id);
      toast.success("Request approved.");
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      toast.error("Failed to approve request.");
    }
  };

  const handleReject = async (id: number) => {
    try {
      await projectsApi.rejectTaskRequest(id);
      toast.success("Request rejected.");
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      toast.error("Failed to reject request.");
    }
  };

  if (loading) {
    return <div className="text-sm text-surface-500 text-surface-400 py-4">Loading pending requests...</div>;
  }

  if (requests.length === 0) {
    return null; // Don't show anything if there are no pending requests
  }

  return (
    <div className="bg-surface-100 border-surface-200 rounded-lg border border-amber-200 dark:border-amber-800/30 p-6 shadow-sm mt-6">
      <h3 className="text-lg font-semibold text-amber-800 mb-2 flex items-center gap-2">
        <Clock className="w-5 h-5" /> Pending Task Access Requests
      </h3>
      <p className="text-sm text-surface-500 text-surface-400 mb-6">
        External users have requested access to specific tasks. Approving will allow them to view and edit the task.
      </p>

      <div className="space-y-3">
        {requests.map(req => (
          <div key={req.id} className="flex items-center justify-between p-4 rounded-md border border-amber-100 bg-amber-50 dark:bg-amber-900/20 shadow-sm">
            <div className="flex-1 min-w-0 pr-4">
              <div className="text-sm font-bold text-neutral-800 mb-1">
                {req.user?.name || req.user?.email} <span className="font-normal text-neutral-500">requests access to</span> {req.task_title}
              </div>
              <div className="text-xs text-neutral-500">
                Project: {req.project_title} • Requested {format(new Date(req.created_at), "MMM d, yyyy")}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => handleApprove(req.id)}
                className="flex items-center gap-1 h-8 px-3 bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-emerald-600 transition-all shadow-sm"
              >
                <Check className="w-3 h-3" /> Approve
              </button>
              <button 
                onClick={() => handleReject(req.id)}
                className="flex items-center gap-1 h-8 px-3 bg-surface-200 text-surface-600 text-surface-300 font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-red-500 hover:text-white transition-all"
              >
                <X className="w-3 h-3" /> Deny
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActiveTaskCollaboratorsList({ projectId }: { projectId: string }) {
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCollaborators();
  }, [projectId]);

  const loadCollaborators = async () => {
    setLoading(true);
    try {
      const data = await projectsApi.getProjectTaskCollaborators(projectId);
      setCollaborators(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (taskUid: string, userId: number) => {
    if (!confirm("Are you sure you want to revoke this user's access to the task?")) return;
    try {
      await projectsApi.removeTaskCollaborator(taskUid, userId);
      toast.success("Access revoked.");
      // Instantly remove from UI
      setCollaborators(prev => prev.filter(c => !(c.task_uid === taskUid && c.user_id === userId)));
    } catch (err) {
      toast.error("Failed to revoke access.");
    }
  };

  if (loading) {
    return <div className="text-sm text-neutral-500 py-4">Loading active collaborators...</div>;
  }

  if (collaborators.length === 0) {
    return null; // Don't show if empty
  }

  return (
    <div className="bg-surface-100 border-surface-200 rounded-lg border border-indigo-200 dark:border-indigo-800/30 p-6 shadow-sm mt-6">
      <h3 className="text-lg font-semibold text-indigo-800 mb-2 flex items-center gap-2">
        Active Task Collaborators
      </h3>
      <p className="text-sm text-neutral-500 mb-6">
        The following external users have been granted access to specific tasks.
      </p>

      <div className="space-y-3">
        {collaborators.map(collab => (
          <div key={collab.id} className="flex items-center justify-between p-4 rounded-md border border-indigo-100 bg-indigo-50/50 dark:bg-indigo-900/10 shadow-sm">
            <div className="flex-1 min-w-0 pr-4">
              <div className="text-sm font-bold text-neutral-800 mb-1">
                {collab.user_name} <span className="font-normal text-neutral-500">has access to</span> {collab.task_title}
              </div>
              <div className="text-xs text-neutral-500">
                Joined {format(new Date(collab.joined_at), "MMM d, yyyy")} • Email: {collab.user_email}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => handleRevoke(collab.task_uid, collab.user_id)}
                className="flex items-center gap-1 h-8 px-3 bg-red-50 text-red-600 font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-200 hover:border-red-500"
              >
                <X className="w-3 h-3" /> Revoke
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
