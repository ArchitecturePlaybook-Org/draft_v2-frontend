"use client";

import React, { useEffect, useState } from "react";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";
import { format } from "date-fns";

interface TaskAccessRequestItem {
  id: number;
  user: {
    id: number;
    email: string;
    name?: string;
  };
  task: {
    uid: string;
    title: string;
  };
  status: string;
  created_at: string;
}

interface TaskCollaboratorItem {
  id: number;
  task_uid: string;
  task_title: string;
  user_id: number;
  user_name: string;
  user_email: string;
  joined_at?: string;
}

interface TaskAccessRequestsListProps {
  projectUid?: string;
  projectId?: string;
}

export const TaskAccessRequestsList: React.FC<TaskAccessRequestsListProps> = ({ projectUid, projectId }) => {
  const targetUid = projectUid || projectId || "";
  const [activeSubTab, setActiveSubTab] = useState<"pending" | "approved">("pending");
  const [requests, setRequests] = useState<TaskAccessRequestItem[]>([]);
  const [collaborators, setCollaborators] = useState<TaskCollaboratorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Revoke modal state
  const [revokeTarget, setRevokeTarget] = useState<TaskCollaboratorItem | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const fetchData = async () => {
    if (!targetUid) return;
    try {
      setLoading(true);
      const [pendingData, collaboratorsData] = await Promise.all([
        projectsApi.getPendingTaskRequests(targetUid),
        projectsApi.getProjectTaskCollaborators(targetUid),
      ]);
      setRequests(pendingData);
      setCollaborators(collaboratorsData);
    } catch (err) {
      console.error("Failed to load task access directory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (targetUid) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [targetUid]);

  const handleApprove = async (requestId: number, userName: string) => {
    try {
      setProcessingId(requestId);
      await projectsApi.approveTaskRequest(requestId);
      toast.success(`Access granted for ${userName}`);
      await fetchData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve access request");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      setProcessingId(requestId);
      await projectsApi.rejectTaskRequest(requestId);
      toast.success("Access request denied");
      await fetchData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to reject access request");
    } finally {
      setProcessingId(null);
    }
  };

  const confirmRevokeAccess = async () => {
    if (!revokeTarget) return;
    try {
      setIsRevoking(true);
      await projectsApi.removeTaskCollaborator(revokeTarget.task_uid, revokeTarget.user_id);
      toast.success(`Access revoked for ${revokeTarget.user_name}`);
      setRevokeTarget(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to revoke task access");
    } finally {
      setIsRevoking(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center bg-surface-100/50 backdrop-blur-md rounded-2xl border border-surface-200">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
        <p className="text-xs font-bold text-surface-400 uppercase tracking-widest">Loading Access Directory...</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-card/60 backdrop-blur-xl border border-surface-200 rounded-2xl p-4 shadow-sm mb-4 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-surface-200">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 text-xs shadow-sm">
            🔑
          </div>
          <div>
            <h3 className="text-sm font-black text-foreground tracking-tight">Shared Task Access Directory</h3>
            <p className="text-[11px] text-text-secondary font-medium">Manage pending requests and view active users with access to tasks in this project</p>
          </div>
        </div>

        {/* Sub-navigation Controls */}
        <div className="flex overflow-x-auto no-scrollbar gap-1 p-1 bg-surface-100 border border-surface-200 rounded-lg w-full sm:w-auto shrink-0">
          <button
            onClick={() => setActiveSubTab("pending")}
            className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeSubTab === "pending"
                ? "bg-surface-card text-foreground border border-surface-200 shadow-sm"
                : "text-text-secondary hover:text-foreground"
            }`}
          >
            <span>⏳ Pending Approvals</span>
            {requests.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[8px] font-black flex items-center justify-center">
                {requests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab("approved")}
            className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeSubTab === "approved"
                ? "bg-surface-card text-foreground border border-surface-200 shadow-sm"
                : "text-text-secondary hover:text-foreground"
            }`}
          >
            <span>👥 Users With Access</span>
            <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[8px] font-black flex items-center justify-center">
              {collaborators.length}
            </span>
          </button>
        </div>
      </div>

      {/* Sub-Tab 1: Pending Requests */}
      {activeSubTab === "pending" && (
        <>
          {requests.length === 0 ? (
            <div className="text-center py-8 bg-surface-50/50 rounded-xl border border-dashed border-surface-200">
              <span className="text-2xl mb-2 block opacity-40">✨</span>
              <h4 className="text-xs font-black text-foreground mb-0.5">No Pending Requests</h4>
              <p className="text-[11px] text-text-secondary font-medium max-w-xs mx-auto">All shared task link access requests for this project have been reviewed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((item) => (
                <div 
                  key={item.id}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 bg-surface-100/90 backdrop-blur-md rounded-xl border border-surface-200 hover:border-amber-500/40 transition-all gap-3 shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 font-bold text-amber-500 text-xs shadow-sm">
                      {item.user?.name?.charAt(0) || item.user?.email?.charAt(0) || "U"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <span className="font-black text-foreground text-xs truncate">{item.user?.name || "Anonymous User"}</span>
                        <span className="text-[9px] font-semibold text-text-secondary bg-surface-200 px-1.5 py-0.5 rounded truncate max-w-full">
                          {item.user?.email}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary font-medium mt-0.5 truncate">
                        Task: <strong className="text-foreground font-bold">"{item.task?.title}"</strong>
                      </p>
                      <p className="text-[9px] text-text-secondary opacity-70 font-bold uppercase tracking-wider mt-0.5">
                        {format(new Date(item.created_at), "dd MMM yyyy, HH:mm")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-surface-200">
                    <button
                      onClick={() => handleReject(item.id)}
                      disabled={processingId === item.id}
                      className="flex-1 sm:flex-initial px-3 py-1.5 bg-surface-200 hover:bg-red-500/10 text-text-secondary hover:text-red-500 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all border border-surface-200 disabled:opacity-50"
                    >
                      Deny
                    </button>
                    <button
                      onClick={() => handleApprove(item.id, item.user?.name || item.user?.email)}
                      disabled={processingId === item.id}
                      className="flex-1 sm:flex-initial px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black text-[10px] uppercase tracking-wider rounded-lg transition-all shadow-sm shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {processingId === item.id ? "Approving..." : "Approve Access"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Sub-Tab 2: Active Collaborators / Users With Access */}
      {activeSubTab === "approved" && (
        <>
          {collaborators.length === 0 ? (
            <div className="text-center py-8 bg-surface-50/50 rounded-xl border border-dashed border-surface-200">
              <span className="text-2xl mb-2 block opacity-40">🔒</span>
              <h4 className="text-xs font-black text-foreground mb-0.5">No External Access Granted Yet</h4>
              <p className="text-[11px] text-text-secondary font-medium max-w-xs mx-auto">When access requests are approved, users with task access appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {collaborators.map((collab) => (
                <div
                  key={collab.id}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 bg-surface-100/90 backdrop-blur-md rounded-xl border border-surface-200 hover:border-emerald-500/40 transition-all gap-3 shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 font-bold text-emerald-500 text-xs shadow-sm">
                      {collab.user_name?.charAt(0) || "U"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <span className="font-black text-foreground text-xs truncate">{collab.user_name}</span>
                        <span className="text-[9px] font-semibold text-text-secondary bg-surface-200 px-1.5 py-0.5 rounded truncate max-w-full">
                          {collab.user_email}
                        </span>
                        <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded shrink-0">
                          Access Granted
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary font-medium mt-0.5 truncate">
                        Task: <strong className="text-foreground font-bold">"{collab.task_title}"</strong>
                      </p>
                      {collab.joined_at && (
                        <p className="text-[9px] text-text-secondary opacity-70 font-bold uppercase tracking-wider mt-0.5">
                          Granted: {format(new Date(collab.joined_at), "dd MMM yyyy, HH:mm")}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setRevokeTarget(collab)}
                    className="w-full sm:w-auto px-3 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all border border-red-500/20 shrink-0"
                  >
                    Revoke Access
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── CUSTOM REVOKE ACCESS CONFIRMATION MODAL ── */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-surface-card border border-surface-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-5 text-red-500 text-2xl shadow-sm">
              🛡️
            </div>

            <h3 className="text-xl font-black text-foreground mb-2 tracking-tight">Revoke Task Access?</h3>
            <p className="text-xs text-text-secondary mb-6 leading-relaxed">
              Are you sure you want to revoke shared task access for this user?
            </p>

            <div className="bg-surface-100 p-4 rounded-2xl border border-surface-200 space-y-2 mb-6">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary font-medium">User Name:</span>
                <strong className="text-foreground font-black">{revokeTarget.user_name}</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary font-medium">Email Address:</span>
                <span className="text-text-secondary font-semibold bg-surface-200 px-2 py-0.5 rounded-md text-[11px]">
                  {revokeTarget.user_email}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-surface-200">
                <span className="text-text-secondary font-medium">Task:</span>
                <strong className="text-foreground font-bold text-right truncate max-w-[200px]">"{revokeTarget.task_title}"</strong>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setRevokeTarget(null)}
                disabled={isRevoking}
                className="flex-1 py-3 bg-surface-200 hover:bg-surface-300 text-foreground font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-surface-300/50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmRevokeAccess}
                disabled={isRevoking}
                className="flex-1 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-red-500/20 disabled:opacity-50"
              >
                {isRevoking ? "Revoking..." : "Confirm Revoke"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
