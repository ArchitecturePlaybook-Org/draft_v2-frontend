/**
 * Project Reports Domain — API Client
 * Routes via Next.js BFF proxy to Django backend
 */

import { fetchFromBff } from "@/shared/api/fetchFromBff";
import type {
  ReportType,
  ReportAggregatePayload,
  ProjectReportSnapshot,
  PublicReportResponse,
} from "./types";

function unpackArray<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  const r = res as Record<string, unknown>;
  if (r && Array.isArray(r.results)) return r.results as T[];
  return [];
}

export interface AggregateQueryParams {
  type: ReportType;
  date?: string;
  start_date?: string;
  end_date?: string;
  year?: number;
  month?: number;
}

export interface CreateSnapshotPayload {
  report_type: ReportType;
  title: string;
  period_start: string;
  period_end: string;
  summary_data: ReportAggregatePayload;
  selected_photos?: any[];
  config?: Record<string, any>;
  is_public?: boolean;
}

export const reportsApi = {
  /**
   * Fetch pre-aggregated live report data directly from field diary & project models.
   * Drastically minimizes egress (~25KB JSON).
   */
  async getAggregate(
    projectUid: string,
    params: AggregateQueryParams
  ): Promise<{ project_uid: string; project_title: string; data: ReportAggregatePayload }> {
    const sp = new URLSearchParams();
    sp.set("type", params.type);
    if (params.date) sp.set("date", params.date);
    if (params.start_date) sp.set("start_date", params.start_date);
    if (params.end_date) sp.set("end_date", params.end_date);
    if (params.year) sp.set("year", params.year.toString());
    if (params.month) sp.set("month", params.month.toString());

    return fetchFromBff<{ project_uid: string; project_title: string; data: ReportAggregatePayload }>(
      `/api/v1/projects/projects/${projectUid}/reports/aggregate/?${sp.toString()}`,
      { skipCache: true }
    );
  },

  /**
   * List all saved report snapshots for the project.
   */
  async listSnapshots(projectUid: string): Promise<ProjectReportSnapshot[]> {
    const res = await fetchFromBff<unknown>(
      `/api/v1/projects/projects/${projectUid}/reports/`,
      { skipCache: true }
    );
    return unpackArray<ProjectReportSnapshot>(res);
  },

  /**
   * Persist a report snapshot in the database.
   */
  async createSnapshot(
    projectUid: string,
    payload: CreateSnapshotPayload
  ): Promise<ProjectReportSnapshot> {
    return fetchFromBff<ProjectReportSnapshot>(
      `/api/v1/projects/projects/${projectUid}/reports/`,
      {
        method: "POST",
        body: JSON.stringify(payload),
        skipCache: true,
      }
    );
  },

  /**
   * Delete a saved snapshot.
   */
  async deleteSnapshot(projectUid: string, reportId: number): Promise<void> {
    await fetchFromBff<void>(
      `/api/v1/projects/projects/${projectUid}/reports/${reportId}/`,
      {
        method: "DELETE",
        skipCache: true,
      }
    );
  },

  /**
   * 1-Click Toggle for Public Access Restriction.
   * If isPublic is omitted, backend toggles the boolean.
   */
  async toggleAccess(
    projectUid: string,
    reportId: number,
    isPublic?: boolean
  ): Promise<{ id: number; is_public: boolean; share_token: string; public_share_url: string; message: string }> {
    return fetchFromBff<{ id: number; is_public: boolean; share_token: string; public_share_url: string; message: string }>(
      `/api/v1/projects/projects/${projectUid}/reports/${reportId}/toggle-access/`,
      {
        method: "PATCH",
        body: JSON.stringify(isPublic !== undefined ? { is_public: isPublic } : {}),
        skipCache: true,
      }
    );
  },

  /**
   * Public Client Endpoint — unauthenticated.
   * If access is restricted (is_public == False), returns 403 or restricted payload.
   */
  async getPublicReport(shareToken: string): Promise<PublicReportResponse> {
    return fetchFromBff<PublicReportResponse>(
      `/api/v1/projects/public/reports/${shareToken}/`,
      { skipCache: true }
    );
  },
};
