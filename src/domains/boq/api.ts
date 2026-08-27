import { fetchFromBff } from "@/shared/api/fetchFromBff";
import { 
  BOQParameters, 
  BOQResult, 
  BOQSessionSummary, 
  BOQTypologyDB, 
  DSRRateMasterDB, 
  BOQCalculationRuleDB, 
  BOQTypologyPresetDB 
} from "./types";

function unpackArray<T>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (res.results && Array.isArray(res.results)) return res.results;
  return [];
}

export const boqApi = {
  // ── Client / Public Endpoints ─────────────────────────────────────────────
  
  /** Fetch active structure types (typologies) loaded from DB */
  getTypologies: async (): Promise<BOQTypologyDB[]> => {
    const res = await fetchFromBff<any>("/api/v1/projects/boq/typologies/", {
      method: "GET",
    });
    return unpackArray<BOQTypologyDB>(res);
  },

  /** Fetch preset dimension templates from DB */
  getPresets: async (typologySlug?: string): Promise<BOQTypologyPresetDB[]> => {
    const url = typologySlug 
      ? `/api/v1/projects/boq/presets/?typology=${typologySlug}` 
      : "/api/v1/projects/boq/presets/";
    const res = await fetchFromBff<any>(url, {
      method: "GET",
    });
    return unpackArray<BOQTypologyPresetDB>(res);
  },

  /** Server-side BOQ calculation evaluated from database rules */
  calculate: async (params: BOQParameters): Promise<BOQResult> => {
    return fetchFromBff<BOQResult>("/api/v1/projects/boq/calculate/", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  /** List saved BOQ sessions */
  listSessions: async (): Promise<BOQSessionSummary[]> => {
    const res = await fetchFromBff<any>("/api/v1/projects/boq/sessions/", {
      method: "GET",
    });
    return unpackArray<BOQSessionSummary>(res);
  },

  /** Save a BOQ session to database */
  saveSession: async (params: BOQParameters & { name?: string }): Promise<{ id: number; total_cost_estimate: number }> => {
    return fetchFromBff("/api/v1/projects/boq/sessions/", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  /** Get a saved BOQ session by ID */
  getSession: async (id: number): Promise<BOQResult & BOQParameters & { id: number; name: string }> => {
    return fetchFromBff(`/api/v1/projects/boq/sessions/${id}/`, {
      method: "GET",
    });
  },

  /** Export BOQ as formula-bound Excel (.xlsx) */
  exportExcel: async (params: BOQParameters): Promise<void> => {
    const res = await fetch("/api/v1/projects/boq/export-excel/", {
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
    a.download = `BOQ_${params.typology}_ArchitecturePlaybook.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // ── Super Admin Management Endpoints ──────────────────────────────────────
  
  adminGetTypologies: async (): Promise<BOQTypologyDB[]> => {
    const res = await fetchFromBff<any>("/api/v1/projects/admin/boq/typologies/", { method: "GET" });
    return unpackArray<BOQTypologyDB>(res);
  },

  adminCreateTypology: async (data: Partial<BOQTypologyDB>): Promise<BOQTypologyDB> => {
    return fetchFromBff<BOQTypologyDB>("/api/v1/projects/admin/boq/typologies/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  adminUpdateTypology: async (slug: string, data: Partial<BOQTypologyDB>): Promise<BOQTypologyDB> => {
    return fetchFromBff<BOQTypologyDB>(`/api/v1/projects/admin/boq/typologies/${slug}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  adminDeleteTypology: async (slug: string): Promise<void> => {
    return fetchFromBff(`/api/v1/projects/admin/boq/typologies/${slug}/`, { method: "DELETE" });
  },

  adminCloneTypology: async (slug: string, data: { name: string; slug?: string }): Promise<BOQTypologyDB> => {
    return fetchFromBff<BOQTypologyDB>(`/api/v1/projects/admin/boq/typologies/${slug}/clone/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  adminGetRates: async (filters?: { state?: string; chapter_no?: number; search?: string }): Promise<DSRRateMasterDB[]> => {
    const params = new URLSearchParams();
    if (filters?.state && filters.state !== "all") params.append("state", filters.state);
    if (filters?.chapter_no) params.append("chapter_no", filters.chapter_no.toString());
    if (filters?.search) params.append("search", filters.search);
    const queryString = params.toString() ? `?${params.toString()}` : "";
    const res = await fetchFromBff<any>(`/api/v1/projects/admin/boq/rates/${queryString}`, { method: "GET" });
    return unpackArray<DSRRateMasterDB>(res);
  },

  adminUpdateRate: async (itemCode: string, data: Partial<DSRRateMasterDB>): Promise<DSRRateMasterDB> => {
    return fetchFromBff<DSRRateMasterDB>(`/api/v1/projects/admin/boq/rates/${itemCode}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  adminCreateRate: async (data: Partial<DSRRateMasterDB>): Promise<DSRRateMasterDB> => {
    return fetchFromBff<DSRRateMasterDB>("/api/v1/projects/admin/boq/rates/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  adminGetRules: async (typologySlug?: string): Promise<BOQCalculationRuleDB[]> => {
    const url = typologySlug 
      ? `/api/v1/projects/admin/boq/rules/?typology=${typologySlug}&limit=1000`
      : "/api/v1/projects/admin/boq/rules/?limit=1000";
    const res = await fetchFromBff<any>(url, { method: "GET" });
    return unpackArray<BOQCalculationRuleDB>(res);
  },

  adminUpdateRule: async (id: number, data: Partial<BOQCalculationRuleDB>): Promise<BOQCalculationRuleDB> => {
    return fetchFromBff<BOQCalculationRuleDB>(`/api/v1/projects/admin/boq/rules/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  adminCreateRule: async (data: Partial<BOQCalculationRuleDB>): Promise<BOQCalculationRuleDB> => {
    return fetchFromBff<BOQCalculationRuleDB>("/api/v1/projects/admin/boq/rules/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  adminDeleteRule: async (id: number): Promise<void> => {
    return fetchFromBff(`/api/v1/projects/admin/boq/rules/${id}/`, { method: "DELETE" });
  },

  estimateIFC: async (payload: {
    state?: string;
    elements?: any[];
    file?: File;
    deepseek_api_key?: string;
  }): Promise<any> => {
    if (payload.file) {
      const formData = new FormData();
      formData.append("file", payload.file);
      if (payload.state) formData.append("state", payload.state);
      if (payload.deepseek_api_key) formData.append("deepseek_api_key", payload.deepseek_api_key);
      return fetchFromBff("/api/v1/projects/boq/ifc-estimate/", {
        method: "POST",
        body: formData,
      });
    }

    return fetchFromBff("/api/v1/projects/boq/ifc-estimate/", {
      method: "POST",
      body: JSON.stringify({
        state: payload.state || "national",
        elements: payload.elements,
        deepseek_api_key: payload.deepseek_api_key,
      }),
    });
  },
};

