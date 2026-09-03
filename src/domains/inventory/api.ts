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
  MaterialRequisition,
  MaterialRequisitionItem,
  EquipmentMaintenanceLog,
  StockAudit,
  StockAuditItem,
  StockBalance,
  SiteTransferResult,
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
  getMaterials: async (params?: string | { search?: string; category?: string }): Promise<MasterMaterial[]> => {
    const q = new URLSearchParams();
    if (typeof params === "string") {
      if (params) q.append("category", params);
    } else if (params) {
      if (params.search) q.append("search", params.search);
      if (params.category) q.append("category", params.category);
    }
    const url = q.toString() ? `/api/v1/inventory/materials/?${q}` : "/api/v1/inventory/materials/";
    const res = await fetchFromBff<any>(url, { method: "GET" });
    return unpackArray<MasterMaterial>(res);
  },

  getMaterial: async (id: string): Promise<MasterMaterial> => {
    return fetchFromBff<MasterMaterial>(`/api/v1/inventory/materials/${id}/`, {
      method: "GET",
    });
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
  getSites: async (params?: { search?: string; is_active?: boolean }): Promise<Site[]> => {
    const q = new URLSearchParams();
    if (params?.search) q.append("search", params.search);
    if (params?.is_active !== undefined) q.append("is_active", String(params.is_active));
    const url = q.toString() ? `/api/v1/inventory/sites/?${q}` : "/api/v1/inventory/sites/";
    const res = await fetchFromBff<any>(url, { method: "GET" });
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
      ? `/api/v1/inventory/stock-balance/?site=${siteId}`
      : "/api/v1/inventory/stock-balance/";
    const res = await fetchFromBff<any>(url, { method: "GET" });
    return unpackArray<SiteBalance>(res);
  },

  getSiteBalances: async (siteId: string): Promise<SiteBalance[]> => {
    const res = await fetchFromBff<any>(`/api/v1/inventory/stock-balance/?site=${siteId}`, {
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

  getTaskRequirements: async (params?: number | string | { project?: string; block?: number | string; task_id?: number | string }): Promise<TaskMaterialRequirement[]> => {
    let url = "/api/v1/inventory/task-requirements/";
    if (typeof params === "number" || typeof params === "string") {
      url += `?task_id=${params}`;
    } else if (params && typeof params === "object") {
      const q = new URLSearchParams();
      if (params.project) q.append("project", String(params.project));
      if (params.block) q.append("block", String(params.block));
      if (params.task_id) q.append("task_id", String(params.task_id));
      const qStr = q.toString();
      if (qStr) url += `?${qStr}`;
    }
    const res = await fetchFromBff<any>(url, { method: "GET" });
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

  // ── Double-Entry Stock Ledger Audit ───────────────────────────────────────
  getStockLedger: async (params?: { site_id?: string; material_id?: string; txn_type?: string }): Promise<StockLedgerEntry[]> => {
    const searchParams = new URLSearchParams();
    if (params?.site_id && params.site_id !== "ALL") searchParams.append("site_id", params.site_id);
    if (params?.material_id) searchParams.append("material_id", params.material_id);
    if (params?.txn_type && params.txn_type !== "ALL") searchParams.append("txn_type", params.txn_type);

    const query = searchParams.toString();
    const url = query ? `/api/v1/inventory/stock-ledger/?${query}` : "/api/v1/inventory/stock-ledger/";
    const res = await fetchFromBff<any>(url, { method: "GET" });
    return unpackArray<StockLedgerEntry>(res);
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

  createEquipment: async (data: any): Promise<Equipment> => {
    return fetchFromBff<Equipment>("/api/v1/inventory/equipment/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateEquipment: async (id: string, data: any): Promise<Equipment> => {
    return fetchFromBff<Equipment>(`/api/v1/inventory/equipment/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deleteEquipment: async (id: string): Promise<void> => {
    await fetchFromBff<void>(`/api/v1/inventory/equipment/${id}/`, {
      method: "DELETE",
    });
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
  getVendors: async (params?: { search?: string; is_active?: boolean }): Promise<Vendor[]> => {
    const q = new URLSearchParams();
    if (params?.search) q.append("search", params.search);
    if (params?.is_active !== undefined) q.append("is_active", String(params.is_active));
    const url = q.toString() ? `/api/v1/inventory/vendors/?${q}` : "/api/v1/inventory/vendors/";
    const res = await fetchFromBff<any>(url, { method: "GET" });
    return unpackArray<Vendor>(res);
  },

  getVendor: async (id: string): Promise<Vendor> =>
    fetchFromBff<Vendor>(`/api/v1/inventory/vendors/${id}/`, { method: "GET" }),

  createVendor: async (data: Partial<Vendor>): Promise<Vendor> =>
    fetchFromBff<Vendor>("/api/v1/inventory/vendors/", { method: "POST", body: JSON.stringify(data) }),

  updateVendor: async (id: string, data: Partial<Vendor>): Promise<Vendor> =>
    fetchFromBff<Vendor>(`/api/v1/inventory/vendors/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),

  deleteVendor: async (id: string): Promise<void> =>
    fetchFromBff<void>(`/api/v1/inventory/vendors/${id}/`, { method: "DELETE" }),

  onboardVendor: async (
    id: string,
    data?: { admin_email?: string; admin_name?: string }
  ): Promise<{
    success: boolean;
    message: string;
    vendor: Vendor;
    email_sent_to: string;
    role: string;
    token?: string;
  }> => {
    return fetchFromBff<any>(`/api/v1/inventory/vendors/${id}/onboard/`, {
      method: "POST",
      body: JSON.stringify(data || {}),
    });
  },

  verifyOnboardingToken: async (token: string): Promise<{
    valid: boolean;
    vendor_name?: string;
    vendor_code?: string;
    admin_name?: string;
    email?: string;
    error?: string;
  }> => {
    return fetchFromBff<any>(`/api/v1/inventory/vendors/verify-token/?token=${encodeURIComponent(token)}`, {
      method: "GET",
    });
  },

  completeOnboarding: async (data: {
    token: string;
    password: string;
    confirm_password: string;
  }): Promise<{
    success: boolean;
    message: string;
    access?: string;
    refresh?: string;
    user?: any;
    error?: string;
  }> => {
    return fetchFromBff<any>("/api/v1/inventory/vendors/complete-onboarding/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getPurchaseOrders: async (): Promise<PurchaseOrder[]> => {
    const res = await fetchFromBff<any>("/api/v1/inventory/purchase-orders/", { method: "GET" });
    return unpackArray<PurchaseOrder>(res);
  },

  // ── Sites / Godowns (Extensions) ─────────────────────────────────────────
  getSite: async (id: string): Promise<any> =>
    fetchFromBff<any>(`/api/v1/inventory/sites/${id}/`, { method: "GET" }),

  updateSite: async (id: string, data: Record<string, any>): Promise<any> =>
    fetchFromBff<any>(`/api/v1/inventory/sites/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),

  deleteSite: async (id: string): Promise<void> =>
    fetchFromBff<void>(`/api/v1/inventory/sites/${id}/`, { method: "DELETE" }),

  // ── Live Stock Balance ─────────────────────────────────────────────────────
  getStockBalance: async (params?: { site?: string; category?: string; low_stock?: boolean }): Promise<StockBalance[]> => {
    const q = new URLSearchParams();
    if (params?.site) q.append("site", params.site);
    if (params?.category) q.append("category", params.category);
    if (params?.low_stock) q.append("low_stock", "true");
    const url = q.toString() ? `/api/v1/inventory/stock-balance/?${q}` : "/api/v1/inventory/stock-balance/";
    return fetchFromBff<StockBalance[]>(url, { method: "GET" });
  },

  getStockAlerts: async (): Promise<StockBalance[]> =>
    fetchFromBff<StockBalance[]>("/api/v1/inventory/stock-alerts/", { method: "GET" }),

  // ── Inter-Site Transfers ───────────────────────────────────────────────────
  createTransfer: async (data: {
    from_site: string;
    to_site: string;
    material: string;
    qty: number;
    remarks?: string;
    batch_no?: string;
  }): Promise<SiteTransferResult> =>
    fetchFromBff<SiteTransferResult>("/api/v1/inventory/transfers/", { method: "POST", body: JSON.stringify(data) }),

  // ── Material Requisitions (MRN) ────────────────────────────────────────────
  getRequisitions: async (params?: { site?: string; status?: string }): Promise<MaterialRequisition[]> => {
    const q = new URLSearchParams();
    if (params?.site) q.append("site", params.site);
    if (params?.status) q.append("status", params.status);
    const url = q.toString() ? `/api/v1/inventory/requisitions/?${q}` : "/api/v1/inventory/requisitions/";
    const res = await fetchFromBff<any>(url, { method: "GET" });
    return unpackArray<MaterialRequisition>(res);
  },

  getRequisition: async (id: string): Promise<MaterialRequisition> =>
    fetchFromBff<MaterialRequisition>(`/api/v1/inventory/requisitions/${id}/`, { method: "GET" }),

  createRequisition: async (data: Record<string, any>): Promise<MaterialRequisition> =>
    fetchFromBff<MaterialRequisition>("/api/v1/inventory/requisitions/", { method: "POST", body: JSON.stringify(data) }),

  updateRequisition: async (id: string, data: Record<string, any>): Promise<MaterialRequisition> =>
    fetchFromBff<MaterialRequisition>(`/api/v1/inventory/requisitions/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),

  submitRequisition: async (id: string): Promise<MaterialRequisition> =>
    fetchFromBff<MaterialRequisition>(`/api/v1/inventory/requisitions/${id}/submit/`, { method: "POST" }),

  approveRequisition: async (id: string): Promise<MaterialRequisition> =>
    fetchFromBff<MaterialRequisition>(`/api/v1/inventory/requisitions/${id}/approve/`, { method: "POST" }),

  rejectRequisition: async (id: string, reason: string): Promise<MaterialRequisition> =>
    fetchFromBff<MaterialRequisition>(`/api/v1/inventory/requisitions/${id}/reject/`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  // ── Equipment Maintenance Logs ─────────────────────────────────────────────
  getMaintenanceLogs: async (params?: { equipment?: string }): Promise<EquipmentMaintenanceLog[]> => {
    const q = new URLSearchParams();
    if (params?.equipment) q.append("equipment", params.equipment);
    const url = q.toString() ? `/api/v1/inventory/maintenance/?${q}` : "/api/v1/inventory/maintenance/";
    const res = await fetchFromBff<any>(url, { method: "GET" });
    return unpackArray<EquipmentMaintenanceLog>(res);
  },

  createMaintenanceLog: async (data: Record<string, any>): Promise<EquipmentMaintenanceLog> =>
    fetchFromBff<EquipmentMaintenanceLog>("/api/v1/inventory/maintenance/", { method: "POST", body: JSON.stringify(data) }),

  updateMaintenanceLog: async (id: string, data: Record<string, any>): Promise<EquipmentMaintenanceLog> =>
    fetchFromBff<EquipmentMaintenanceLog>(`/api/v1/inventory/maintenance/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),

  deleteMaintenanceLog: async (id: string): Promise<void> =>
    fetchFromBff<void>(`/api/v1/inventory/maintenance/${id}/`, { method: "DELETE" }),

  // ── Physical Stock Audits ──────────────────────────────────────────────────
  getStockAudits: async (): Promise<StockAudit[]> => {
    const res = await fetchFromBff<any>("/api/v1/inventory/stock-audits/", { method: "GET" });
    return unpackArray<StockAudit>(res);
  },

  getStockAudit: async (id: string): Promise<StockAudit> =>
    fetchFromBff<StockAudit>(`/api/v1/inventory/stock-audits/${id}/`, { method: "GET" }),

  createStockAudit: async (data: Record<string, any>): Promise<StockAudit> =>
    fetchFromBff<StockAudit>("/api/v1/inventory/stock-audits/", { method: "POST", body: JSON.stringify(data) }),

  updateStockAudit: async (id: string, data: Record<string, any>): Promise<StockAudit> =>
    fetchFromBff<StockAudit>(`/api/v1/inventory/stock-audits/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),

  postAuditVariances: async (id: string): Promise<StockAudit> =>
    fetchFromBff<StockAudit>(`/api/v1/inventory/stock-audits/${id}/post_variances/`, { method: "POST" }),

  // ── Convenience Aliases ────────────────────────────────────────────────────
  getEquipment: async (params?: { search?: string; site_id?: string; status?: string }): Promise<Equipment[]> => {
    const q = new URLSearchParams();
    if (params?.search) q.append("search", params.search);
    if (params?.site_id) q.append("site_id", params.site_id);
    if (params?.status) q.append("status", params.status);
    const url = q.toString() ? `/api/v1/inventory/equipment/?${q}` : "/api/v1/inventory/equipment/";
    const res = await fetchFromBff<any>(url, { method: "GET" });
    return unpackArray<Equipment>(res);
  },





  getPurchaseOrder: async (id: string): Promise<PurchaseOrder> => {
    return fetchFromBff<PurchaseOrder>(`/api/v1/inventory/purchase-orders/${id}/`, {
      method: "GET",
    });
  },

  updatePurchaseOrder: async (id: string, data: Partial<PurchaseOrder>): Promise<PurchaseOrder> => {
    return fetchFromBff<PurchaseOrder>(`/api/v1/inventory/purchase-orders/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  createPurchaseOrder: async (data: {
    vendor: string;
    site: string;
    expected_delivery_date?: string;
    terms_and_conditions?: string;
    subtotal_amount?: number;
    tax_amount?: number;
    total_amount?: number;
    items: Array<{
      material: string;
      qty: number;
      rate: number;
      tax_percent?: number;
    }>;
  }): Promise<PurchaseOrder> => {
    return fetchFromBff<PurchaseOrder>("/api/v1/inventory/purchase-orders/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  //  Manpower / Labor Master 
  getLaborMasters: async (): Promise<LaborMaster[]> => {
    const res = await fetchFromBff<any>("/api/v1/inventory/labor/", { method: "GET" });
    return unpackArray<LaborMaster>(res);
  },

  createLaborMaster: async (data: Partial<LaborMaster>): Promise<LaborMaster> => {
    return fetchFromBff<LaborMaster>("/api/v1/inventory/labor/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateLaborMaster: async (id: string, data: Partial<LaborMaster>): Promise<LaborMaster> => {
    return fetchFromBff<LaborMaster>(`/api/v1/inventory/labor/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deleteLaborMaster: async (id: string): Promise<void> => {
    await fetchFromBff(`/api/v1/inventory/labor/${id}/`, {
      method: "DELETE",
    });
  },
};



export interface LaborMaster {
  id: string;
  account: number;
  trade_type: string;
  category: "SKILLED" | "SEMI_SKILLED" | "UNSKILLED" | "SUPERVISORY" | "OPERATOR";
  vendor: number | null;
  vendor_name?: string;
  standard_daily_rate: string;
  is_active: boolean;
  created_at: string;
}

