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

export type RoleType = "architect" | "co_owner" | "constructor" | "client" | "admin" | "editor" | "viewer";

// Role permission mappings (from backend seeded data)
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  architect: [
    "users:create", "users:read", "users:update", "users:delete", "users:list",
    "roles:create", "roles:read", "roles:update", "roles:delete", "roles:list",
    "permissions:create", "permissions:read", "permissions:assign",
    "posts:create", "posts:read", "posts:update", "posts:delete", "posts:list",
    "reports:create", "reports:read", "reports:list",
  ],
  co_owner: [
    "users:create", "users:read", "users:update", "users:delete", "users:list",
    "roles:create", "roles:read", "roles:update", "roles:delete", "roles:list",
    "permissions:create", "permissions:read", "permissions:assign",
    "posts:create", "posts:read", "posts:update", "posts:delete", "posts:list",
    "reports:create", "reports:read", "reports:list",
  ],
  constructor: [
    "users:create", "users:read", "users:update", "users:list",
    "posts:create", "posts:read", "posts:update", "posts:delete", "posts:list",
    "reports:read", "reports:list",
  ],
  client: [
    "users:read", "users:list",
    "posts:read", "posts:list",
    "reports:read", "reports:list",
  ],
  // Legacy/Internal aliases
  admin: ["*"], 
  editor: ["posts:*", "users:read"],
  viewer: ["*:read"],
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  architect: "Full system access — manage users, roles, permissions, and professional workflows",
  co_owner: "Partner access — Nearly full system control and high-level management",
  constructor: "Project & User management — oversee construction workflows and team members",
  client: "Client access — Monitor project progress and manage account/payments",
};
