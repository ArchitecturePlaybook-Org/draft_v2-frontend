import { fetchFromBff } from "@/shared/api/fetchFromBff";

export interface Plan {
  id: number;
  code: string;
  name: string;
  description: string;
  currency: string;
  monthly_price: string;
  yearly_price: string;
  max_projects: number;
  max_storage_gb: number;
  max_team_members: number;
  max_ai_runs_per_month: number;
  trial_days: number;
  display_order: number;
  features: {
    has_ai_estimation?: boolean;
    has_matrix_engine?: boolean;
    has_marketplace?: boolean;
    max_marketplace_listings?: number;
    has_field_modules?: boolean;
    has_analytics?: boolean;
    has_api_access?: boolean;
    has_custom_templates?: boolean;
    has_global_template_publish?: boolean;
    has_sso?: boolean;
    has_ip_restriction?: boolean;
    has_white_label?: boolean;
    max_showroom_items?: number;
    [key: string]: boolean | number | undefined;
  };
}

export interface Subscription {
  id: number;
  account: number;
  status: "active" | "trialing" | "past_due" | "canceled";
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  provider: string;
  created_at: string;
  updated_at: string;
  plan: Plan | null;
}

export interface Invoice {
  id: number;
  amount_due: string;
  amount_paid: string;
  status: string;
  pdf_url: string;
  currency: string;
  refund_status: string | null;
  created_at: string;
}

export interface UsageStat {
  used: number;
  limit: number;
}

export interface PlanUsage {
  plan: {
    code: string;
    name: string;
    features: Plan["features"];
  };
  subscription_status: string;
  usage: {
    projects: UsageStat;
    storage_gb: UsageStat & { used: number };
    team_members: UsageStat;
    ai_runs_this_month: UsageStat;
  };
}

function unpackArray<T>(res: any): T[] {
  if (res && Array.isArray(res.results)) return res.results;
  if (Array.isArray(res)) return res;
  return [];
}

export const billingApi = {
  /** Fetch all active subscription plans */
  getPlans: async (): Promise<Plan[]> => {
    const res = await fetchFromBff<any>("/api/v1/billing/plans/", { method: "GET" });
    return unpackArray<Plan>(res);
  },

  /** Get the current account's subscription */
  getCurrentSubscription: async (): Promise<Subscription[]> => {
    try {
      const res = await fetchFromBff<any>("/api/v1/billing/subscriptions/", { method: "GET" });
      return unpackArray<Subscription>(res);
    } catch (e: any) {
      if (e.status === 429) {
        console.warn("Billing API throttled. Suppressing error to prevent UI crash.");
        return [];
      }
      throw e;
    }
  },

  /** Get real-time usage metrics for an account */
  getUsage: async (accountId?: number): Promise<PlanUsage | null> => {
    try {
      const params = accountId ? `?account_id=${accountId}` : "";
      const res = await fetchFromBff<PlanUsage>(`/api/v1/billing/usage/${params}`, { method: "GET" });
      return res;
    } catch (e) {
      console.error("Failed to fetch plan usage", e);
      return null;
    }
  },

  /** Create a Razorpay/Stripe checkout session */
  createCheckoutSession: async (
    accountId: number,
    planCode: string,
    billingCycle: "monthly" | "yearly" = "monthly",
    provider: string = "razorpay"
  ): Promise<{ checkout_url: string }> => {
    return fetchFromBff("/api/v1/billing/create-checkout-session/", {
      method: "POST",
      body: JSON.stringify({
        account_id: accountId,
        plan_code: planCode,
        billing_cycle: billingCycle,
        provider,
      }),
    });
  },

  /** Cancel the subscription at period end */
  cancelSubscription: async (accountId: number): Promise<any> => {
    return fetchFromBff("/api/v1/billing/cancel/", {
      method: "POST",
      body: JSON.stringify({ account_id: accountId }),
    });
  },

  getInvoices: async (): Promise<Invoice[]> => {
    const res = await fetchFromBff<any>("/api/v1/billing/invoices/", { method: "GET" });
    return unpackArray<Invoice>(res);
  },

  requestRefund: async (invoiceId: number, reason: string) => {
    return fetchFromBff(`/api/v1/billing/invoices/${invoiceId}/request_refund/`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },
};
