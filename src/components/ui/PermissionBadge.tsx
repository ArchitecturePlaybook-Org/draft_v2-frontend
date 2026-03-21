interface PermissionBadgeProps {
  permission: string; // e.g. "posts:create"
  size?: "sm" | "md";
}

const MODULE_COLORS: Record<string, string> = {
  users:       "rgba(59,130,246,0.15)",
  roles:       "rgba(168,85,247,0.15)",
  permissions: "rgba(236,72,153,0.15)",
  posts:       "rgba(16,185,129,0.15)",
  reports:     "rgba(245,158,11,0.15)",
};

const MODULE_TEXT: Record<string, string> = {
  users:       "#60a5fa",
  roles:       "#c084fc",
  permissions: "#f472b6",
  posts:       "#34d399",
  reports:     "#fbbf24",
};

export function PermissionBadge({ permission, size = "sm" }: PermissionBadgeProps) {
  const [module, action] = permission.split(":");
  const bg   = MODULE_COLORS[module] ?? "rgba(108,99,255,0.12)";
  const text = MODULE_TEXT[module]   ?? "#a78bfa";

  return (
    <span
      title={permission}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: ".25rem",
        padding: size === "sm" ? ".2rem .55rem" : ".3rem .75rem",
        borderRadius: "999px",
        background: bg,
        color: text,
        fontSize: size === "sm" ? ".7rem" : ".8125rem",
        fontWeight: 600,
        letterSpacing: ".03em",
        whiteSpace: "nowrap",
        border: `1px solid ${text}30`,
      }}
    >
      <span style={{ opacity: 0.7 }}>{module}</span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span>{action}</span>
    </span>
  );
}
