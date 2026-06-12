"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/domains/auth/api";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email...");
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (!uid || !token) {
      setStatus("error");
      setMessage("Invalid verification link.");
      return;
    }
    
    if (verifiedRef.current) return;
    verifiedRef.current = true;

    authApi.verifyEmail(uid, token)
      .then(() => {
        setStatus("success");
        setMessage("Your email has been verified successfully!");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.message || "Failed to verify email. The link may have expired.");
      });
  }, [uid, token]);

  return (
    <div className="flex min-h-[100dvh] flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[var(--background-default)]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Email Verification
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[var(--surface-default)] py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-[var(--border-default)] text-center">
          {status === "loading" && (
            <div className="text-[var(--text-secondary)]">
              <svg className="animate-spin h-8 w-8 text-[var(--primary-main)] mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p>{message}</p>
            </div>
          )}

          {status === "success" && (
            <div>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-[var(--text-primary)] font-medium mb-6">{message}</p>
              <Link href="/login" className="flex w-full justify-center rounded-md border border-transparent bg-[var(--primary-main)] py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-[var(--primary-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-main)] focus:ring-offset-2">
                Sign in to your account
              </Link>
            </div>
          )}

          {status === "error" && (
            <div>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-[var(--text-primary)] font-medium mb-6">{message}</p>
              <Link href="/login" className="text-[var(--primary-main)] hover:text-[var(--primary-dark)] font-medium">
                Return to login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
