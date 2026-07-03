"use client";

import React, { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { billingApi } from "@/domains/billing/api";
import { toast } from "sonner";

interface UpiIdInputProps {
  orderId: string;
  amount: number; // paise
}

export function UpiIdInput({ orderId, amount }: UpiIdInputProps) {
  const [vpa, setVpa] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "waiting" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const isValidVpa = (v: string) => /^[a-zA-Z0-9._-]+@[a-zA-Z]+$/.test(v);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!isValidVpa(vpa)) {
      setErrorMsg("Please enter a valid UPI ID (e.g., yourname@bank)");
      return;
    }

    setStatus("submitting");

    try {
      await billingApi.triggerUpiCollect(orderId, vpa, amount);
      setStatus("waiting");
      toast.success("Payment request sent to your UPI app");
    } catch (err: any) {
      console.error("Failed to trigger collect", err);
      setStatus("error");
      setErrorMsg(err.message || "Failed to send payment request. Please try again.");
      toast.error("Failed to send UPI request");
    }
  };

  if (status === "waiting") {
    return (
      <div className="text-center space-y-6 py-8">
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 bg-accent/20 rounded-full animate-ping"></div>
          <div className="relative bg-surface-900 border-2 border-accent w-full h-full rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(var(--color-accent),0.3)]">
            <CheckCircle2 className="w-10 h-10 text-accent" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white">Payment Request Sent</h3>
          <p className="text-sm text-surface-400">
            We've sent a request to <span className="text-white font-medium">{vpa}</span>.
          </p>
          <p className="text-xs text-accent font-medium mt-4">
            Please open your UPI app to approve the payment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
      <div className="space-y-2">
        <label htmlFor="vpa" className="text-xs font-bold uppercase tracking-widest text-surface-400">
          Enter your UPI ID
        </label>
        <div className="relative">
          <input
            id="vpa"
            type="text"
            value={vpa}
            onChange={(e) => setVpa(e.target.value)}
            placeholder="username@bank"
            disabled={status === "submitting"}
            className="w-full bg-surface-900 border border-surface-700 rounded-xl px-4 py-4 text-white placeholder-surface-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-mono"
            autoComplete="off"
            spellCheck="false"
          />
        </div>
        {errorMsg && (
          <p className="text-xs font-medium text-red-400 flex items-center gap-1.5 mt-2">
            <AlertCircle className="w-3.5 h-3.5" />
            {errorMsg}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={status === "submitting" || !vpa.trim()}
        className="w-full h-14 bg-accent text-background font-black text-sm uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-accent/20"
      >
        {status === "submitting" ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Sending...
          </>
        ) : (
          `Pay ₹${(amount / 100).toFixed(2)}`
        )}
      </button>

      <p className="text-center text-[10px] text-surface-500 mt-4">
        By continuing, you authorize us to send a payment request to your UPI app.
      </p>
    </form>
  );
}
