import { fetchFromBff } from "@/shared/api/fetchFromBff";
import { Organization, Invitation } from "@/types/auth";

export const orgsApi = {
  createOrg: async (data: { name: string; email?: string; phone?: string; website?: string }) => {
    return fetchFromBff<Organization>("/api/orgs", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  listOrgs: async () => {
    return fetchFromBff<Organization[]>("/api/orgs", { method: "GET" });
  },

  sendInvitation: async (orgId: number, data: { email: string; role: string }) => {
    return fetchFromBff<Invitation>(`/api/orgs/${orgId}/invite`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  acceptInvitation: async (token: string) => {
    return fetchFromBff<{ success: boolean; detail?: string }>(`/api/orgs/invite/accept/${token}`, {
      method: "POST",
    });
  },
};
