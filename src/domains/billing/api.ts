import { fetchFromBff } from "@/shared/api/fetchFromBff";

export interface Subscription {
  id: number;
  status: string;
  current_period_end: string | null;
  created_at: string;
  plan: {
    name: string;
    code: string;
    currency: string;
    monthly_price: string;
    yearly_price: string;
  } | null;
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

function unpackArray<T>(res: any): T[] {
  if (res && Array.isArray(res.results)) return res.results;
  if (Array.isArray(res)) return res;
  return [];
}

export const billingApi = {
  getCurrentSubscription: async () => {
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
  getInvoices: async () => {
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
