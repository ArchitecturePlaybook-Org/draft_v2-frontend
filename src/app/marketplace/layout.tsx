"use client";

import React from "react";
import { TemplatesHubSidebar } from "@/components/layout/marketplace/MarketplaceSidebar";

export default function TemplatesHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden pt-topbar bg-surface-50">
      <TemplatesHubSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
