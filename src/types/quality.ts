import { User } from "./auth";

export type NCRSeverity = "minor" | "major" | "critical";
export type NCRStatus = "open" | "in_review" | "closed" | "verified";

export interface NCR {
  id: number;
  project: number;
  task: number | null;
  raised_by: User;
  ncr_number: string;
  title: string;
  description: string;
  severity: NCRSeverity;
  root_cause: string;
  corrective_action: string;
  status: NCRStatus;
  attachments: any[];
  due_date: string | null;
  closed_at: string | null;
  created_at: string;
}
