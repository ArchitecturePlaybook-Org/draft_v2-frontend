import { Metadata } from "next";
import { TenantManagementView } from "@/views/admin/tenants/TenantManagementView";

export const metadata: Metadata = {
  title: "Tenants & Workspaces - Super Admin | Architecture Playbook",
  description: "Manage workspaces, seat allocations, and storage quotas.",
};

export default function AdminTenantsPage() {
  return (
    <div className="w-full max-w-full space-y-4">
      <TenantManagementView />
    </div>
  );
}
