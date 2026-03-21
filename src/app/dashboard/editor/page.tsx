"use client";

import { useAuthStore } from "@/store/auth-store";
import { PermissionBadge } from "@/components/ui/PermissionBadge";
import { ROLE_PERMISSIONS, ROLE_DESCRIPTIONS } from "@/types/auth";

export default function EditorDashboardPage() {
  const { user } = useAuthStore();
  const role = user?.role ?? "editor";
  const perms = ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.editor;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, marginBottom: ".5rem" }}>
          Content Dashboard
        </h1>
        <p style={{ color: "rgba(255,255,255,0.5)", margin: 0, fontSize: ".9375rem" }}>
          {ROLE_DESCRIPTIONS.editor}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
        {[
          { label: "Your Permissions", value: perms.length.toString(), icon: "🔑", accent: "#a78bfa" },
          { label: "Posts Access",     value: "Full",   icon: "✍️",  accent: "#34d399" },
          { label: "Users Access",     value: "R/W",   icon: "👥",  accent: "#60a5fa" },
          { label: "Reports Access",   value: "Read",  icon: "📊",  accent: "#fbbf24" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize: "1.5rem" }}>{s.icon}</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: s.accent }}>{s.value}</div>
            <div style={{ fontSize: ".8125rem", color: "rgba(255,255,255,0.5)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Content management area */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }}>
        {/* Posts panel */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>Posts Management</h2>
            <span className="badge badge-success">Full Access</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
            {[
              { action: "Create new post",   icon: "➕", perm: "posts:create", available: true },
              { action: "View all posts",    icon: "👁", perm: "posts:read",   available: true },
              { action: "Edit posts",        icon: "✏️", perm: "posts:update", available: true },
              { action: "Delete posts",      icon: "🗑", perm: "posts:delete", available: true },
              { action: "List all posts",    icon: "📋", perm: "posts:list",   available: true },
            ].map(({ action, icon, perm, available }) => (
              <div key={perm} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: ".75rem 1rem",
                background: "rgba(255,255,255,0.03)",
                borderRadius: ".625rem",
                border: "1px solid rgba(255,255,255,0.05)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".625rem" }}>
                  <span>{icon}</span>
                  <span style={{ fontSize: ".875rem" }}>{action}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                  <PermissionBadge permission={perm} />
                  {available
                    ? <span style={{ color: "#34d399", fontSize: ".8rem" }}>✓</span>
                    : <span style={{ color: "#ef4444", fontSize: ".8rem" }}>✗</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Restricted panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="card">
            <h3 style={{ fontWeight: 700, fontSize: ".9375rem", marginTop: 0, marginBottom: "1rem" }}>
              Users Access
              <span className="badge badge-editor" style={{ marginLeft: ".625rem", fontSize: ".7rem" }}>Limited</span>
            </h3>
            {["users:create", "users:read", "users:update", "users:list"].map((perm) => (
              <div key={perm} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: ".375rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <PermissionBadge permission={perm} />
                <span style={{ color: "#34d399", fontSize: ".75rem" }}>✓</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: ".375rem 0" }}>
              <PermissionBadge permission="users:delete" />
              <span style={{ color: "#ef4444", fontSize: ".75rem" }}>✗</span>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontWeight: 700, fontSize: ".9375rem", marginTop: 0, marginBottom: "1rem" }}>
              Denied Access
              <span className="badge badge-admin" style={{ marginLeft: ".625rem", fontSize: ".7rem" }}>Admin Only</span>
            </h3>
            {["roles:create","roles:delete","permissions:assign"].map((perm) => (
              <div key={perm} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: ".375rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)", opacity: 0.5 }}>
                <PermissionBadge permission={perm} />
                <span style={{ color: "#ef4444", fontSize: ".75rem" }}>✗</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Your permissions */}
      <div className="card">
        <h2 style={{ fontSize: "1.125rem", fontWeight: 700, marginTop: 0, marginBottom: "1.25rem" }}>
          Your Permissions ({perms.length})
        </h2>
        <div className="perm-grid">
          {perms.map((p) => <PermissionBadge key={p} permission={p} size="md" />)}
        </div>
      </div>

      {/* Session */}
      <div className="card" style={{ borderColor: "rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: ".25rem" }}>{user?.name}</div>
            <div style={{ fontSize: ".8125rem", color: "rgba(255,255,255,0.5)" }}>{user?.email}</div>
          </div>
          <span className="badge badge-editor" style={{ fontSize: ".875rem", padding: ".375rem .875rem" }}>Editor</span>
        </div>
      </div>
    </div>
  );
}
