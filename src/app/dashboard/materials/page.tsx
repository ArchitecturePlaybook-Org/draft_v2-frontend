"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Layers, Building2 } from "lucide-react";
import { MaterialsTab } from "@/components/inventory/MaterialsTab";
import { VendorsTab } from "@/components/inventory/VendorsTab";

export default function MasterDataHubPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-accent/10 text-accent border border-accent/20">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-surface-900 tracking-tight">Master Data & Vendors</h1>
            <p className="text-sm font-medium text-surface-500">Central directory for material catalog, BOM rules, and approved vendors</p>
          </div>
        </div>

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
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "materials" && <MaterialsTab />}
        {activeTab === "vendors" && <VendorsTab />}
      </div>
    </div>
  );
}
