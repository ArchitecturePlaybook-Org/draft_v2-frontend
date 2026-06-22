"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import Link from "next/link";

function MagicLinkVerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const { setUser } = useAuthStore();

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No token provided in the URL.");
      return;
    }

    const verifyToken = async () => {
      try {
        const { authApi } = await import("@/domains/auth/api");
        const result = await authApi.verifyMagicLink(token);

        if (result.requires_2fa) {
          // If 2FA is enabled, we need to pass the pre_auth_token to the login page
          // so the user can enter their code.
          router.push(`/login?requires_2fa=true&pre_auth_token=${result.pre_auth_token}`);
          return;
        }

        // Store standard login credentials
        if (result.access && result.user) {
           setUser(result.user);
           setStatus("success");
           setTimeout(() => {
             router.push("/dashboard");
           }, 1000);
        } else {
           setStatus("error");
           setErrorMessage("Invalid response from server.");
        }
      } catch (error: any) {
        setStatus("error");
        setErrorMessage(error.message || "Failed to verify magic link. It may be expired or already used.");
      }
    };

    verifyToken();
  }, [token, router, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 font-sans selection:bg-accent/10 selection:text-accent p-6">
      <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full text-center space-y-6">
        {status === "loading" && (
          <div className="space-y-4">
            <div className="w-12 h-12 border-4 border-surface-200 border-t-accent rounded-full animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-primary tracking-tight">Verifying Magic Link...</h2>
            <p className="text-surface-600 text-sm">Please wait while we authenticate your session.</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h2 className="text-xl font-bold text-primary tracking-tight">Login Successful</h2>
            <p className="text-surface-600 text-sm">Redirecting you to the dashboard...</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </div>
            <h2 className="text-xl font-bold text-primary tracking-tight">Verification Failed</h2>
            <p className="text-red-600 text-sm font-medium">{errorMessage}</p>
            <Link href="/login" className="inline-block mt-4 w-full h-12 bg-primary text-white font-bold uppercase tracking-widest leading-12 rounded hover:bg-accent transition-colors flex items-center justify-center">
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MagicLinkVerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <MagicLinkVerifyContent />
    </Suspense>
  );
}
