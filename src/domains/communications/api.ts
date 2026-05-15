import { fetchFromBff } from "@/shared/api/fetchFromBff";

export interface Message {
  id: number;
  sender: string;
  role: string;
  subject: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export const communicationsApi = {
  listInbox: async () => {
    return fetchFromBff<Message[]>("/api/communications", { method: "GET" });
  },
  sendMessage: async (data: Record<string, unknown>) => {
    return fetchFromBff<Message>("/api/communications", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  markAsRead: async (id: number) => {
    return fetchFromBff<{status: string}>(`/api/communications/${id}/read/`, {
      method: "PATCH",
    });
  },
};
