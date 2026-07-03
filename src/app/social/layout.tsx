"use client";

import React from "react";
import { SocialSidebar } from "@/components/layout/social/SocialSidebar";

export default function SocialLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[calc(100vh-var(--topbar-height))] overflow-hidden">
      <SocialSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
