export interface Permission {
  id: number;
  module: string;
  action: string;
  description: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
}

export type AccountRoleType = "owner" | "member";

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions?: Permission[];
  permissions_count?: number;
}

export interface User {
  id: number;
  uid: string;
  email: string;
  name: string;
  category?: string; // Pulled from profile category slug
  role?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export type RoleType = "architect" | "co_owner" | "constructor" | "client";

// Role permission mappings (Technical Roles Only)
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ["*"], // Site-Wide Superadmin Bypass
  USER: [
    "projects:read",
    "tasks:read",
    "tasks:update",
    "accounts:read"
  ],
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  ADMIN: "Site-wide administrator with full access to all system data and controls",
  USER: "Standard platform participant with access to assigned organization tasks and projects",
};
