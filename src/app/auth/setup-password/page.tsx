"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Building2,
  UserCheck,
  ArrowRight,
  Loader2,
  KeyRound,
} from "lucide-react";
import { inventoryApi } from "@/domains/inventory/api";

function SetupPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";

  const [verifying, setVerifying] = useState(true);
  const [tokenInfo, setTokenInfo] = useState<{
    valid: boolean;
    vendor_name?: string;
    vendor_code?: string;
    admin_name?: string;
    email?: string;
    error?: string;
  } | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function verify() {
      if (!token) {
        setTokenInfo({
          valid: false,
          error:
            "No onboarding token provided in the link. Please check your invitation email or request a new onboarding link from your administrator.",
        });
        setVerifying(false);
        return;
      }

      try {
        const res = await inventoryApi.verifyOnboardingToken(token);
        setTokenInfo(res);
      } catch (err: any) {
        setTokenInfo({
          valid: false,
          error: "Failed to verify token. Network error or invalid link format.",
        });
      } finally {
        setVerifying(false);
      }
    }
    verify();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await inventoryApi.completeOnboarding({
        token,
        password,
        confirm_password: confirmPassword,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        if (res.access) {
          localStorage.setItem("accessToken", res.access);
        }
        setTimeout(() => {
          router.push("/dashboard/inventory");
        }, 2000);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to complete setup.");
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Loading State
  if (verifying) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans text-zinc-100">
        <div className="p-8 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-2xl text-center space-y-4 max-w-md w-full">
          <Loader2 className="w-10 h-10 text-amber-400 animate-spin mx-auto" />
          <h2 className="text-lg font-bold text-white">Verifying Security Token...</h2>
          <p className="text-xs text-zinc-400">Validating single-use onboarding credentials against DB ledger.</p>
        </div>
      </div>
    );
  }

  // 2. Invalid or Expired Link State
  if (!tokenInfo || !tokenInfo.valid) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans text-zinc-100">
        <div className="max-w-md w-full rounded-2xl bg-zinc-900 border border-red-500/30 shadow-2xl p-8 space-y-6 text-center animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/30 uppercase">
              Security Notice · Link Invalid
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Invitation Link Expired or Not Found
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {tokenInfo?.error ||
                "This invitation link is invalid, expired, or has already been used. Link tokens are single-use and expire within 24 hours for security."}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-left text-xs space-y-1.5 font-mono">
            <div className="text-zinc-500 text-[10px] uppercase font-semibold">What can you do?</div>
            <p className="text-zinc-300 text-[11px]">
              • Contact your administrator to request a new onboarding invitation link.
            </p>
            <p className="text-zinc-300 text-[11px]">
              • If you already set up your password, you can proceed directly to log in.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Link
              href="/auth/login"
              className="w-full h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20"
            >
              Go to Login Portal <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Success State
  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans text-zinc-100">
        <div className="max-w-md w-full rounded-2xl bg-zinc-900 border border-emerald-500/30 shadow-2xl p-8 space-y-6 text-center animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-white">
              Password Activated Successfully!
            </h1>
            <p className="text-xs text-emerald-300">
              Welcome, <strong>{tokenInfo.admin_name || tokenInfo.email}</strong>. Your Vendor Admin account for{" "}
              <strong>{tokenInfo.vendor_name}</strong> is now active.
            </p>
          </div>

          <p className="text-xs text-zinc-400">
            Redirecting you to your Vendor Inventory Dashboard in 2 seconds...
          </p>

          <Link
            href="/dashboard/inventory"
            className="w-full h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20"
          >
            Go to Inventory Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // 4. Valid Token — Password Setup Form
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans text-zinc-100">
      <div className="max-w-md w-full rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in duration-200">
        {/* Header Banner */}
        <div className="p-6 bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 border-b border-zinc-800 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                Vendor Onboarding Portal
              </span>
              <h1 className="text-lg font-bold tracking-tight text-white mt-0.5">
                Set Your Vendor Password
              </h1>
            </div>
          </div>

          {/* Vendor Details Box */}
          <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-[10px] font-semibold uppercase">
              <span>Organization</span>
              <span className="font-mono text-amber-400 font-bold">{tokenInfo.vendor_code}</span>
            </div>
            <div className="font-bold text-white text-sm">{tokenInfo.vendor_name}</div>
            <div className="text-zinc-400 text-[11px] flex items-center gap-2 pt-1 border-t border-zinc-800/80">
              <span>Account: <strong className="text-zinc-200">{tokenInfo.email}</strong></span>
              <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Role: Vendor Admin
              </span>
            </div>
          </div>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 mb-1">
              New Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="At least 8 characters"
                className="w-full h-10 pl-9 pr-10 text-xs bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 mb-1">
              Confirm New Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Repeat new password"
                className="w-full h-10 pl-9 pr-10 text-xs bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Password rules indicator */}
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
            <div className="font-semibold text-zinc-300 text-[10px] uppercase">Security Requirements</div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className={`w-3.5 h-3.5 ${password.length >= 8 ? "text-emerald-400" : "text-zinc-600"}`} />
              <span>At least 8 characters long</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className={`w-3.5 h-3.5 ${password && password === confirmPassword ? "text-emerald-400" : "text-zinc-600"}`} />
              <span>Passwords match</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || password.length < 8 || password !== confirmPassword}
            className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Activating Account...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" /> Activate Vendor Admin Account
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SetupPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans text-zinc-100">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        </div>
      }
    >
      <SetupPasswordForm />
    </Suspense>
  );
}
