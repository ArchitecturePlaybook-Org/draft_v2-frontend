import { fetchFromBff } from "@/shared/api/fetchFromBff";
import { Organization, Invitation } from "@/types/auth";

export interface OrgUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  tagline?: string;
  address?: string;
  metadata?: Record<string, unknown>;
  social_links?: Record<string, string>;
}

export const orgsApi = {
  createOrg: async (data: { name: string; email?: string; phone?: string; website?: string }) => {
    return fetchFromBff<Organization>("/api/orgs", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateOrg: async (id: number, data: any) => {
    if (!id) throw new Error("Organization ID is required for update.");
    return fetchFromBff<Organization>(`/api/orgs/${id}/`, {
      method: "PATCH",
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  },

  uploadLogo: async (orgId: number, file: File) => {
    if (!orgId) throw new Error("Organization ID is required for logo upload.");
    const formData = new FormData();
    formData.append("logo", file);
    return fetchFromBff<Organization>(`/api/orgs/${orgId}/`, {
      method: "PATCH",
      body: formData,
    });
  },

  listOrgs: async () => {
    return fetchFromBff<Organization[]>("/api/orgs", { method: "GET" });
  },

  listMembers: async (orgId: number) => {
    if (!orgId) throw new Error("Organization ID is required to list members.");
    return fetchFromBff<any[]>(`/api/orgs/${orgId}/members`, { method: "GET" });
  },

  removeMember: async (orgId: number, memberId: number) => {
    if (!orgId) throw new Error("Organization ID is required to remove member.");
    return fetchFromBff<void>(`/api/orgs/${orgId}/members/${memberId}/`, { method: "DELETE" });
  },

  listInvitations: async (orgId: number) => {
    if (!orgId) throw new Error("Organization ID is required to list invitations.");
    return fetchFromBff<Invitation[]>(`/api/orgs/${orgId}/invitations`, { method: "GET" });
  },

  revokeInvitation: async (invitationId: string) => {
    if (!invitationId) throw new Error("Invitation ID is required.");
    return fetchFromBff<void>(`/api/orgs/invitations/${invitationId}`, {
      method: "DELETE",
    });
  },

  sendInvitation: async (orgId: number, data: { email: string; role: string }) => {
    if (!orgId) throw new Error("Organization ID is required to send invitation.");
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
