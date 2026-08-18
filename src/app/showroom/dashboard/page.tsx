"use client";

import React from "react";
import { VendorDashboardView } from "@/components/showroom/VendorDashboardView";

export function ShowroomVendorDashboardPageOriginal() {
  return <VendorDashboardView />;
}

export default function ShowroomVendorDashboardPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <div className="w-20 h-20 bg-accent/20 text-accent rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-inner border border-accent/30">
        🚧
      </div>
      <h1 className="text-4xl font-black text-primary tracking-tight mb-4">Showroom VendorDashboard</h1>
      <p className="text-surface-500 font-medium max-w-md mb-8">
        We are actively building out this section of the architectural products marketplace. Check back soon for updates!
      </p>
      <div className="px-6 py-2 bg-surface-card border border-surface-200 rounded-full shadow-sm text-sm font-bold text-accent uppercase tracking-widest">
        Coming Soon
      </div>
    </div>
  );
}
