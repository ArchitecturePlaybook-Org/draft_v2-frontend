"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Wrench, ClipboardList } from "lucide-react";
import { EquipmentRegistryTab } from "@/components/inventory/EquipmentRegistryTab";
import { MaintenanceLogsTab } from "@/components/inventory/MaintenanceLogsTab";

function EquipmentAndAssetsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"registry" | "maintenance">("registry");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "maintenance" || tabParam === "registry") {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: "registry" | "maintenance") => {
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
            onClick={() => handleTabChange("registry")}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "registry"
                ? "border-primary text-primary"
                : "border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300"
            }`}
          >
            <Wrench className="w-4 h-4" />
            Equipment Registry
          </button>
          <button
            onClick={() => handleTabChange("maintenance")}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "maintenance"
                ? "border-primary text-primary"
                : "border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300"
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Maintenance Logs
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "registry" && <EquipmentRegistryTab />}
        {activeTab === "maintenance" && <MaintenanceLogsTab />}
      </div>
    </div>
  );
}

export default function EquipmentAndAssetsHubPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64 text-sm font-semibold text-zinc-400">Loading equipment hub...</div>}>
      <EquipmentAndAssetsContent />
    </Suspense>
  );
}
