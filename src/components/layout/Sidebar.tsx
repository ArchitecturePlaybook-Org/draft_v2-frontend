"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { ROLE_PERMISSIONS } from "@/types/auth";

interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Overview",    href: "/dashboard",         icon: "◈", roles: ["admin","editor","viewer"] },
  { label: "Admin Panel", href: "/dashboard/admin",   icon: "⬡", roles: ["admin"] },
  { label: "Content",     href: "/dashboard/editor",  icon: "✦", roles: ["admin","editor"] },
  { label: "Browse",      href: "/dashboard/viewer",  icon: "◉", roles: ["admin","editor","viewer"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const userRole = user?.role ?? "viewer";

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(userRole)
  );

  const permCount = ROLE_PERMISSIONS[userRole]?.length ?? 0;

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <span style={{
          width: 32, height: 32, borderRadius: ".5rem",
          background: "linear-gradient(135deg, #6c63ff, #a78bfa)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: ".9rem", flexShrink: 0,
        }}>🏗</span>
        <span>ArchPlaybook</span>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: ".25rem" }}>
        {visibleItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              <span style={{ fontSize: "1rem", lineHeight: 1 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        paddingTop: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: ".75rem",
      }}>
        {/* Role badge */}
        <div style={{
          background: "rgba(255,255,255,0.04)",
          borderRadius: ".75rem",
          padding: ".75rem",
          display: "flex",
          flexDirection: "column",
          gap: ".3rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: ".75rem", color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>ROLE</span>
            <span className={`badge badge-${userRole}`}>{userRole}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: ".75rem", color: "rgba(255,255,255,0.4)" }}>Permissions</span>
            <span style={{ fontSize: ".75rem", color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>
              {permCount}
            </span>
          </div>
        </div>

        {/* User */}
        <div style={{ display: "flex", alignItems: "center", gap: ".625rem" }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "linear-gradient(135deg, #6c63ff50, #a78bfa50)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: ".85rem", fontWeight: 700, color: "#a78bfa",
            flexShrink: 0,
          }}>
            {user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: ".8125rem", fontWeight: 600, color: "rgba(255,255,255,0.9)", truncate: true, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.name ?? "User"}
            </div>
            <div style={{ fontSize: ".7rem", color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.email ?? ""}
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="btn-ghost"
            title="Sign out"
            style={{ padding: ".375rem .625rem", fontSize: ".8rem" }}
          >
            ⏻
          </button>
        </div>
      </div>
    </aside>
  );
}
