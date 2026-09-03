"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ClipboardList, ShoppingBag } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { RequisitionsTab } from "@/components/inventory/RequisitionsTab";
import { PurchaseOrdersTab } from "@/components/inventory/PurchaseOrdersTab";

export default function ProcurementHubPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const rawRole = String((user as any)?.role?.name || (user as any)?.role_name || (user as any)?.role || "").toLowerCase();
  const rawAccount = String((user as any)?.account?.account_type || (user as any)?.account_type || "").toLowerCase();
  const isMaterialSupplier = rawRole.includes("supplier") || rawAccount.includes("supplier");

  const [activeTab, setActiveTab] = useState<"requisitions" | "pos">(isMaterialSupplier ? "pos" : "requisitions");

  // Sync tab with URL query parameter on mount/change
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "pos" || tabParam === "requisitions") {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Update URL when tab changes
  const handleTabChange = (tab: "requisitions" | "pos") => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Tab Navigation Header */}
      <div className="px-6 pt-4 pb-0 bg-surface-50 border-b border-surface-200 shrink-0">

        <div className="flex gap-6 border-b border-surface-200">
          {!isMaterialSupplier && (
            <button
              onClick={() => handleTabChange("requisitions")}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "requisitions"
                  ? "border-primary text-primary"
                  : "border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300"
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Material Requisitions
            </button>
          )}
          <button
            onClick={() => handleTabChange("pos")}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "pos"
                ? "border-primary text-primary"
                : "border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Purchase Orders (POs)
          </button>
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "requisitions" && <RequisitionsTab />}
        {activeTab === "pos" && <PurchaseOrdersTab />}
      </div>
    </div>
  );
}
