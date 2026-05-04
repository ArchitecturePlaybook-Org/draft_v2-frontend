"use client";

import { useAuthStore } from "@/store/auth-store";
import { ROLE_PERMISSIONS } from "@/types/auth";
import { ProjectDetail, ProjectMembership } from "@/types/projects";

/**
 * Unified Permissions Hook for Triple-Layered RBAC:
 * 1. Global Role (Architect, Client, etc.)
 * 2. Account-level Role (Owner, Member)
 * 3. Project-level Role (Manager, Editor, Viewer)
 */
export function usePermissions() {
  const { user } = useAuthStore();

  const isAdmin = user?.role === "ADMIN";

  const hasGlobalPermission = (module: string, action: string) => {
    if (isAdmin) return true;
    if (!user || !user.role) return false;

    // Strict technical role check (ADMIN/USER)
    const permissions = ROLE_PERMISSIONS[user.role] || [];

    return permissions.includes("*") || 
           permissions.includes(`${module}:*`) || 
           permissions.includes(`${module}:${action}`);
  };

  /**
   * Check if user has a specific role in a project.
   */
  const getProjectRole = (project: ProjectDetail): string | null => {
    if (isAdmin) return "manager"; // Superadmin is manager of everything
    if (!user) return null;
    if (project.created_by.uid === user.uid) return "manager";
    
    const membership = project.memberships.find(m => m.user.uid === user.uid);
    return membership ? membership.role : null;
  };

  const projectPermissions = (project: ProjectDetail) => {
    const role = getProjectRole(project);
    return {
      isManager: role === "manager",
      isEditor: role === "manager" || role === "editor",
      isViewer: !!role,
      roleName: role
    };
  };

  /**
   * High-level check for project actions
   */
  const canManageProject = (project: ProjectDetail) => {
    return isAdmin || projectPermissions(project).isManager || hasGlobalPermission("projects", "delete");
  };

  const canEditProject = (project: ProjectDetail) => {
    return isAdmin || projectPermissions(project).isEditor;
  };

  return {
    isAdmin,
    hasGlobalPermission,
    getProjectRole,
    projectPermissions,
    canManageProject,
    canEditProject,
    category: user?.category
  };
}
