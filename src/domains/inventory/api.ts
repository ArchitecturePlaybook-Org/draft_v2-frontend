import { fetchFromBff } from "@/shared/api/fetchFromBff";
import {
  MasterMaterial,
  MaterialCategoryMaster,
  MaterialBrandMaster,
  Site,
  SiteBalance,
  TaskMaterialRequirement,
  ProjectMaterialSummaryItem,
  StockLedgerEntry,
  Vendor,
  PurchaseOrder,
  Delivery,
  MaterialIssue,
  Equipment,
  EquipmentMovement,
} from "./types";

function unpackArray<T>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (res.results && Array.isArray(res.results)) return res.results;
  return [];
}

export const inventoryApi = {
  // ── Material Brands & Manufacturers ──────────────────────────────────────
  getBrands: async (params?: { search?: string; quality_tier?: string; category?: string }): Promise<MaterialBrandMaster[]> => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append("search", params.search);
    if (params?.quality_tier && params.quality_tier !== "ALL") searchParams.append("quality_tier", params.quality_tier);
    if (params?.category && params.category !== "ALL") searchParams.append("category", params.category);
    
    const query = searchParams.toString();
    const url = query ? `/api/v1/inventory/brands/?${query}` : "/api/v1/inventory/brands/";
    const res = await fetchFromBff<any>(url, { method: "GET" });
    return unpackArray<MaterialBrandMaster>(res);
  },

  getBrand: async (id: string): Promise<MaterialBrandMaster> => {
    return fetchFromBff<MaterialBrandMaster>(`/api/v1/inventory/brands/${id}/`, {
      method: "GET",
    });
  },

  createBrand: async (data: Partial<MaterialBrandMaster>): Promise<MaterialBrandMaster> => {
    return fetchFromBff<MaterialBrandMaster>("/api/v1/inventory/brands/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateBrand: async (id: string, data: Partial<MaterialBrandMaster>): Promise<MaterialBrandMaster> => {
    return fetchFromBff<MaterialBrandMaster>(`/api/v1/inventory/brands/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deleteBrand: async (id: string): Promise<void> => {
    return fetchFromBff<void>(`/api/v1/inventory/brands/${id}/`, {
      method: "DELETE",
    });
  },

  // ── Material Categories ───────────────────────────────────────────────────
  getCategories: async (search?: string): Promise<MaterialCategoryMaster[]> => {
    const url = search
      ? `/api/v1/inventory/categories/?search=${encodeURIComponent(search)}`
      : "/api/v1/inventory/categories/";
    const res = await fetchFromBff<any>(url, { method: "GET" });
    return unpackArray<MaterialCategoryMaster>(res);
  },

  getCategory: async (id: string): Promise<MaterialCategoryMaster> => {
    return fetchFromBff<MaterialCategoryMaster>(`/api/v1/inventory/categories/${id}/`, {
      method: "GET",
    });
  },

  createCategory: async (data: Partial<MaterialCategoryMaster>): Promise<MaterialCategoryMaster> => {
    return fetchFromBff<MaterialCategoryMaster>("/api/v1/inventory/categories/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateCategory: async (id: string, data: Partial<MaterialCategoryMaster>): Promise<MaterialCategoryMaster> => {
    return fetchFromBff<MaterialCategoryMaster>(`/api/v1/inventory/categories/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deleteCategory: async (id: string): Promise<void> => {
    return fetchFromBff<void>(`/api/v1/inventory/categories/${id}/`, {
      method: "DELETE",
    });
  },

  // ── Materials ─────────────────────────────────────────────────────────────
  getMaterials: async (category?: string): Promise<MasterMaterial[]> => {
    const url = category
      ? `/api/v1/inventory/materials/?category=${category}`
      : "/api/v1/inventory/materials/";
    const res = await fetchFromBff<any>(url, { method: "GET" });
    return unpackArray<MasterMaterial>(res);
  },

  createMaterial: async (data: Partial<MasterMaterial>): Promise<MasterMaterial> => {
    return fetchFromBff<MasterMaterial>("/api/v1/inventory/materials/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateMaterial: async (id: string, data: Partial<MasterMaterial>): Promise<MasterMaterial> => {
    return fetchFromBff<MasterMaterial>(`/api/v1/inventory/materials/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deleteMaterial: async (id: string): Promise<void> => {
    await fetchFromBff(`/api/v1/inventory/materials/${id}/`, {
      method: "DELETE",
    });
  },

  // ── Sites & Balances ──────────────────────────────────────────────────────
  getSites: async (): Promise<Site[]> => {
    const res = await fetchFromBff<any>("/api/v1/inventory/sites/", { method: "GET" });
    return unpackArray<Site>(res);
  },

  createSite: async (data: Partial<Site>): Promise<Site> => {
    return fetchFromBff<Site>("/api/v1/inventory/sites/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getAllBalances: async (siteId?: string): Promise<SiteBalance[]> => {
    const url = siteId
      ? `/api/v1/inventory/sites/all-balances/?site_id=${siteId}`
      : "/api/v1/inventory/sites/all-balances/";
    const res = await fetchFromBff<any>(url, { method: "GET" });
    return unpackArray<SiteBalance>(res);
  },

  getSiteBalances: async (siteId: string): Promise<SiteBalance[]> => {
    const res = await fetchFromBff<any>(`/api/v1/inventory/sites/${siteId}/balances/`, {
      method: "GET",
    });
    return unpackArray<SiteBalance>(res);
  },

  // ── Stock Ledger ──────────────────────────────────────────────────────────
  getLedgerEntries: async (params?: { site_id?: string; material_id?: string; txn_type?: string }): Promise<StockLedgerEntry[]> => {
    const searchParams = new URLSearchParams();
    if (params?.site_id) searchParams.append("site_id", params.site_id);
    if (params?.material_id) searchParams.append("material_id", params.material_id);
    if (params?.txn_type) searchParams.append("txn_type", params.txn_type);
    
    const url = `/api/v1/inventory/stock-ledger/?${searchParams.toString()}`;
    const res = await fetchFromBff<any>(url, { method: "GET" });
    return unpackArray<StockLedgerEntry>(res);
  },

  transferMaterial: async (data: {
    from_site_id: string;
    to_site_id: string;
    material_id: string;
    qty: number;
    vehicle_no?: string;
    remarks?: string;
  }): Promise<{ success: boolean; message?: string }> => {
    return fetchFromBff("/api/v1/inventory/stock-ledger/transfer/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // ── Task Material Requirements ────────────────────────────────────────────
  getTaskRequirements: async (taskId: number): Promise<TaskMaterialRequirement[]> => {
    const res = await fetchFromBff<any>(`/api/v1/inventory/task-requirements/?task_id=${taskId}`, {
      method: "GET",
    });
    return unpackArray<TaskMaterialRequirement>(res);
  },

  calculateAndAttachTaskMaterial: async (data: {
    task_id: number;
    material_id: string;
    input_quantity: number;
    input_unit?: string;
    calc_params?: Record<string, any>;
  }): Promise<TaskMaterialRequirement> => {
    return fetchFromBff<TaskMaterialRequirement>(
      "/api/v1/inventory/task-requirements/calculate-and-attach/",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },

  getProjectMaterialSummary: async (projectId: number): Promise<ProjectMaterialSummaryItem[]> => {
    const res = await fetchFromBff<any>(
      `/api/v1/inventory/task-requirements/project-summary/${projectId}/`,
      { method: "GET" }
    );
    return unpackArray<ProjectMaterialSummaryItem>(res);
  },

  // ── Deliveries & Digital GRN ──────────────────────────────────────────────
  getDeliveries: async (): Promise<Delivery[]> => {
    const res = await fetchFromBff<any>("/api/v1/inventory/deliveries/", { method: "GET" });
    return unpackArray<Delivery>(res);
  },

  createDelivery: async (data: Partial<Delivery>): Promise<Delivery> => {
    return fetchFromBff<Delivery>("/api/v1/inventory/deliveries/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  verifyDelivery: async (
    deliveryId: string,
    data: {
      items: Array<{
        item_id: string;
        qty_delivered: number;
        qty_accepted: number;
        rejection_reason?: string;
        batch_no?: string;
      }>;
      supervisor_notes?: string;
    }
  ): Promise<Delivery> => {
    return fetchFromBff<Delivery>(`/api/v1/inventory/deliveries/${deliveryId}/verify/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // ── Material Issue Slips ──────────────────────────────────────────────────
  getMaterialIssues: async (): Promise<MaterialIssue[]> => {
    const res = await fetchFromBff<any>("/api/v1/inventory/issues/", { method: "GET" });
    return unpackArray<MaterialIssue>(res);
  },

  createMaterialIssue: async (data: {
    site: string;
    material: string;
    qty: number;
    issued_to: string;
    worker_trade: string;
    task?: number | null;
    purpose?: string;
    location_in_site?: string;
  }): Promise<MaterialIssue> => {
    return fetchFromBff<MaterialIssue>("/api/v1/inventory/issues/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // ── Equipment & Tools ─────────────────────────────────────────────────────
  getEquipmentList: async (params?: { site_id?: string; status?: string }): Promise<Equipment[]> => {
    const searchParams = new URLSearchParams();
    if (params?.site_id) searchParams.append("site_id", params.site_id);
    if (params?.status) searchParams.append("status", params.status);
    
    const url = `/api/v1/inventory/equipment/?${searchParams.toString()}`;
    const res = await fetchFromBff<any>(url, { method: "GET" });
    return unpackArray<Equipment>(res);
  },

  checkoutEquipment: async (
    equipmentId: string,
    data: { custodian_id?: number; custodian_name: string; site_id?: string; notes?: string }
  ): Promise<Equipment> => {
    return fetchFromBff<Equipment>(`/api/v1/inventory/equipment/${equipmentId}/checkout/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  checkinEquipment: async (
    equipmentId: string,
    data: { site_id: string; notes?: string }
  ): Promise<Equipment> => {
    return fetchFromBff<Equipment>(`/api/v1/inventory/equipment/${equipmentId}/checkin/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  dispatchEquipmentTransfer: async (
    equipmentId: string,
    data: { to_site_id: string; vehicle_no?: string; driver_contact?: string; notes?: string }
  ): Promise<EquipmentMovement> => {
    return fetchFromBff<EquipmentMovement>(
      `/api/v1/inventory/equipment/${equipmentId}/dispatch-transfer/`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },

  getEquipmentMovements: async (): Promise<EquipmentMovement[]> => {
    const res = await fetchFromBff<any>("/api/v1/inventory/equipment-movements/", { method: "GET" });
    return unpackArray<EquipmentMovement>(res);
  },

  receiveEquipmentTransfer: async (
    movementId: string,
    notes?: string
  ): Promise<EquipmentMovement> => {
    return fetchFromBff<EquipmentMovement>(
      `/api/v1/inventory/equipment-movements/${movementId}/receive/`,
      {
        method: "POST",
        body: JSON.stringify({ notes }),
      }
    );
  },

  // ── Vendors & Purchase Orders ─────────────────────────────────────────────
  getVendors: async (): Promise<Vendor[]> => {
    const res = await fetchFromBff<any>("/api/v1/inventory/vendors/", { method: "GET" });
    return unpackArray<Vendor>(res);
  },

  getPurchaseOrders: async (): Promise<PurchaseOrder[]> => {
    const res = await fetchFromBff<any>("/api/v1/inventory/purchase-orders/", { method: "GET" });
    return unpackArray<PurchaseOrder>(res);
  },

  // ── Calculator Engine API ─────────────────────────────────────────────────
  runCalculator: async (payload: Record<string, any>): Promise<any> => {
    return fetchFromBff<any>("/api/v1/inventory/calculate/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
