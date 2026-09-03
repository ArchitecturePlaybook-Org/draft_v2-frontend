import { fetchFromBff } from "@/shared/api/fetchFromBff";

export interface AdminBillingOverview {
  total_revenue: number;
  total_subscriptions: number;
  active_paid_subscriptions: number;
  trialing_subscriptions: number;
  past_due_subscriptions: number;
  canceled_subscriptions: number;
  pending_refunds_count: number;
  plan_distribution: {
    plan_code: string;
    plan_name: string;
    count: number;
  }[];
  recent_payments: AdminInvoiceListItem[];
}

export interface AdminPlan {
  id: number;
  name: string;
  code: string;
  description: string;
  currency: string;
  monthly_price: string | number;
  yearly_price: string | number;
  max_projects: number;
  max_storage_gb: number;
  max_team_members: number;
  max_ai_runs_per_month: number;
  trial_days: number;
  features: Record<string, any>;
  is_active: boolean;
  display_order: number;
}

export interface AdminSubscriptionListItem {
  id: number;
  account: number;
  account_name: string;
  account_uid: string;
  owner_email: string | null;
  plan: AdminPlan | null;
  status: "active" | "trialing" | "past_due" | "canceled";
  provider: "stripe" | "razorpay" | "manual";
  provider_customer_id: string;
  provider_subscription_id: string;
  transaction_id?: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  total_paid: number;
  created_at: string;
  updated_at: string;
}

export interface AdminInvoiceListItem {
  id: number;
  account_id: number;
  account_name: string;
  owner_email: string | null;
  currency: string;
  amount_due: string | number;
  amount_paid: string | number;
  status: "paid" | "open" | "uncollectible" | "void";
  provider_invoice_id: string;
  transaction_id?: string;
  pdf_url: string;
  refund_status: "pending" | "approved" | "rejected" | null;
  created_at: string;
}

export interface AdminRefundListItem {
  id: number;
  invoice: number;
  account_name: string;
  owner_email: string | null;
  invoice_amount: string | number;
  amount: string | number;
  currency: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  transaction_id?: string;
  created_at: string;
}

export const adminBillingApi = {
  getOverview: async () => {
    return fetchFromBff<AdminBillingOverview>("/api/v1/billing/admin/overview/");
  },

  listSubscriptions: async (params?: { search?: string; status?: string; plan?: string; provider?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.status) query.append("status", params.status);
    if (params?.plan) query.append("plan", params.plan);
    if (params?.provider) query.append("provider", params.provider);

    const queryString = query.toString();
    const url = queryString ? `/api/v1/billing/admin/subscriptions/?${queryString}` : `/api/v1/billing/admin/subscriptions/`;
    return fetchFromBff<AdminSubscriptionListItem[]>(url);
  },

  getSubscription: async (id: number) => {
    return fetchFromBff<AdminSubscriptionListItem>(`/api/v1/billing/admin/subscriptions/${id}/`);
  },

  updateSubscription: async (
    id: number,
    data: {
      plan_code?: string;
      status?: string;
      current_period_end?: string;
      cancel_at_period_end?: boolean;
      provider?: string;
    }
  ) => {
    return fetchFromBff<AdminSubscriptionListItem>(`/api/v1/billing/admin/subscriptions/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  listInvoices: async (params?: { search?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.status) query.append("status", params.status);

    const queryString = query.toString();
    const url = queryString ? `/api/v1/billing/admin/invoices/?${queryString}` : `/api/v1/billing/admin/invoices/`;
    return fetchFromBff<AdminInvoiceListItem[]>(url);
  },

  listRefunds: async (params?: { status?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);

    const queryString = query.toString();
    const url = queryString ? `/api/v1/billing/admin/refunds/?${queryString}` : `/api/v1/billing/admin/refunds/`;
    return fetchFromBff<AdminRefundListItem[]>(url);
  },

  actionRefund: async (id: number, action: "approve" | "reject") => {
    return fetchFromBff<AdminRefundListItem>(`/api/v1/billing/admin/refunds/${id}/action/`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
  },
};
