import { Metadata } from "next";
import { TenantManagementView } from "@/views/admin/tenants/TenantManagementView";

export const metadata: Metadata = {
  title: "Tenants & Workspaces - Super Admin | Architecture Playbook",
  description: "Manage workspaces, seat allocations, and storage quotas.",
};

export default function AdminTenantsPage() {
  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden min-h-0 bg-background relative flex flex-col p-4 md:p-6 pb-24 lg:pb-6 scroll-smooth">
      <div className="flex-1 w-full max-w-7xl mx-auto h-full min-h-0">
        <TenantManagementView />
      </div>
    </div>
  );
}
