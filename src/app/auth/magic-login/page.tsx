"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/domains/auth/api";
import { useAuthStore } from "@/store/auth-store";

import { Suspense } from "react";

function MagicLoginContent() {
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setUser } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setErrorMsg("No magic link token found in URL.");
      return;
    }

    const verifyToken = async () => {
      try {
        const data = await authApi.verifyMagicLink(token);
        
        // Log the user in (BFF proxy already set the http-only cookies)
        setUser(data.user || null);
        
        setStatus("success");
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } catch (err: any) {
        setStatus("error");
        setErrorMsg(err.message || "Failed to verify magic link.");
      }
    };

    verifyToken();
  }, [searchParams, router, setUser]);

  return (
    <div className="relative">
      <div className="w-20 h-20 bg-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
        {status === "verifying" && (
          <svg className="w-10 h-10 text-primary animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )}
        {status === "success" && (
          <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {status === "error" && (
          <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>

      <h1 className="text-2xl font-bold text-primary tracking-tight">
        {status === "verifying" && "Verifying Magic Link..."}
        {status === "success" && "Authentication Successful!"}
        {status === "error" && "Link Expired or Invalid"}
      </h1>
      
      <p className="text-sm text-surface-500 mt-2">
        {status === "verifying" && "Please wait while we securely authenticate your session."}
        {status === "success" && "Initializing dashboard..."}
        {status === "error" && errorMsg}
      </p>

      {status === "error" && (
        <button 
          onClick={() => router.push("/login")}
          className="mt-8 px-6 py-3 bg-primary text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-lg hover:bg-accent transition-all"
        >
          Return to Login
        </button>
      )}
    </div>
  );
}

export default function MagicLoginVerifyPage() {
  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-10 border border-surface-200 shadow-xl text-center space-y-6 relative overflow-hidden">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 arch-grid opacity-5 pointer-events-none" />
        <Suspense fallback={<div className="p-4">Loading verification...</div>}>
          <MagicLoginContent />
        </Suspense>
      </div>
    </div>
  );
}
