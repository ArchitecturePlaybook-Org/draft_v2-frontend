"use client";

import { useAuthStore } from "@/store/auth-store";
import { ROLE_PERMISSIONS } from "@/types/auth";
import { ProjectDetail } from "@/types/projects";

/**
 * Unified Permissions Hook for Triple-Layered RBAC:
 * 1. Global Role (Architect, Client, etc.)
 * 2. Account-level Role (Owner, Member)
 * 3. Project-level Role (Manager, Editor, Viewer)
 */
export function usePermissions() {
  const { user } = useAuthStore();

  const roleName = typeof user?.role === "string" 
    ? user.role 
    : (user?.role as any)?.name || "";

  const isAdmin = roleName?.toUpperCase() === "ADMIN";

  const hasGlobalPermission = (module: string, action: string) => {
    if (isAdmin) return true;
    if (!user) return false;

    let permissions: string[] = [];

    const roleEntry = roleName ? ROLE_PERMISSIONS[roleName] : null;

    if (Array.isArray(roleEntry)) {
      permissions = roleEntry;
    } else if (roleEntry && typeof roleEntry === "object" && Array.isArray((roleEntry as any).allowed)) {
      permissions = (roleEntry as any).allowed;
    } else if (Array.isArray((user as any)?.permissions)) {
      permissions = (user as any).permissions;
    } else if (user?.role && typeof user.role === "object" && Array.isArray((user.role as any).permissions)) {
      permissions = (user.role as any).permissions.map((p: any) => typeof p === "string" ? p : `${p.module}:${p.action}`);
    } else if (Array.isArray(ROLE_PERMISSIONS.USER)) {
      permissions = ROLE_PERMISSIONS.USER;
    }

    if (!Array.isArray(permissions)) {
      permissions = [];
    }

    return permissions.includes("*") || 
           permissions.includes(`${module}:*`) || 
           permissions.includes(`${module}:${action}`);
  };

  /**
   * Check if user is the explicit creator or site admin.
   */
  const isProjectCreator = (project: ProjectDetail | any): boolean => {
    if (!user || !project) return false;
    if (isAdmin) return true;
    const creatorUid = project.created_by?.uid;
    const creatorId = project.created_by?.id;
    return (
      (creatorUid && user.uid && creatorUid === user.uid) ||
      (creatorId && user.id && creatorId === user.id)
    );
  };

  /**
   * Check if user has a specific role in a project.
   */
  const getProjectRole = (project: ProjectDetail): string | null => {
    if (!user || !project) return null;
    if (isAdmin) return "manager";
    if (isProjectCreator(project)) return "manager";
    
    const membership = project.memberships?.find(m => 
      (m.user?.uid && m.user.uid === user.uid) || 
      (m.user?.id && user.id && m.user.id === user.id)
    );
    if (membership) return membership.role;

    // Check if user is in shared_users or if project is PUBLIC within organization
    const sharedUsers = project.shared_users || [];
    const isSharedUser = Array.isArray(sharedUsers) && (
      (user.id && sharedUsers.includes(user.id)) || 
      (user.uid && sharedUsers.includes(user.uid as any))
    );

    const isOrgPublic = project.visibility === "PUBLIC";

    if (isSharedUser || isOrgPublic) {
      return "editor"; // Granted access to shared or public org project
    }

    return null;
  };

  const projectPermissions = (project: ProjectDetail) => {
    const role = getProjectRole(project);
    return {
      isManager: role === "manager" || isAdmin,
      isEditor: role === "manager" || role === "editor" || isAdmin,
      isViewer: !!role || isAdmin,
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
    isProjectCreator,
    getProjectRole,
    projectPermissions,
    canManageProject,
    canEditProject,
    category: user?.category
  };
}
