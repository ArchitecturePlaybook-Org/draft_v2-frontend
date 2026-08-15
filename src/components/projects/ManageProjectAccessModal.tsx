"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Project } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { orgsApi } from "@/domains/orgs/api";
import { toast } from "sonner";
import { 
  X, 
  Loader2, 
  User, 
  Shield, 
  Search, 
  Lock, 
  Unlock, 
  Check, 
  Users,
  UserCheck
} from "lucide-react";

interface ManageProjectAccessModalProps {
  project: Project;
  onClose: () => void;
  onAccessUpdated: () => void;
}

export function ManageProjectAccessModal({ 
  project, 
  onClose, 
  onAccessUpdated 
}: ManageProjectAccessModalProps) {
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">(project.visibility || "PUBLIC");
  const [selectedUsers, setSelectedUsers] = useState<number[]>(project.shared_users || []);
  
  const [firmMembers, setFirmMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  useEffect(() => {
    const loadAccessData = async () => {
      try {
        setIsLoading(true);
        const orgId = project.account?.id;
        if (orgId) {
          const membersData = await orgsApi.listMembers(orgId).catch((err: any) => {
            console.error("Failed to load firm members:", err);
            return [];
          });
          setFirmMembers(membersData || []);
        }
      } catch (err) {
        console.error("Project access control load failed:", err);
        toast.error("Failed to load organization members.");
      } finally {
        setIsLoading(false);
      }
    };

    loadAccessData();
  }, [project.id, project.account?.id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const patchData = {
        visibility: visibility,
        shared_users: visibility === "PRIVATE" ? selectedUsers : [],
        shared_roles: []
      };

      await projectsApi.updateProject(project.uid, patchData);
      toast.success("Project access permissions updated successfully!");
      onAccessUpdated();
      onClose();
    } catch (err: any) {
      console.error("Failed to update project access:", err);
      toast.error(`Failed to update permissions: ${err.message || "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleUser = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    const allUserIds = firmMembers
      .map(m => m.user?.id)
      .filter((id): id is number => typeof id === "number");
    setSelectedUsers(allUserIds);
  };

  const deselectAllUsers = () => {
    setSelectedUsers([]);
  };

  // Filter firm members based on search query
  const filteredMembers = useMemo(() => {
    return firmMembers.filter(member => {
      const user = member.user;
      if (!user) return false;
      const userName = (user.name || `${user.first_name || ""} ${user.last_name || ""}`).toLowerCase();
      const email = (user.email || "").toLowerCase();
      const query = userSearchQuery.toLowerCase().trim();
      return !query || userName.includes(query) || email.includes(query);
    });
  }, [firmMembers, userSearchQuery]);

  return (
    <div className="fixed inset-0 z-[120] flex justify-end" onClick={onClose}>
      {/* Backdrop with blur effect */}
      <div className="absolute inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Slide-in Right Panel */}
      <div
        className="relative h-full w-full max-w-[480px] bg-surface-100/95 dark:bg-surface-900/95 backdrop-blur-2xl border-l border-surface-200 dark:border-surface-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-surface-200/80 dark:border-surface-800/80 bg-surface-50/80 dark:bg-surface-900/80 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-inner">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-accent">Assign Internal Personnel</p>
                <h2 className="font-black text-lg text-primary truncate max-w-[280px]">{project.title}</h2>
                <p className="text-[11px] text-surface-500 font-medium">Manage project visibility and user access</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-200/60 dark:bg-surface-800/60 hover:bg-surface-300 text-surface-600 dark:text-surface-300 transition-all active:scale-95"
              aria-label="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-surface-400">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
              <span className="text-xs font-semibold">Loading organization members...</span>
            </div>
          ) : (
            <>
              {/* Visibility Setting Group */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-surface-500">Project Access Mode</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Public Card: All users under Org */}
                  <button
                    type="button"
                    onClick={() => setVisibility("PUBLIC")}
                    className={`p-4 rounded-xl border flex flex-col gap-2 text-left transition-all ${
                      visibility === "PUBLIC"
                        ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/30"
                        : "border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/30 hover:border-surface-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                        <Unlock className="w-4 h-4" />
                      </div>
                      {visibility === "PUBLIC" && (
                        <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
                      )}
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-primary">Public Access</span>
                      <span className="text-[10px] text-surface-500 leading-tight block mt-0.5 font-medium">
                        All users under the organization have full access to this project.
                      </span>
                    </div>
                  </button>

                  {/* Private Card: Specific Users */}
                  <button
                    type="button"
                    onClick={() => setVisibility("PRIVATE")}
                    className={`p-4 rounded-xl border flex flex-col gap-2 text-left transition-all ${
                      visibility === "PRIVATE"
                        ? "border-blue-500 bg-blue-500/5 dark:bg-blue-500/10 shadow-sm ring-1 ring-blue-500/30"
                        : "border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/30 hover:border-surface-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      {visibility === "PRIVATE" && (
                        <Check className="w-4 h-4 text-blue-500 stroke-[3]" />
                      )}
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-primary">Restricted Access</span>
                      <span className="text-[10px] text-surface-500 leading-tight block mt-0.5 font-medium">
                        Access is restricted only to explicitly selected organization users.
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Specific User Selection List */}
              {visibility === "PRIVATE" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {/* Header & Controls */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-accent" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-surface-500">
                        Select Users Under Org
                      </h3>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-accent/10 text-accent border border-accent/20">
                        {selectedUsers.length} / {firmMembers.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllUsers}
                        className="text-[10px] font-bold text-accent hover:underline uppercase tracking-wider"
                      >
                        Select All
                      </button>
                      <span className="text-surface-300 dark:text-surface-700">|</span>
                      <button
                        type="button"
                        onClick={deselectAllUsers}
                        className="text-[10px] font-bold text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 uppercase tracking-wider"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Search Filter Input */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-surface-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search users by name or email..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full bg-surface-50 dark:bg-surface-800/40 border border-surface-200 dark:border-surface-700/80 rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold outline-none focus:border-accent transition-colors"
                    />
                    {userSearchQuery && (
                      <button
                        onClick={() => setUserSearchQuery("")}
                        className="absolute inset-y-0 right-3 flex items-center text-surface-400 hover:text-surface-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Organization Users List */}
                  <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                    {filteredMembers.length === 0 ? (
                      <div className="p-6 border border-dashed border-surface-200 dark:border-surface-800 rounded-xl text-center">
                        <UserCheck className="w-6 h-6 text-surface-400 mx-auto mb-2 opacity-50" />
                        <p className="text-xs text-surface-500 font-semibold">No organization members found.</p>
                        {userSearchQuery && (
                          <p className="text-[11px] text-surface-400 mt-1">Try clearing your search query.</p>
                        )}
                      </div>
                    ) : (
                      filteredMembers.map((member) => {
                        const user = member.user;
                        if (!user || typeof user.id !== "number") return null;
                        const isSelected = selectedUsers.includes(user.id);
                        const displayName = user.name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email;

                        return (
                          <div
                            key={user.id}
                            onClick={() => toggleUser(user.id)}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              isSelected
                                ? "border-accent/40 bg-accent/10 dark:bg-accent/15 shadow-sm"
                                : "border-surface-200/80 dark:border-surface-800/80 bg-surface-50 dark:bg-surface-800/30 hover:border-surface-300 dark:hover:border-surface-700"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-black transition-colors ${
                                isSelected 
                                  ? "bg-accent text-background shadow-sm" 
                                  : "bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-200"
                              }`}>
                                {displayName[0]?.toUpperCase() || <User className="w-4 h-4" />}
                              </div>
                              
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-bold text-primary truncate">{displayName}</p>
                                  {member.role && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-surface-200 dark:bg-surface-800 text-surface-600 dark:text-surface-400 border border-surface-300 dark:border-surface-700 shrink-0">
                                      {member.role}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-surface-400 truncate mt-0.5">{user.email}</p>
                              </div>
                            </div>

                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                              isSelected 
                                ? "bg-accent border-accent text-background" 
                                : "border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800"
                            }`}>
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-surface-200/80 dark:border-surface-800/80 bg-surface-50/80 dark:bg-surface-900/80 backdrop-blur-md flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 border border-surface-200 dark:border-surface-700 bg-surface-50 hover:bg-surface-100 text-primary font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="flex-1 h-10 bg-accent text-background font-bold text-xs uppercase tracking-wider rounded-xl hover:opacity-95 transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Share Access & Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}
