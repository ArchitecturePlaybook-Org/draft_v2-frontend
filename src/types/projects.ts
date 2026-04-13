import { User } from "./auth";

export type ProjectStatus = "To Start" | "Work in Progress" | "Completed";

export interface Project {
  id: number;
  title: string;
  description: string;
  status: ProjectStatus;
  owner: User;
  members_count: number;
  tasks_count: number;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = "Pending" | "In Progress" | "Done";

export interface Task {
  id: number;
  project: number;
  title: string;
  description: string;
  cost: string;
  status: TaskStatus;
  assigned_to: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: number;
  user: User;
  project_role: string;
  joined_at: string;
}

export interface ProjectDetail extends Project {
  members: ProjectMember[];
  tasks: Task[];
}
