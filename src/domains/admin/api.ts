import { fetchFromBff } from "@/shared/api/fetchFromBff";

export interface AdminTenantListItem {
  id: number;
  uid: string;
  name: string;
  slug: string;
  account_type: string;
  is_active: boolean;
  is_deleted: boolean;
  users_count: number;
  projects_count: number;
  plan_name: string;
  plan_code: string;
  storage_used_gb: number;
  created_at: string;
}

export interface AdminTenantDetail extends AdminTenantListItem {
  email: string | null;
  phone: string | null;
  deleted_at: string | null;
  metadata: Record<string, any>;
}

export const adminApi = {
  listTenants: async (params?: { search?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    
    const queryString = query.toString();
    const url = queryString ? `/api/v1/orgs/admin/tenants/?${queryString}` : `/api/v1/orgs/admin/tenants/`;
    return fetchFromBff<AdminTenantListItem[]>(url);
  },

  getTenant: async (id: number) => {
    return fetchFromBff<AdminTenantDetail>(`/api/v1/orgs/admin/tenants/${id}/`);
  },

  updateTenant: async (id: number, data: { is_active?: boolean; is_deleted?: boolean; metadata?: Record<string, any> }) => {
    return fetchFromBff<AdminTenantDetail>(`/api/v1/orgs/admin/tenants/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};
