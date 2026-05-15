import { fetchFromBff } from "@/shared/api/fetchFromBff";

export interface Subscription {
  id: number;
  plan_name: string;
  price: string;
  status: string;
  next_billing_date: string;
  created_at: string;
}

export const billingApi = {
  getCurrentSubscription: async () => {
    return fetchFromBff<Subscription[]>("/api/billing", { method: "GET" });
  },
};
