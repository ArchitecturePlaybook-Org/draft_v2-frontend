"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { ROLE_DESCRIPTIONS } from "@/types/auth";

const ROLE_DASHBOARD: Record<string, string> = {
  admin: "/dashboard/admin",
  editor: "/dashboard/editor",
  viewer: "/dashboard/viewer",
};

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const user = await login(email, password);
      const destination = user.role
        ? ROLE_DASHBOARD[user.role] ?? "/dashboard"
        : "/dashboard";
      router.push(destination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    }
  }

  return (
    <div className="auth-shell">
      {/* Animated background orbs */}
      <div style={{
        position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0,
      }}>
        <div style={{
          position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)",
          width: "600px", height: "600px",
          background: "radial-gradient(circle, rgba(108,99,255,0.2) 0%, transparent 70%)",
          animation: "pulse 8s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", bottom: "-10%", right: "-10%",
          width: "400px", height: "400px",
          background: "radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%)",
          animation: "pulse 12s ease-in-out infinite reverse",
        }} />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.8; }
          50% { transform: translateX(-50%) scale(1.15); opacity: 1; }
        }
      `}</style>

      <div className="login-card" style={{ position: "relative", zIndex: 1 }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            width: 56, height: 56, borderRadius: "1rem",
            background: "linear-gradient(135deg, #6c63ff, #a78bfa)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1rem",
            boxShadow: "0 8px 32px rgba(108,99,255,0.4)",
            fontSize: "1.5rem",
          }}>
            🏗
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0, marginBottom: ".375rem" }}>
            Welcome back
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: ".9rem", margin: 0 }}>
            Sign in to ArchPlaybook
          </p>
        </div>

        {/* Demo credentials hint */}
        <div style={{
          background: "rgba(108,99,255,0.08)",
          border: "1px solid rgba(108,99,255,0.2)",
          borderRadius: ".75rem",
          padding: ".75rem 1rem",
          marginBottom: "1.5rem",
          fontSize: ".8125rem",
          color: "rgba(255,255,255,0.6)",
        }}>
          <div style={{ fontWeight: 600, color: "#a78bfa", marginBottom: ".375rem" }}>
            Available Roles
          </div>
          {Object.entries(ROLE_DESCRIPTIONS).map(([role, desc]) => (
            <div key={role} style={{ display: "flex", gap: ".5rem", marginBottom: ".2rem" }}>
              <span className={`badge badge-${role}`}>{role}</span>
              <span style={{ fontSize: ".75rem" }}>{desc}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Email */}
          <div style={{ display: "flex", flexDirection: "column", gap: ".375rem" }}>
            <label htmlFor="email" style={{ fontSize: ".875rem", color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`input-field`}
              placeholder="you@example.com"
            />
          </div>

          {/* Password */}
          <div style={{ display: "flex", flexDirection: "column", gap: ".375rem" }}>
            <label htmlFor="password" style={{ fontSize: ".875rem", color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`input-field`}
                placeholder="••••••••"
                style={{ paddingRight: "2.75rem" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute", right: ".75rem", top: "50%",
                  transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "rgba(255,255,255,0.4)", fontSize: "1rem", lineHeight: 1,
                  padding: "0",
                }}
                aria-label="Toggle password visibility"
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && <div className="alert-error">{error}</div>}

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            className="btn-primary"
            disabled={isLoading}
            style={{ marginTop: ".5rem" }}
          >
            {isLoading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem" }}>
                <span className="spinner" /> Signing in…
              </span>
            ) : "Sign in"}
          </button>
        </form>

        <div className="divider" />

        <p style={{ textAlign: "center", fontSize: ".8125rem", color: "rgba(255,255,255,0.35)", margin: 0 }}>
          ArchPlaybook · RBAC-Enabled Platform · v1.0
        </p>
      </div>
    </div>
  );
}
