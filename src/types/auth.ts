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
  is_onboarding_complete?: boolean;
  category_path?: {
    main?: string;
    selected?: Record<string, string[]>;
  } | null;
  website?: string;
  social_links?: Record<string, unknown>;
  specializations?: any[];
  is_public?: boolean;
}

export interface User {
  id: number;
  uid: string;
  email: string;
  name: string;
  first_name?: string;
  last_name?: string;
  category?: string; // Pulled from profile category slug
  role?: string | null;
  user_type?: "architect" | "builder" | "contractor" | "supplier" | "client";
  profile?: UserProfile;
  is_active: boolean;
  is_2fa_enabled?: boolean;
  email_task_reminders?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface OrgMetadata {
  timezone?: string;
  currency?: string;
  unit_system?: "metric" | "imperial";
  company_reg?: string;
  tax_id?: string;
  insurance_policy?: string;
  license_id?: string;
  [key: string]: unknown;
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
  metadata?: OrgMetadata;
  social_links?: Record<string, string>;
  enable_auto_join?: boolean;
  auto_join_domain?: string;
  created_at?: string;
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
  access?: string;
  refresh?: string;
  user?: User;
  requires_2fa?: boolean;
  pre_auth_token?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export type RoleType = "architect" | "co_owner" | "constructor" | "client";

// Role permission mappings (Technical & Domain Roles)
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ["*"], // Site-Wide Superadmin Bypass
  architect: ["*"],
  co_owner: ["*"],
  constructor: ["*"],
  client: ["projects:read", "tasks:read"],
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
