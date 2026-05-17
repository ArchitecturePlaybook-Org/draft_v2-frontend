import { fetchFromBff } from "@/shared/api/fetchFromBff";

export interface Lead {
  id: number;
  client: string; // UUID or ID
  professional: string; // UUID or ID
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
  created_at: string;
  updated_at: string;
}

export const leadsApi = {
  /**
   * List leads.
   * @param type 'sent' (inquiries made by user) or 'received' (leads for user)
   */
  listLeads: async (type: 'sent' | 'received' = 'received') => {
    return fetchFromBff<Lead[]>(`/api/users/leads/?type=${type}`, {
      method: "GET",
    });
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
    return fetchFromBff<Lead>("/api/users/leads/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Update lead status.
   */
  updateLeadStatus: async (leadId: number, status: Lead['status']) => {
    return fetchFromBff<Lead>(`/api/users/leads/${leadId}/`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
};
