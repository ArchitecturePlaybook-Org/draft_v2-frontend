import { User } from "./auth";

export type ProjectStatus = "To Start" | "Work in Progress" | "Completed";

export type ProjectRole = "manager" | "editor" | "viewer";

export interface Account {
  uid: string;
  name: string;
  slug: string;
  account_type: "individual" | "organization";
}

export interface Project {
  uid: string;
  title: string;
  description: string;
  status: ProjectStatus;
  account: Account;
  created_by: User;
  memberships_count: number;
  tasks_count: number;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = "Pending" | "In Progress" | "Done";

export interface Task {
  uid: string;
  project: string; // Project UID
  title: string;
  description: string;
  cost: string;
  status: TaskStatus;
  assigned_to: User | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMembership {
  id: number;
  user: User;
  role: ProjectRole;
  joined_at: string;
}

export interface ProjectDetail extends Project {
  memberships: ProjectMembership[];
  tasks: Task[];
}
