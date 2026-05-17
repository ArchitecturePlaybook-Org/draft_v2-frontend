import { fetchFromBff } from "@/shared/api/fetchFromBff";

export interface Message {
  id: number;
  sender: number;
  sender_name: string;
  recipient: number;
  recipient_name: string;
  role: string;
  subject: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface ConversationSummary {
  user_id: number;
  user_name: string;
  last_message: string;
  last_time: string;
  is_read: boolean;
}

export const communicationsApi = {
  listInbox: async () => {
    return fetchFromBff<Message[]>("/api/communications/", { method: "GET" });
  },
  listConversations: async () => {
    return fetchFromBff<ConversationSummary[]>("/api/communications/conversations/", { method: "GET" });
  },
  getThread: async (otherUserId: number) => {
    return fetchFromBff<Message[]>(`/api/communications/thread/${otherUserId}/`, { method: "GET" });
  },
  sendMessage: async (data: { recipient: number; body: string; subject: string; lead?: number }) => {
    return fetchFromBff<Message>("/api/communications/", {
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
