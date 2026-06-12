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
    <div className="flex min-h-[100dvh] flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[var(--background-default)]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Reset your password
        </h2>
        <p className="mt-2 text-center text-sm text-[var(--text-secondary)]">
          Or{" "}
          <Link href="/login" className="font-medium text-[var(--primary-main)] hover:text-[var(--primary-dark)]">
            return to login
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[var(--surface-default)] py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-[var(--border-default)]">
          {status === "success" ? (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-[var(--text-primary)] font-medium mb-6">{message}</p>
              <p className="text-sm text-[var(--text-secondary)]">
                Please check your inbox and spam folder.
              </p>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {status === "error" && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{message}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[var(--text-primary)]">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full appearance-none rounded-md border border-[var(--border-default)] px-3 py-2 placeholder-gray-400 shadow-sm focus:border-[var(--primary-main)] focus:outline-none focus:ring-[var(--primary-main)] sm:text-sm bg-[var(--background-default)] text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="flex w-full justify-center rounded-md border border-transparent bg-[var(--primary-main)] py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-[var(--primary-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-main)] focus:ring-offset-2 disabled:opacity-50"
                >
                  {status === "loading" ? "Sending..." : "Send reset link"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
