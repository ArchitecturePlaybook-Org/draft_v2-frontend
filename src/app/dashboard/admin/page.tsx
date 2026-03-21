"use client";

import { useAuthStore } from "@/store/auth-store";
import { PermissionBadge } from "@/components/ui/PermissionBadge";
import { ROLE_PERMISSIONS, ROLE_DESCRIPTIONS } from "@/types/auth";

const MODULES = ["users", "roles", "permissions", "posts", "reports"];
const ACTIONS = ["create", "read", "update", "delete", "list", "assign"];

export default function AdminDashboardPage() {
  const { user } = useAuthStore();
  const allPerms = ROLE_PERMISSIONS;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, marginBottom: ".5rem" }}>
          Admin Dashboard
        </h1>
        <p style={{ color: "rgba(255,255,255,0.5)", margin: 0, fontSize: ".9375rem" }}>
          Full system access — manage users, roles, and permissions
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
        {[
          { label: "Total Permissions", value: "21", icon: "🔑", accent: "#6c63ff" },
          { label: "Active Roles", value: "3", icon: "👥", accent: "#a78bfa" },
          { label: "Modules", value: "5", icon: "📦", accent: "#34d399" },
          { label: "Your Level", value: user?.role === "architect" ? "Architect" : "Admin", icon: "⭐", accent: "#fbbf24" },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <div style={{ fontSize: "1.5rem" }}>{stat.icon}</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: stat.accent }}>
              {stat.value}
            </div>
            <div style={{ fontSize: ".8125rem", color: "rgba(255,255,255,0.5)" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Role comparison table */}
      <div className="card">
        <h2 style={{ fontSize: "1.125rem", fontWeight: 700, marginTop: 0, marginBottom: "1.25rem" }}>
          Role × Permission Matrix
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".8125rem" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: ".5rem .75rem", color: "rgba(255,255,255,0.4)", fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  Permission
                </th>
                {["architect", "co_owner", "constructor", "client"].map((role) => (
                  <th key={role} style={{ textAlign: "center", padding: ".5rem .75rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className={`badge badge-${role}`}>{role}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.flatMap((mod) =>
                ACTIONS.map((action) => {
                  const perm = `${mod}:${action}`;
                  const hasAny = Object.values(allPerms).some((perms) => perms.includes(perm));
                  if (!hasAny) return null;
                  return (
                    <tr key={perm} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td style={{ padding: ".5rem .75rem" }}>
                        <PermissionBadge permission={perm} />
                      </td>
                      {["architect", "co_owner", "constructor", "client"].map((role) => (
                        <td key={role} style={{ textAlign: "center", padding: ".5rem .75rem" }}>
                          {allPerms[role]?.includes(perm) ? (
                            <span style={{ color: "#34d399", fontSize: "1rem" }}>✓</span>
                          ) : (
                            <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "1rem" }}>—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role cards */}
      <div>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "1rem" }}>
          Role Definitions
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
          {(["architect", "co_owner", "constructor", "client"] as const).map((role) => {
            const perms = (Object.prototype.hasOwnProperty.call(allPerms, role)) 
              ? allPerms[role] 
              : [];
            return (
              <div key={role} className="card card-accent">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".75rem" }}>
                  <span className={`badge badge-${role}`} style={{ fontSize: ".8125rem", padding: ".3rem .75rem" }}>
                    {role}
                  </span>
                  <span style={{ fontSize: ".75rem", color: "rgba(255,255,255,0.4)" }}>
                    {perms.length} permissions
                  </span>
                </div>
                <p style={{ fontSize: ".8125rem", color: "rgba(255,255,255,0.55)", marginBottom: "1rem", lineHeight: 1.6 }}>
                  {ROLE_DESCRIPTIONS[role]}
                </p>
                <div className="perm-grid">
                  {perms.map((p) => (
                    <PermissionBadge key={p} permission={p} size="sm" />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div className="card">
        <h2 style={{ fontSize: "1.125rem", fontWeight: 700, marginTop: 0, marginBottom: "1.25rem" }}>
          Quick Actions
          <span className="badge badge-admin" style={{ marginLeft: ".75rem", fontSize: ".7rem" }}>Admin Only</span>
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
          {[
            { label: "Create Role",           icon: "➕", endpoint: "POST /admin/roles/create/" },
            { label: "Assign Permissions",    icon: "🔗", endpoint: "POST /admin/roles/permissions/assign/" },
            { label: "Assign Role to User",   icon: "👤", endpoint: "POST /admin/users/role/assign/" },
            { label: "View All Permissions",  icon: "📋", endpoint: "GET /admin/permissions/" },
          ].map((action) => (
            <div key={action.label} style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: ".875rem",
              padding: "1.25rem",
              cursor: "pointer",
              transition: "border-color .2s",
            }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(108,99,255,0.4)"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
            >
              <div style={{ fontSize: "1.5rem", marginBottom: ".5rem" }}>{action.icon}</div>
              <div style={{ fontWeight: 600, fontSize: ".9rem", marginBottom: ".375rem" }}>{action.label}</div>
              <div style={{ fontSize: ".7rem", color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-geist-mono)" }}>
                {action.endpoint}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current user info */}
      <div className="card" style={{ borderColor: "rgba(108,99,255,0.2)", background: "rgba(108,99,255,0.04)" }}>
        <h3 style={{ fontWeight: 700, fontSize: "1rem", marginTop: 0, marginBottom: ".75rem" }}>
          Your Session
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".5rem", fontSize: ".8125rem" }}>
          {[
            { k: "Name",    v: user?.name },
            { k: "Email",   v: user?.email },
            { k: "Role",    v: user?.role ?? "admin" },
            { k: "Status",  v: user?.is_active ? "Active" : "Inactive" },
          ].map(({ k, v }) => (
            <div key={k} style={{ display: "flex", flexDirection: "column", gap: ".2rem" }}>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>{k}</span>
              <span style={{ fontWeight: 600 }}>{v ?? "—"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
