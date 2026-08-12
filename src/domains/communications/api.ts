import { fetchFromBff } from "@/shared/api/fetchFromBff";

export interface Message {
  id: number;
  sender: number | { id: number; name: string; email: string };
  sender_name?: string;
  recipient: number | { id: number; name: string; email: string };
  recipient_name?: string;
  role?: string;
  subject: string;
  body: string;
  is_read: boolean;
  created_at: string;
  assets?: Array<{ id: number; title: string; file: string }>;
}

function unpackArray<T>(res: any): T[] {
  if (res && Array.isArray(res.results)) return res.results;
  if (Array.isArray(res)) return res;
  return [];
}

export interface ConversationSummary {
  user_id: number;
  user_name: string;
  last_message: string;
  last_time: string;
  is_read: boolean;
}

export interface ChatChannel {
  id: number;
  name: string;
  project?: number;
  members: number[];
  created_at: string;
}

export const communicationsApi = {
  listChannels: async (projectId?: number) => {
    const url = projectId ? `/api/v1/communications/channels/?project=${projectId}` : "/api/v1/communications/channels/";
    const res = await fetchFromBff<any>(url, { method: "GET" });
    return unpackArray<ChatChannel>(res);
  },
  createChannel: async (data: { name: string; project?: number; members: number[] }) => {
    return fetchFromBff<ChatChannel>("/api/v1/communications/channels/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  listInbox: async (search?: string) => {
    const url = search ? `/api/v1/communications/inbox/?search=${encodeURIComponent(search)}` : "/api/v1/communications/inbox/";
    const res = await fetchFromBff<any>(url, { method: "GET" });
    return unpackArray<Message>(res);
  },
  getChannelMessages: async (channelId: number, search?: string) => {
    const url = search 
      ? `/api/v1/communications/inbox/?channel=${channelId}&search=${encodeURIComponent(search)}` 
      : `/api/v1/communications/inbox/?channel=${channelId}`;
    const res = await fetchFromBff<any>(url, { method: "GET" });
    return unpackArray<Message>(res);
  },
  listConversations: async () => {
    const res = await fetchFromBff<any>("/api/v1/communications/inbox/conversations/", { method: "GET" });
    return unpackArray<ConversationSummary>(res);
  },
  getThread: async (otherUserId: number | string, search?: string) => {
    const url = search 
      ? `/api/v1/communications/inbox/thread/${otherUserId}/?search=${encodeURIComponent(search)}` 
      : `/api/v1/communications/inbox/thread/${otherUserId}/`;
    const res = await fetchFromBff<any>(url, { method: "GET" });
    return unpackArray<Message>(res);
  },
  getLeadThread: async (leadId: number, search?: string) => {
    const url = search 
      ? `/api/v1/communications/inbox/thread/lead/${leadId}/?search=${encodeURIComponent(search)}` 
      : `/api/v1/communications/inbox/thread/lead/${leadId}/`;
    const res = await fetchFromBff<any>(url, { method: "GET" });
    return unpackArray<Message>(res);
  },
  sendMessage: async (data: { recipient?: number | string; channel?: number; body: string; subject: string; lead?: number; project?: number; files?: File[] }) => {
    if (data.files && data.files.length > 0) {
      const formData = new FormData();
      if (data.recipient) formData.append("recipient", data.recipient.toString());
      if (data.channel) formData.append("channel", data.channel.toString());
      formData.append("body", data.body);
      formData.append("subject", data.subject);
      if (data.lead) formData.append("lead", data.lead.toString());
      if (data.project) formData.append("project", data.project.toString());
      
      data.files.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });
      
      return fetchFromBff<Message>("/api/v1/communications/inbox/", {
        method: "POST",
        body: formData, // fetchFromBff should omit Content-Type for FormData
      });
    }

    // Default JSON behavior
    return fetchFromBff<Message>("/api/v1/communications/inbox/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  markAsRead: async (id: number) => {
    return fetchFromBff<{status: string}>(`/api/v1/communications/inbox/${id}/read/`, {
      method: "PATCH",
    });
  },
  markThreadAsRead: async (threadUserId: number) => {
    return fetchFromBff<{detail: string}>(`/api/v1/communications/inbox/mark-read/`, {
      method: "POST",
      body: JSON.stringify({ thread_user_id: threadUserId }),
    });
  },
  softDelete: async (id: number) => {
    return fetchFromBff<{status: string}>(`/api/v1/communications/inbox/${id}/soft_delete/`, {
      method: "POST",
    });
  },
  archiveThread: async (otherUserId: number) => {
    return fetchFromBff<{status: string}>(`/api/v1/communications/inbox/archive-thread/${otherUserId}/`, {
      method: "POST",
    });
  },
  unarchiveThread: async (otherUserId: number) => {
    return fetchFromBff<{status: string}>(`/api/v1/communications/inbox/unarchive-thread/${otherUserId}/`, {
      method: "POST",
    });
  },
  archiveChannel: async (channelId: number) => {
    return fetchFromBff<{status: string}>(`/api/v1/communications/channels/${channelId}/archive/`, {
      method: "POST",
    });
  },
  unarchiveChannel: async (channelId: number) => {
    return fetchFromBff<{status: string}>(`/api/v1/communications/channels/${channelId}/unarchive/`, {
      method: "POST",
    });
  },

  searchMessages: async (query: string): Promise<Message[]> => {
    return fetchFromBff<Message[]>(`/api/v1/communications/search/?q=${encodeURIComponent(query)}`);
  }
};
