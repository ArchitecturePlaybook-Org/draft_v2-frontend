"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ClipboardList, ShoppingBag } from "lucide-react";
import { RequisitionsTab } from "@/components/inventory/RequisitionsTab";
import { PurchaseOrdersTab } from "@/components/inventory/PurchaseOrdersTab";

export default function ProcurementHubPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"requisitions" | "pos">("requisitions");

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
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-purple-100 text-purple-600 border border-purple-200">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-surface-900 tracking-tight">Procurement Hub</h1>
            <p className="text-sm font-medium text-surface-500">Manage site material requests and vendor purchase orders</p>
          </div>
        </div>

        <div className="flex gap-6 border-b border-surface-200">
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
