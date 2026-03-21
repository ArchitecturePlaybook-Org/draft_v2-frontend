export interface Permission {
  id: number;
  module: string;
  action: string;
  description: string;
}

export interface Role {
  id: number;
  name: "admin" | "editor" | "viewer" | string;
  description: string;
  permissions?: Permission[];
  permissions_count?: number;
}

export interface User {
  id: number;
  email: string;
  name: string;
  is_active: boolean;
  role?: string | null;
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

export type RoleType = "admin" | "editor" | "viewer" | "architect";

// Role permission mappings (from backend seeded data)
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    "users:create", "users:read", "users:update", "users:delete", "users:list",
    "roles:create", "roles:read", "roles:update", "roles:delete", "roles:list",
    "permissions:create", "permissions:read", "permissions:assign",
    "posts:create", "posts:read", "posts:update", "posts:delete", "posts:list",
    "reports:create", "reports:read", "reports:list",
  ],
  architect: [
    "users:create", "users:read", "users:update", "users:delete", "users:list",
    "roles:create", "roles:read", "roles:update", "roles:delete", "roles:list",
    "permissions:create", "permissions:read", "permissions:assign",
    "posts:create", "posts:read", "posts:update", "posts:delete", "posts:list",
    "reports:create", "reports:read", "reports:list",
  ],
  editor: [
    "users:create", "users:read", "users:update", "users:list",
    "posts:create", "posts:read", "posts:update", "posts:delete", "posts:list",
    "reports:read", "reports:list",
  ],
  viewer: [
    "users:read", "users:list",
    "posts:read", "posts:list",
    "reports:read", "reports:list",
    "roles:read",
  ],
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Full system access — manage users, roles, permissions, content and reports",
  architect: "System design access — advanced configuration and infrastructure management",
  editor: "Content management — create, edit, delete posts and view reports",
  viewer: "Read-only access — browse users, posts and reports",
};
