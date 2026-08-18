"use client";

import React, { Suspense } from "react";
import { ShowroomSidebar } from "@/components/layout/showroom/ShowroomSidebar";

export default function ShowroomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden pt-topbar bg-surface-50">
      <Suspense fallback={<div className="w-64 bg-surface-card border-r border-surface-200 animate-pulse" />}>
        <ShowroomSidebar />
      </Suspense>
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
