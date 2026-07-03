"use client";

import { Suspense } from "react";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, CreditCard, ShieldCheck, ArrowLeft, AlertCircle } from "lucide-react";

const PLAN_PRICES: Record<string, { monthly: string; yearly: string; name: string }> = {
  starter: { monthly: "₹0", yearly: "₹0", name: "Starter" },
  professional: { monthly: "₹2,499", yearly: "₹24,999", name: "Professional" },
  enterprise: { monthly: "₹9,999", yearly: "₹99,999", name: "Enterprise" },
};

function MockCheckoutInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const sessionId = searchParams.get("session_id") ?? "";
  const provider = searchParams.get("provider") ?? "razorpay";
  const plan = searchParams.get("plan") ?? "professional";
  const billingCycle = searchParams.get("billing_cycle") ?? "monthly";

  const planInfo = PLAN_PRICES[plan] ?? PLAN_PRICES.professional;
  const price = billingCycle === "yearly" ? planInfo.yearly : planInfo.monthly;

  const handleConfirm = async () => {
    setIsProcessing(true);
    // Simulate payment processing delay
    await new Promise((res) => setTimeout(res, 1500));
    // Call the backend webhook with a mock success event
    try {
      await fetch(`/api/v1/billing/webhook/${provider}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          provider === "razorpay"
            ? {
                event: "subscription.charged",
                payload: {
                  subscription: { entity: { id: sessionId, charge_at: null } },
                  payment: { entity: { id: `pay_mock_${Date.now()}`, amount: 249900, currency: "INR" } },
                },
              }
            : {
                type: "checkout.session.completed",
                data: { object: { subscription: sessionId } },
              }
        ),
      });
    } catch {
      // If webhook fails in dev, just redirect anyway
    }
    router.replace(`/billing/success?plan=${plan}&session_id=${sessionId}&provider=${provider}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-surface-950 to-surface-950 pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-accent/10 blur-[100px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 25 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Dev mode banner */}
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-[10px] font-bold uppercase tracking-widest">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          Development Mode — No real payment will be charged
        </div>

        <div className="bg-surface-900 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="p-8 border-b border-white/10 bg-gradient-to-br from-accent/10 to-transparent">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-tight">Mock Checkout</h1>
                <p className="text-surface-400 text-[11px] font-medium">Architecture Playbook</p>
              </div>
            </div>

            {/* Order summary */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-surface-400 uppercase tracking-widest">Plan</span>
                <span className="text-sm font-black text-white">{planInfo.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-surface-400 uppercase tracking-widest">Billing</span>
                <span className="text-sm font-black text-white capitalize">{billingCycle}</span>
              </div>
              <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                <span className="text-[11px] font-bold text-surface-400 uppercase tracking-widest">Total</span>
                <span className="text-2xl font-black text-white">{price}</span>
              </div>
            </div>
          </div>

          {/* Fake card form */}
          <div className="p-8 space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest">
                Card Number
              </label>
              <div className="h-12 bg-white/5 border border-white/10 rounded-xl px-4 flex items-center text-surface-500 text-sm font-mono tracking-widest">
                4242 4242 4242 4242
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest">
                  Expiry
                </label>
                <div className="h-12 bg-white/5 border border-white/10 rounded-xl px-4 flex items-center text-surface-500 text-sm font-mono">
                  12/28
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest">
                  CVV
                </label>
                <div className="h-12 bg-white/5 border border-white/10 rounded-xl px-4 flex items-center text-surface-500 text-sm font-mono">
                  •••
                </div>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="w-full h-13 flex items-center justify-center gap-3 bg-accent hover:bg-accent/90 text-background font-black text-[11px] uppercase tracking-[0.25em] rounded-2xl transition-all disabled:opacity-70 shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] py-4"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Confirm Payment
                </>
              )}
            </button>

            <button
              onClick={() => router.replace("/dashboard/subscription")}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 h-10 text-[10px] font-bold text-surface-500 uppercase tracking-widest hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Cancel
            </button>

            <div className="flex items-center justify-center gap-2 pt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-surface-600" />
              <p className="text-[10px] text-surface-600 font-medium">
                Simulated for development. No real charges.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-surface-700 mt-4 font-mono">
          Session: {sessionId.slice(0, 24)}…
        </p>
      </motion.div>
    </div>
  );
}

export default function MockCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
      </div>
    }>
      <MockCheckoutInner />
    </Suspense>
  );
}
