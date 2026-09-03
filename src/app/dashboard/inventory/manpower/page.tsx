"use client";

import React from "react";
import { ManpowerRegistryTab } from "@/components/inventory/ManpowerRegistryTab";

export default function ManpowerPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-primary tracking-tight">Manpower & Labor</h1>
        <p className="text-surface-400 mt-2">Manage labor trades, daily rates, and vendor supply</p>
      </div>
      
      <ManpowerRegistryTab />
    </div>
  );
}
