"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Layers, Building2 } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { MaterialsTab } from "@/components/inventory/MaterialsTab";
import { VendorsTab } from "@/components/inventory/VendorsTab";

export default function MasterDataHubPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const rawRole = String((user as any)?.role?.name || (user as any)?.role_name || (user as any)?.role || "").toLowerCase();
  const rawAccount = String((user as any)?.account?.account_type || (user as any)?.account_type || "").toLowerCase();
  const isMaterialSupplier = rawRole.includes("supplier") || rawAccount.includes("supplier");

  const [activeTab, setActiveTab] = useState<"materials" | "vendors">("materials");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "vendors" || tabParam === "materials") {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: "materials" | "vendors") => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
      <div className="px-6 pt-4 pb-0 bg-surface-50 border-b border-surface-200 shrink-0">


        <div className="flex gap-6 border-b border-surface-200">
          <button
            onClick={() => handleTabChange("materials")}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "materials"
                ? "border-primary text-primary"
                : "border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300"
            }`}
          >
            <Layers className="w-4 h-4" />
            Master Catalog & BOM
          </button>
          {!isMaterialSupplier && (
            <button
              onClick={() => handleTabChange("vendors")}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "vendors"
                  ? "border-primary text-primary"
                  : "border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300"
              }`}
            >
              <Building2 className="w-4 h-4" />
              Vendors Directory
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "materials" && <MaterialsTab />}
        {activeTab === "vendors" && <VendorsTab />}
      </div>
    </div>
  );
}
