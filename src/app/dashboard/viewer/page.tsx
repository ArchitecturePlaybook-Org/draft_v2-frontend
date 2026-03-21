"use client";

import { useAuthStore } from "@/store/auth-store";
import { PermissionBadge } from "@/components/ui/PermissionBadge";
import { ROLE_PERMISSIONS, ROLE_DESCRIPTIONS } from "@/types/auth";

export default function ViewerDashboardPage() {
  const { user } = useAuthStore();
  const role = user?.role ?? "viewer";
  const perms = ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.viewer;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, marginBottom: ".5rem" }}>
          Viewer Dashboard
        </h1>
        <p style={{ color: "rgba(255,255,255,0.5)", margin: 0, fontSize: ".9375rem" }}>
          {ROLE_DESCRIPTIONS.viewer}
        </p>
      </div>

      {/* Read-only banner */}
      <div style={{
        background: "rgba(16,185,129,0.08)",
        border: "1px solid rgba(16,185,129,0.2)",
        borderRadius: "1rem",
        padding: "1.25rem 1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
      }}>
        <span style={{ fontSize: "1.75rem" }}>👁</span>
        <div>
          <div style={{ fontWeight: 700, color: "#34d399", marginBottom: ".25rem" }}>
            Read-Only Mode
          </div>
          <div style={{ fontSize: ".875rem", color: "rgba(255,255,255,0.55)" }}>
            You have {perms.length} read-only permissions. Contact an admin to request elevated access.
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem" }}>
        {[
          { label: "Permissions",    value: perms.length.toString(), icon: "🔑", accent: "#34d399" },
          { label: "Readable Modules", value: "4",    icon: "📖", accent: "#60a5fa" },
          { label: "Write Access",   value: "None",   icon: "✏️", accent: "#ef4444" },
          { label: "Delete Access",  value: "None",   icon: "🗑", accent: "#ef4444" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize: "1.25rem" }}>{s.icon}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: s.accent }}>{s.value}</div>
            <div style={{ fontSize: ".8125rem", color: "rgba(255,255,255,0.5)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Allowed vs denied */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <div className="card">
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginTop: 0, marginBottom: "1rem", color: "#34d399" }}>
            ✓ Allowed ({perms.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
            {perms.map((perm) => (
              <div key={perm} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: ".5rem .625rem",
                borderRadius: ".5rem",
                background: "rgba(16,185,129,0.06)",
              }}>
                <PermissionBadge permission={perm} />
                <span style={{ color: "#34d399", fontSize: ".875rem" }}>✓</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginTop: 0, marginBottom: "1rem", color: "#f87171" }}>
            ✗ Denied (Requires higher role)
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
            {[
              "users:create", "users:update", "users:delete",
              "posts:create", "posts:update", "posts:delete",
              "roles:create", "roles:update", "roles:delete",
              "permissions:assign",
              "reports:create",
            ].map((perm) => (
              <div key={perm} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: ".5rem .625rem",
                borderRadius: ".5rem",
                background: "rgba(239,68,68,0.04)",
                opacity: 0.6,
              }}>
                <PermissionBadge permission={perm} />
                <span style={{ color: "#f87171", fontSize: ".875rem" }}>✗</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What viewer can browse */}
      <div className="card">
        <h2 style={{ fontSize: "1.125rem", fontWeight: 700, marginTop: 0, marginBottom: "1.25rem" }}>
          What you can browse
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
          {[
            { module: "Users",       desc: "List and view user profiles",      icon: "👥", available: true },
            { module: "Posts",       desc: "Read and list all published posts", icon: "📄", available: true },
            { module: "Reports",     desc: "View and list reports",             icon: "📊", available: true },
            { module: "Roles",       desc: "View role definitions",             icon: "🏷", available: true },
          ].map(({ module, desc, icon, available }) => (
            <div key={module} style={{
              background: available ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.04)",
              border: `1px solid ${available ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.15)"}`,
              borderRadius: ".875rem",
              padding: "1rem",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".5rem" }}>
                <span style={{ fontSize: "1.25rem" }}>{icon}</span>
                <span style={{ fontSize: ".75rem", color: available ? "#34d399" : "#f87171" }}>
                  {available ? "✓ Read" : "✗ Denied"}
                </span>
              </div>
              <div style={{ fontWeight: 600, marginBottom: ".25rem" }}>{module}</div>
              <div style={{ fontSize: ".75rem", color: "rgba(255,255,255,0.5)" }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Session */}
      <div className="card" style={{ borderColor: "rgba(16,185,129,0.2)", background: "rgba(16,185,129,0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: ".25rem" }}>{user?.name}</div>
            <div style={{ fontSize: ".8125rem", color: "rgba(255,255,255,0.5)" }}>{user?.email}</div>
          </div>
          <span className="badge badge-viewer" style={{ fontSize: ".875rem", padding: ".375rem .875rem" }}>Viewer</span>
        </div>
      </div>
    </div>
  );
}
