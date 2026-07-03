"use client";

import React from "react";
import { ShowroomSidebar } from "@/components/layout/showroom/ShowroomSidebar";

export default function ShowroomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden pt-topbar bg-surface-50">
      <ShowroomSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
