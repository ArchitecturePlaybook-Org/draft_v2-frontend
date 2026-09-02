"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Warehouse, ArrowLeftRight } from "lucide-react";
import { SitesTab } from "@/components/inventory/SitesTab";
import { TransfersTab } from "@/components/inventory/TransfersTab";

export default function SitesAndLogisticsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"sites" | "transfers">("sites");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "transfers" || tabParam === "sites") {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: "sites" | "transfers") => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
      <div className="px-6 pt-4 pb-0 bg-surface-50 border-b border-surface-200 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-orange-100 text-orange-600 border border-orange-200">
            <Warehouse className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-surface-900 tracking-tight">Sites & Logistics</h1>
            <p className="text-sm font-medium text-surface-500">Manage construction sites, yards, and inter-site stock transfers</p>
          </div>
        </div>

        <div className="flex gap-6 border-b border-surface-200">
          <button
            onClick={() => handleTabChange("sites")}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "sites"
                ? "border-primary text-primary"
                : "border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300"
            }`}
          >
            <Warehouse className="w-4 h-4" />
            Sites & Yard Stock
          </button>
          <button
            onClick={() => handleTabChange("transfers")}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "transfers"
                ? "border-primary text-primary"
                : "border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300"
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            Inter-Site Transfers
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "sites" && <SitesTab />}
        {activeTab === "transfers" && <TransfersTab />}
      </div>
    </div>
  );
}
