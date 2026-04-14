"use client";

import { useAuthStore } from "@/store/auth-store";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuthStore();
  const pathname = usePathname();

  const navItems = [
    { label: "Overview", href: "/dashboard", icon: "📊" },
    { label: "Projects", href: "/dashboard/projects", icon: "🏗️" },
    { label: "My Profile", href: "/dashboard/profile", icon: "👤" },
    { label: "Manage Firm", href: "/dashboard/organization", icon: "🏢" },
    { label: "Admin Space", href: "/dashboard/admin", icon: "🛡️" },
  ];

  return (
    <div className="dashboard-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{
            width: 32, height: 32, borderRadius: "8px",
            background: "linear-gradient(135deg, #6c63ff, #a78bfa)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.2rem"
          }}>
            🏗
          </div>
          <span>ArchPlaybook</span>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${pathname === item.href ? "active" : ""}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User Profile & Logout */}
        <div style={{
          marginTop: "auto",
          padding: "1rem 0.75rem",
          background: "rgba(255,255,255,0.03)",
          borderRadius: "1rem",
          border: "1px solid rgba(255,255,255,0.05)"
        }}>
          <div style={{ marginBottom: "0.75rem" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff", marginBottom: "2px" }}>
              {user?.name || "User"}
            </div>
            <div className={`badge badge-${user?.role || "viewer"}`} style={{ fontSize: "0.65rem" }}>
              {user?.role || "No Role"}
            </div>
          </div>
          
          <button
            onClick={() => logout()}
            className="nav-item"
            style={{ 
              color: "#f87171", 
              background: "rgba(239,68,68,0.05)",
              marginTop: "0.5rem"
            }}
          >
            <span>🚪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-area">
        <header className="topbar">
          <div style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.5)" }}>
            Dashboard / <span style={{ color: "#fff" }}>{pathname.split("/").pop()}</span>
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            {/* Optional topbar actions */}
          </div>
        </header>
        
        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}
