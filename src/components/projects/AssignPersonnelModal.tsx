import React, { useState, useEffect } from "react";
import { orgsApi } from "@/domains/orgs/api";
import { projectsApi } from "@/domains/projects/api";
import { useProjectStore } from "@/store/project-store";
import { Spinner } from "@/components/ui/Spinner";

interface AssignPersonnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: any; // ProjectDetail
}

export function AssignPersonnelModal({ isOpen, onClose, project }: AssignPersonnelModalProps) {
  const [orgMembers, setOrgMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("viewer");
  const [isAssigning, setIsAssigning] = useState(false);

  const [removingId, setRemovingId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const { fetchProject } = useProjectStore();

  useEffect(() => {
    if (isOpen && project?.account?.id) {
      loadOrgMembers();
    }
  }, [isOpen, project]);

  const loadOrgMembers = async () => {
    try {
      setLoadingMembers(true);
      const members = await orgsApi.listMembers(project.account.id);
      setOrgMembers(members || []);
    } catch (err) {
      console.error("Failed to load org members", err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUserId) return;
    try {
      setIsAssigning(true);
      await projectsApi.addProjectMember(project.id, Number(selectedUserId), selectedRole);
      await fetchProject(project.uid);
      setSelectedUserId(""); // reset
    } catch (err) {
      console.error("Failed to assign personnel", err);
      alert("Failed to assign personnel.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemove = async (userId: number) => {
    if (!confirm("Are you sure you want to remove this user from the project?")) return;
    try {
      setRemovingId(userId);
      await projectsApi.removeProjectMember(project.id, userId);
      await fetchProject(project.uid);
    } catch (err) {
      console.error("Failed to remove member", err);
      alert("Failed to remove member. They might be the only manager.");
    } finally {
      setRemovingId(null);
    }
  };

  const handleUpdateRole = async (userId: number, newRole: string) => {
    try {
      setUpdatingId(userId);
      await projectsApi.addProjectMember(project.id, userId, newRole);
      await fetchProject(project.uid);
    } catch (err) {
      console.error("Failed to update role", err);
      alert("Failed to update role. You might not be able to change the only manager.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isOpen) return null;

  // Filter out users who are already in the project memberships
  const currentMemberIds = new Set((project.memberships || []).map((m: any) => m.user.id));
  const availableUsers = orgMembers.filter((m: any) => !currentMemberIds.has(m.user.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-surface dark:bg-surface-dark rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/5">
          <h2 className="text-lg font-semibold text-text dark:text-white">Assign Personnel</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 transition-colors">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {/* Assignment Form */}
          <div className="mb-8 bg-gray-50 dark:bg-black/20 p-4 rounded-lg border border-gray-100 dark:border-white/5">
            <h3 className="text-sm font-semibold mb-3 text-text dark:text-white">Add New Member</h3>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2 items-center">
                <select 
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-white dark:bg-surface-dark border border-gray-300 dark:border-white/10 rounded-md text-text dark:text-white focus:ring-2 focus:ring-accent"
                >
                  <option value="">Select a user...</option>
                  {availableUsers.map((m: any) => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.first_name} {m.user.last_name} ({m.user.email})
                    </option>
                  ))}
                </select>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-32 px-3 py-2 text-sm bg-white dark:bg-surface-dark border border-gray-300 dark:border-white/10 rounded-md text-text dark:text-white focus:ring-2 focus:ring-accent"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="manager">Manager</option>
                  <option value="client">Client</option>
                </select>
              </div>
              <button
                onClick={handleAssign}
                disabled={!selectedUserId || isAssigning}
                className="w-full py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isAssigning ? <Spinner size="sm" className="mr-2" /> : null}
                Add to Project
              </button>
            </div>
          </div>

          {/* Current Members */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-text dark:text-white">Current Project Members</h3>
            {loadingMembers ? (
              <div className="flex justify-center p-4"><Spinner /></div>
            ) : (
              <div className="flex flex-col gap-2">
                {project.memberships?.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No members assigned.</p>
                )}
                {project.memberships?.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 rounded-md shadow-sm">
                    <div>
                      <p className="text-sm font-medium text-text dark:text-white">
                        {m.user.first_name} {m.user.last_name}
                      </p>
                      <p className="text-xs text-text-secondary">{m.user.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={m.role}
                        onChange={(e) => handleUpdateRole(m.user.id, e.target.value)}
                        disabled={updatingId === m.user.id}
                        className="text-xs px-2 py-1 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded text-text dark:text-white disabled:opacity-50"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="manager">Manager</option>
                        <option value="client">Client</option>
                      </select>
                      
                      <button
                        onClick={() => handleRemove(m.user.id)}
                        disabled={removingId === m.user.id}
                        className="text-xs px-3 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                      >
                        {removingId === m.user.id ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
