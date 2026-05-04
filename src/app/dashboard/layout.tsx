"use client";

import { Sidebar } from "@/components/layout/dashboard/Sidebar";
import { Topbar } from "@/components/layout/dashboard/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-shell">
      {/* Dynamic Navigation Components */}
      <Sidebar />

      {/* Main Execution Area */}
      <main className="main-area">
        <Topbar />
        
        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}
