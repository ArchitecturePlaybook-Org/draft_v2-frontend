"use client";

import { useState } from "react";
import Link from "next/link";
import { authApi } from "@/domains/auth/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await authApi.requestPasswordReset(email);
      setStatus("success");
      setMessage(res.detail || "If an account with that email exists, we have sent a password reset link.");
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "An error occurred. Please try again later.");
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans selection:bg-accent/10 selection:text-accent">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-surface-100 overflow-hidden items-center justify-center p-20 border-r border-surface-200">
        <div className="absolute inset-0 arch-grid opacity-20" />
        <div className="relative z-10 w-full max-w-lg aspect-square flex items-center justify-center">
          <svg viewBox="0 0 400 400" className="w-full h-full text-accent/20">
            <path d="M50 350 L350 350" stroke="currentColor" strokeWidth="1" />
            <path d="M50 350 L50 200 L150 100 L350 200 L350 350" stroke="currentColor" strokeWidth="1" fill="none" />
            <path d="M150 100 L150 350" stroke="currentColor" strokeWidth="1" />
            <circle cx="150" cy="100" r="4" fill="currentColor" />
            <rect x="80" y="250" width="30" height="60" stroke="currentColor" strokeWidth="1" fill="none" />
            <rect x="200" y="230" width="100" height="80" stroke="currentColor" strokeWidth="1" fill="none" />
          </svg>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <h3 className="text-primary/10 text-9xl font-bold uppercase tracking-tighter select-none">ARCH</h3>
          </div>
        </div>
        <div className="absolute bottom-16 left-16 right-16 text-primary/40">
          <p className="text-sm font-medium tracking-tight uppercase">Intent Translation Platform v1.0</p>
          <div className="h-[1px] w-12 bg-accent/30 mt-4" />
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 py-12 relative">
        <div className="max-w-md w-full mx-auto space-y-10 animate-in slide-in-from-right-4 duration-700">
          {/* Logo & Header */}
          <div className="space-y-6">
            <Link href="/" className="inline-block group">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className="w-10 h-10 transition-transform group-hover:scale-105" preserveAspectRatio="xMidYMid meet">
                <polygon points="50,0 0,200 100,200" fill="#111827" />
                <polygon points="100,0 100,100 200,50" fill="#111827" />
              </svg>
            </Link>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-primary">
                Password Recovery
              </h1>
              <p className="text-surface-600 font-medium">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>
          </div>

          {status === "success" ? (
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-2 text-center pb-2">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                      <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                  </div>
                  <h3 className="text-lg font-bold text-primary">Check your email</h3>
                  <p className="text-sm text-surface-600 px-4">{message}</p>
              </div>
              <div className="text-center pt-4">
                  <Link href="/login" className="text-xs font-semibold text-accent hover:underline">
                  &larr; Back to login
                  </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-5 animate-in fade-in duration-300">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-[13px] font-bold text-primary uppercase tracking-wider">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 px-0 bg-transparent border-b-2 border-surface-200 outline-none transition-all focus:border-accent placeholder:text-surface-600/40"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              {status === "error" && (
                <div className="text-red-500 text-sm font-semibold animate-in fade-in slide-in-from-top-1">{message}</div>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full h-14 bg-primary text-white font-bold uppercase tracking-[0.2em] transition-all hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-center gap-4"
              >
                {status === "loading" ? "Sending..." : (<>Send Link <ArrowRightIcon /></>)}
              </button>

              <div className="text-center pt-2">
                <Link href="/login" className="text-xs font-semibold text-accent hover:underline">
                  &larr; Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function ArrowRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1">
      <line x1="5" y1="12" x2="19" y2="12"></line>
      <polyline points="12 5 19 12 12 19"></polyline>
    </svg>
  );
}
