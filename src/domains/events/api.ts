import { fetchFromBff } from "@/shared/api/fetchFromBff";

export interface Event {
  id: number;
  title: string;
  event_type: "field" | "meeting" | "deadline";
  event_date: string;
  created_at: string;
}

export const eventsApi = {
  listEvents: async () => {
    return fetchFromBff<Event[]>("/api/events", { method: "GET" });
  },
  createEvent: async (data: Record<string, unknown>) => {
    return fetchFromBff<Event>("/api/events", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
