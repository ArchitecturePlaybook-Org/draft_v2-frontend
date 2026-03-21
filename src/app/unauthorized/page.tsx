"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";

export default function UnauthorizedPage() {
  const { user } = useAuthStore();

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0a0a0f",
    }}>
      <div style={{
        textAlign: "center",
        padding: "3rem",
        maxWidth: 440,
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: "rgba(239,68,68,0.15)",
          border: "2px solid rgba(239,68,68,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "2rem", margin: "0 auto 1.5rem",
        }}>
          🚫
        </div>

        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: ".75rem" }}>
          Access Denied
        </h1>
        <p style={{ color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
          Your role <strong style={{ color: "#fbbf24" }}>{user?.role ?? "unknown"}</strong> doesn&apos;t
          have permission to access this page. Contact an administrator if you think this is a mistake.
        </p>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <Link
            href="/dashboard"
            style={{
              padding: ".625rem 1.25rem",
              background: "linear-gradient(135deg, #6c63ff, #a78bfa)",
              borderRadius: ".75rem",
              color: "#fff",
              fontWeight: 600,
              fontSize: ".9rem",
              textDecoration: "none",
            }}
          >
            Go to Dashboard
          </Link>
          <Link
            href="/login"
            style={{
              padding: ".625rem 1.25rem",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: ".75rem",
              color: "rgba(255,255,255,0.7)",
              fontWeight: 600,
              fontSize: ".9rem",
              textDecoration: "none",
            }}
          >
            Switch Account
          </Link>
        </div>
      </div>
    </div>
  );
}
