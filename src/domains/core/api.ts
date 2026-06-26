import { fetchFromBff } from "@/shared/api/fetchFromBff";

export interface SystemSettings {
  max_image_upload_size_mb: number;
  max_document_upload_size_mb: number;
  max_3d_model_upload_size_mb: number;
  max_sh3d_upload_size_mb: number;
}

export const coreApi = {
  getSystemSettings: async (): Promise<SystemSettings> => {
    return fetchFromBff<SystemSettings>("/api/v1/core/settings/", { method: "GET" });
  },
};

export interface WebhookEndpoint {
  id: number;
  account: number;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const webhooksApi = {
  list: async () => {
    const data = await fetchFromBff<any>("/api/v1/core/webhooks/", { method: "GET" });
    return (Array.isArray(data) ? data : (data.results || [])) as WebhookEndpoint[];
  },
  create: async (data: { account: number; url: string; events: string[]; is_active: boolean }) => {
    return fetchFromBff<WebhookEndpoint>("/api/v1/core/webhooks/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  update: async (id: number, data: Partial<WebhookEndpoint>) => {
    return fetchFromBff<WebhookEndpoint>(`/api/v1/core/webhooks/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
  delete: async (id: number) => {
    return fetchFromBff<void>(`/api/v1/core/webhooks/${id}/`, { method: "DELETE" });
  },
  regenerateSecret: async (id: number) => {
    return fetchFromBff<WebhookEndpoint>(`/api/v1/core/webhooks/${id}/regenerate_secret/`, { method: "POST" });
  },
};
