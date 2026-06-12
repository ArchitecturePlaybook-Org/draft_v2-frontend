"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/domains/auth/api";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  if (!uid || !token) {
    return (
      <div className="flex min-h-[100dvh] flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[var(--background-default)]">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-4">
            Invalid Link
          </h2>
          <p className="text-[var(--text-secondary)] mb-6">The password reset link is invalid or missing parameters.</p>
          <Link href="/forgot-password" className="text-[var(--primary-main)] hover:text-[var(--primary-dark)] font-medium">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setStatus("error");
      setMessage("Password must be at least 8 characters long.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      await authApi.confirmPasswordReset({
        uid,
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setStatus("success");
      setMessage("Your password has been reset successfully.");
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Failed to reset password. The link may have expired.");
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[var(--background-default)]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Set new password
        </h2>
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
              <Link href="/login" className="flex w-full justify-center rounded-md border border-transparent bg-[var(--primary-main)] py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-[var(--primary-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-main)] focus:ring-offset-2">
                Sign in with new password
              </Link>
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
                <label htmlFor="new_password" className="block text-sm font-medium text-[var(--text-primary)]">
                  New Password
                </label>
                <div className="mt-1">
                  <input
                    id="new_password"
                    name="new_password"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full appearance-none rounded-md border border-[var(--border-default)] px-3 py-2 placeholder-gray-400 shadow-sm focus:border-[var(--primary-main)] focus:outline-none focus:ring-[var(--primary-main)] sm:text-sm bg-[var(--background-default)] text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirm_password" className="block text-sm font-medium text-[var(--text-primary)]">
                  Confirm New Password
                </label>
                <div className="mt-1">
                  <input
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                  {status === "loading" ? "Saving..." : "Reset Password"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
