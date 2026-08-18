import { fetchFromBff } from "@/shared/api/fetchFromBff";

export interface Lead {
  id: number;
  client: string; // UUID or ID
  client_id?: number;
  professional: string; // UUID or ID
  professional_id?: number;
  portfolio_item?: number;
  client_name: string;
  professional_name: string;
  portfolio_item_title?: string;
  message: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED';
  metadata?: {
    project_type?: string;
    timeline?: string;
    budget_range?: string;
    [key: string]: any;
  };
  score?: number;
  created_at: string;
  updated_at: string;
}

export interface LeadAnalytics {
  total_leads: number;
  status_counts: {
    PENDING: number;
    ACCEPTED: number;
    REJECTED: number;
    CONVERTED: number;
  };
  conversion_rate: number;
  pipeline_value: number;
}

export const leadsApi = {
  /**
   * List leads.
   * @param type 'sent' (inquiries made by user) or 'received' (leads for user)
   */
  listLeads: async (type: 'sent' | 'received' = 'received') => {
    return fetchFromBff<Lead[]>(`/api/v1/users/leads/?type=${type}`, {
      method: "GET",
    });
  },

  /**
   * Get lead analytics for the current professional.
   */
  getAnalytics: async () => {
    return fetchFromBff<LeadAnalytics>("/api/v1/users/leads/analytics/", {
      method: "GET",
    });
  },

  /**
   * Export leads to Excel.
   */
  exportLeadsToExcel: () => {
    window.open(`/api/v1/users/leads/export/`, "_blank");
  },

  /**
   * Create a new lead (Show interest).
   */
  createLead: async (data: { 
    professional: string; 
    portfolio_item?: number; 
    message: string;
    metadata?: Record<string, any>;
  }) => {
    return fetchFromBff<Lead>("/api/v1/users/leads/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Update lead status.
   */
  updateLeadStatus: async (leadId: number, status: Lead['status']) => {
    return fetchFromBff<Lead>(`/api/v1/users/leads/${leadId}/`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
};
