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

export interface UserProfile {
  phone_number?: string;
  bio?: string;
  profile_picture?: string;
  address?: Record<string, unknown>;
  metadata: Record<string, unknown>;
  category_path?: {
    main?: string;
    selected?: Record<string, string[]>;
  } | null;
  website?: string;
  social_links?: Record<string, unknown>;
}

export interface User {
  id: number;
  uid: string;
  email: string;
  name: string;
  category?: string; // Pulled from profile category slug
  role?: string | null;
  user_type?: "architect" | "builder" | "contractor" | "supplier" | "client";
  profile?: UserProfile;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Organization {
  id: number;
  uid: string;
  name: string;
  slug: string;
  tagline?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  logo?: string;
  metadata?: Record<string, unknown>;
  social_links?: Record<string, string>;
}

export interface Invitation {
  id: string;
  email: string;
  role: "admin" | "employee";
  organization_name: string;
  invited_by_email: string;
  is_accepted: boolean;
  expires_at: string;
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
