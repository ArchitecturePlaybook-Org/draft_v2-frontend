import { fetchFromBff } from "@/shared/api/fetchFromBff";
import { BOQParameters, BOQResult, BOQSessionSummary } from "./types";

export const boqApi = {
  /** Instant server-side BOQ calculation (no DB save) */
  calculate: async (params: BOQParameters): Promise<BOQResult> => {
    return fetchFromBff<BOQResult>("/api/v1/projects/boq/calculate", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  /** List saved BOQ sessions */
  listSessions: async (): Promise<BOQSessionSummary[]> => {
    return fetchFromBff<BOQSessionSummary[]>("/api/v1/projects/boq/sessions", {
      method: "GET",
    });
  },

  /** Save a BOQ session to database */
  saveSession: async (params: BOQParameters & { name?: string }): Promise<{ id: number; total_cost_estimate: number }> => {
    return fetchFromBff("/api/v1/projects/boq/sessions", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  /** Get a saved BOQ session by ID */
  getSession: async (id: number): Promise<BOQResult & BOQParameters & { id: number; name: string }> => {
    return fetchFromBff(`/api/v1/projects/boq/sessions/${id}`, {
      method: "GET",
    });
  },

  /** Export BOQ as Excel (.xlsx) — returns blob URL */
  exportExcel: async (params: BOQParameters): Promise<void> => {
    const res = await fetch("/api/v1/projects/boq/export-excel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      credentials: "include",
    });
    if (!res.ok) throw new Error("Excel export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "BOQ_ArchitecturePlaybook.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  },
};
