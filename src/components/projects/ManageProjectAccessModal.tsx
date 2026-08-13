"use client";
import React, { useState, useEffect } from "react";
import { Project, Role } from "@/types/projects";
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
  Plus, 
  Trash2,
  Users
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
  const [selectedRoles, setSelectedRoles] = useState<number[]>(project.shared_roles || []);
  const [selectedUsers, setSelectedUsers] = useState<number[]>(project.shared_users || []);
  
  const [roles, setRoles] = useState<Role[]>([]);
  const [firmMembers, setFirmMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  useEffect(() => {
    const loadAccessData = async () => {
      try {
        setIsLoading(true);
        // Load roles and account/firm members in parallel
        const [rolesData, membersData] = await Promise.all([
          projectsApi.getRoles().catch((err: any) => {
            console.error("Failed to load roles:", err);
            return [] as Role[];
          }),
          orgsApi.listMembers(project.account.id).catch((err: any) => {
            console.error("Failed to load firm members:", err);
            return [];
          })
        ]);
        
        setRoles(rolesData);
        setFirmMembers(membersData);
      } catch (err) {
        console.error("Project access control load failed:", err);
        toast.error("Failed to load visibility permission details.");
      } finally {
        setIsLoading(false);
      }
    };

    loadAccessData();
  }, [project.id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const patchData = {
        visibility: visibility,
        shared_users: visibility === "PRIVATE" ? selectedUsers : [],
        shared_roles: visibility === "PRIVATE" ? selectedRoles : []
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

  const toggleRole = (roleId: number) => {
    setSelectedRoles(prev => 
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    );
  };

  const addUser = (userId: number) => {
    if (!selectedUsers.includes(userId)) {
      setSelectedUsers(prev => [...prev, userId]);
    }
    setUserSearchQuery("");
    setShowUserDropdown(false);
  };

  const removeUser = (userId: number) => {
    setSelectedUsers(prev => prev.filter(id => id !== userId));
  };

  // Filter firm members that are not already selected and match the search query
  const filteredDropdownUsers = firmMembers.filter(member => {
    const user = member.user;
    if (!user) return false;
    const isNotSelected = !selectedUsers.includes(user.id);
    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase();
    const email = (user.email || "").toLowerCase();
    const query = userSearchQuery.toLowerCase();
    return isNotSelected && (fullName.includes(query) || email.includes(query));
  });

  // Get User objects for currently selected user IDs
  const allocatedUsersList = firmMembers
    .filter(member => member.user && selectedUsers.includes(member.user.id))
    .map(member => member.user);

  return (
    <div className="fixed inset-0 z-[120] flex justify-end" onClick={onClose}>
      {/* Backdrop with blur effect */}
      <div className="absolute inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Slide-in Right Panel */}
      <div
        className="relative h-full w-full max-w-[460px] bg-surface-100/95 dark:bg-surface-900/95 backdrop-blur-2xl border-l border-surface-200 dark:border-surface-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
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
                <h2 className="font-black text-lg text-primary truncate max-w-[260px]">{project.title}</h2>
                <p className="text-[11px] text-surface-500 font-medium">Manage project visibility and assignment</p>
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
              <span className="text-xs font-semibold">Loading access controls...</span>
            </div>
          ) : (
            <>
              {/* Visibility Setting Group */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-surface-500">Project Visibility</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Public Card */}
                  <button
                    type="button"
                    onClick={() => setVisibility("PUBLIC")}
                    className={`p-4 rounded-xl border flex flex-col gap-2 text-left transition-all ${
                      visibility === "PUBLIC"
                        ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-sm"
                        : "border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/30 hover:border-surface-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                        <Unlock className="w-4 h-4" />
                      </div>
                      {visibility === "PUBLIC" && (
                        <Check className="w-4 h-4 text-emerald-500" />
                      )}
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-primary">Public Access</span>
                      <span className="text-[10px] text-surface-500 leading-tight block mt-0.5">
                        Visible to all personnel within the organization.
                      </span>
                    </div>
                  </button>

                  {/* Private Card */}
                  <button
                    type="button"
                    onClick={() => setVisibility("PRIVATE")}
                    className={`p-4 rounded-xl border flex flex-col gap-2 text-left transition-all ${
                      visibility === "PRIVATE"
                        ? "border-blue-500 bg-blue-500/5 dark:bg-blue-500/10 shadow-sm"
                        : "border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/30 hover:border-surface-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      {visibility === "PRIVATE" && (
                        <Check className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-primary">Private / Restricted</span>
                      <span className="text-[10px] text-surface-500 leading-tight block mt-0.5">
                        Accessible only to explicitly allocated roles and users.
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Private Settings Configuration Panel */}
              {visibility === "PRIVATE" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  
                  {/* Allocate to Roles section */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-accent" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-surface-500">Allocate to Roles</h3>
                    </div>
                    
                    {roles.length === 0 ? (
                      <p className="text-[11px] text-surface-400">No system roles available.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {roles.map((role) => {
                          const isAllocated = selectedRoles.includes(role.id);
                          return (
                            <button
                              key={role.id}
                              type="button"
                              onClick={() => toggleRole(role.id)}
                              className={`px-3 py-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                                isAllocated
                                  ? "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold"
                                  : "border-surface-200 dark:border-surface-800 bg-surface-50 hover:bg-surface-100 text-surface-600 dark:text-surface-400 font-semibold"
                              }`}
                            >
                              <span className="text-[11px] uppercase tracking-wider truncate mr-1">{role.name}</span>
                              <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                isAllocated 
                                  ? "bg-blue-500 border-blue-500 text-white" 
                                  : "border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-800"
                              }`}>
                                {isAllocated && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Allocate to Users Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-accent" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-surface-500">Allocate to Users</h3>
                    </div>

                    {/* Member Search input */}
                    <div className="relative">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-surface-400">
                        <Search className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        placeholder="Search firm members by name or email..."
                        value={userSearchQuery}
                        onChange={(e) => {
                          setUserSearchQuery(e.target.value);
                          setShowUserDropdown(true);
                        }}
                        onFocus={() => setShowUserDropdown(true)}
                        className="w-full bg-surface-50 dark:bg-surface-800/40 border border-surface-200 dark:border-surface-700/80 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold outline-none focus:border-accent"
                      />

                      {/* Dropdown list */}
                      {showUserDropdown && userSearchQuery && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setShowUserDropdown(false)} />
                          <div className="absolute left-0 right-0 mt-1 z-40 bg-surface-card border border-surface-200 dark:border-surface-800 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                            {filteredDropdownUsers.length === 0 ? (
                              <div className="p-3 text-center text-xs text-surface-400">No matching members found</div>
                            ) : (
                              filteredDropdownUsers.map((user) => (
                                <button
                                  key={user.id}
                                  type="button"
                                  onClick={() => addUser(user.id)}
                                  className="w-full px-3 py-2 flex items-center justify-between hover:bg-surface-100 text-left border-b border-surface-100 dark:border-surface-800/50 last:border-0"
                                >
                                  <div className="min-w-0 pr-2">
                                    <p className="text-xs font-bold text-primary truncate">
                                      {user.first_name || ""} {user.last_name || ""}
                                    </p>
                                    <p className="text-[10px] text-surface-400 truncate">{user.email}</p>
                                  </div>
                                  <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                                    <Plus className="w-3.5 h-3.5" />
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Allocated Users Grid/List */}
                    <div className="space-y-1.5 pt-1">
                      {allocatedUsersList.length === 0 ? (
                        <div className="p-4 border border-dashed border-surface-200 dark:border-surface-800 rounded-xl text-center">
                          <p className="text-[11px] text-surface-400 font-semibold">No individual users allocated.</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {allocatedUsersList.map((user) => (
                            <div 
                              key={user.id}
                              className="px-3 py-2 border border-surface-200/60 dark:border-surface-800/60 bg-surface-50 dark:bg-surface-800/20 rounded-xl flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-inner shrink-0 text-xs font-bold">
                                  {user.first_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || <User className="w-3 h-3" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-primary truncate">
                                    {user.first_name || ""} {user.last_name || ""}
                                  </p>
                                  <p className="text-[9px] text-surface-400 truncate">{user.email}</p>
                                </div>
                              </div>
                              
                              <button
                                type="button"
                                onClick={() => removeUser(user.id)}
                                className="w-6 h-6 rounded-md hover:bg-red-500/10 text-surface-400 hover:text-red-500 flex items-center justify-center transition-all"
                                title="Remove User Access"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
            className="flex-1 h-10 bg-accent text-background font-bold text-xs uppercase tracking-wider rounded-xl hover:opacity-95 transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-1.5"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Save Permissions</span>
          </button>
        </div>
      </div>
    </div>
  );
}
