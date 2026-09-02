"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft, ShieldCheck, Smartphone, ScanLine, KeySquare } from "lucide-react";
import { billingApi, UpiOrder } from "@/domains/billing/api";
import { usePermissions } from "@/hooks/use-permissions";
import { UpiQrCode } from "@/components/billing/UpiQrCode";
import { UpiAppButtons } from "@/components/billing/UpiAppButtons";
import { UpiIdInput } from "@/components/billing/UpiIdInput";

type Tab = "qr" | "app" | "vpa";

function UpiCheckoutInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [accountId, setAccountId] = useState<number | null>(null);
  
  const [activeTab, setActiveTab] = useState<Tab>("qr");
  const [order, setOrder] = useState<UpiOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid" | "failed">("pending");

  const planCode = searchParams.get("plan");
  const billingCycle = (searchParams.get("billing_cycle") || "monthly") as "monthly" | "yearly";

  const fetchOrder = async () => {
    if (!planCode) return;
    
    setLoading(true);
    setError(null);
    try {
      let actId = accountId;
      if (!actId) {
        const subs = await billingApi.getCurrentSubscription();
        if (subs.length > 0) {
          actId = subs[0].account;
          setAccountId(actId);
        } else {
          throw new Error("Could not determine your account.");
        }
      }
      const data = await billingApi.createUpiOrder(actId, planCode, billingCycle);
      setOrder(data);
    } catch (err: any) {
      console.error("Failed to create UPI order", err);
      setError(err.message || "Failed to initialize payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [planCode]);

  // Polling for payment status
  useEffect(() => {
    if (!order || paymentStatus !== "pending") return;

    const interval = setInterval(async () => {
      try {
        const { status } = await billingApi.getUpiPaymentStatus(order.order_id);
        
        if (status === "paid") {
          setPaymentStatus("paid");
          clearInterval(interval);
          // Redirect to success page
          setTimeout(() => {
            router.replace(`/billing/success?order_id=${order.order_id}&plan=${planCode}`);
          }, 1000);
        } else if (status === "failed") {
          setPaymentStatus("failed");
          setError("Payment failed. Please try again.");
          clearInterval(interval);
        }
      } catch (err) {
        // Ignore network errors during polling
      }
    }, 3000); // poll every 3s

    return () => clearInterval(interval);
  }, [order, paymentStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center space-y-6">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
        <p className="text-surface-400 font-medium">Initializing secure UPI connection...</p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center p-6">
        <div className="bg-surface-900 border border-surface-800 p-8 rounded-2xl max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto">
            <span className="text-2xl font-black">!</span>
          </div>
          <h2 className="text-xl font-bold text-white">Payment Initialization Failed</h2>
          <p className="text-surface-400">{error}</p>
          <button 
            onClick={() => router.back()}
            className="px-6 py-3 bg-surface-800 hover:bg-surface-700 text-white rounded-xl font-medium transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-surface-800 bg-surface-900/50 p-4 sticky top-0 z-10 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => router.push("/dashboard/subscription")}
            className="flex items-center gap-2 text-sm text-surface-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Cancel Payment
          </button>
          <div className="flex items-center gap-2 text-surface-400">
            <ShieldCheck className="w-4 h-4 text-green-400" />
            <span className="text-xs font-medium tracking-wide uppercase">Secure Checkout</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-[900px] flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Left Column: Order Summary */}
          <div className="w-full lg:w-[360px] bg-surface-900 rounded-3xl border border-surface-800 p-8 shadow-2xl shrink-0">
            <div className="mb-8">
              <img src="/logo.png" alt="Logo" className="h-8 mb-6" onError={(e) => e.currentTarget.style.display = 'none'} />
              <h2 className="text-surface-400 text-sm font-bold tracking-widest uppercase mb-1">Order Summary</h2>
              <h1 className="text-2xl font-black text-white">
                {planCode?.charAt(0).toUpperCase()}{planCode?.slice(1)} Plan
              </h1>
              <p className="text-surface-400 text-sm mt-1 capitalize">{billingCycle} Billing</p>
            </div>

            <div className="bg-surface-950 rounded-2xl p-6 mb-8 border border-surface-800">
              <div className="flex items-end justify-between">
                <span className="text-surface-400 font-medium">Total Amount</span>
                <div className="text-right">
                  <span className="text-3xl font-black text-white">
                    ₹{(order.amount / 100).toFixed(2)}
                  </span>
                  <p className="text-xs text-surface-500 mt-1">Includes GST</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-surface-400">
                <div className="w-8 h-8 rounded-full bg-green-500/10 text-green-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span>Safe and secure payments powered by Razorpay.</span>
              </div>
            </div>
          </div>

          {/* Right Column: Payment Interface */}
          <div className="flex-1 w-full bg-surface-900 rounded-3xl border border-surface-800 shadow-2xl overflow-hidden relative min-h-[500px] flex flex-col">
            
            {/* Payment Success Overlay */}
            <AnimatePresence>
              {paymentStatus === "paid" && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-surface-900 z-50 flex flex-col items-center justify-center p-8 text-center"
                >
                  <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(34,197,94,0.4)] mb-8">
                    <ShieldCheck className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-3xl font-black text-white mb-2">Payment Successful!</h2>
                  <p className="text-surface-400">Activating your subscription...</p>
                  <Loader2 className="w-6 h-6 text-green-400 animate-spin mt-8" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tabs */}
            <div className="flex border-b border-surface-800">
              <button 
                onClick={() => setActiveTab("qr")}
                className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors relative
                  ${activeTab === "qr" ? "text-accent bg-surface-800/30" : "text-surface-400 hover:text-surface-200"}`}
              >
                <ScanLine className="w-4 h-4" />
                QR Code
                {activeTab === "qr" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
              </button>
              <button 
                onClick={() => setActiveTab("app")}
                className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors relative
                  ${activeTab === "app" ? "text-accent bg-surface-800/30" : "text-surface-400 hover:text-surface-200"}`}
              >
                <Smartphone className="w-4 h-4" />
                Pay via App
                {activeTab === "app" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
              </button>
              <button 
                onClick={() => setActiveTab("vpa")}
                className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors relative
                  ${activeTab === "vpa" ? "text-accent bg-surface-800/30" : "text-surface-400 hover:text-surface-200"}`}
              >
                <KeySquare className="w-4 h-4" />
                UPI ID
                {activeTab === "vpa" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-8 flex-1 flex flex-col justify-center relative">
              <AnimatePresence mode="wait">
                {activeTab === "qr" && (
                  <motion.div 
                    key="qr"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="w-full flex justify-center"
                  >
                    <UpiQrCode 
                      qrImageUrl={order.qr_image_url} 
                      expiresAt={Date.now() + 15 * 60 * 1000} // Approximate since Razorpay sets it server side
                      onRefresh={fetchOrder} 
                    />
                  </motion.div>
                )}

                {activeTab === "app" && (
                  <motion.div 
                    key="app"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="w-full"
                  >
                    <UpiAppButtons amount={order.amount} upiString={order.upi_string} />
                  </motion.div>
                )}

                {activeTab === "vpa" && (
                  <motion.div 
                    key="vpa"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="w-full"
                  >
                    <UpiIdInput orderId={order.order_id} amount={order.amount} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Status Indicator (visible in all tabs except when paid) */}
              {paymentStatus === "pending" && (
                <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-20">
                  <div className="bg-surface-800/80 backdrop-blur-sm border border-surface-700 py-2 px-4 rounded-full flex items-center gap-3 shadow-xl">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
                    </span>
                    <span className="text-xs font-medium tracking-wide text-surface-200">Waiting for payment...</span>
                  </div>
                </div>
              )}

              {/* Dev Mode Simulator */}
              {order.order_id.includes("test_") && paymentStatus === "pending" && (
                <div className="absolute top-4 right-4 z-50">
                  <button 
                    onClick={async () => {
                      // Trigger mock webhook
                      try {
                        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                        await fetch(`${backendUrl}/api/v1/billing/webhook/razorpay/`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            event: "payment.captured",
                            payload: {
                              payment: {
                                entity: {
                                  id: `pay_mock_${Date.now()}`,
                                  order_id: order.order_id,
                                  amount: order.amount,
                                  currency: "INR",
                                  notes: {
                                    ap_payment_type: "upi_one_time",
                                    ap_account_id: accountId,
                                    ap_plan_code: planCode,
                                    ap_billing_cycle: billingCycle
                                  }
                                }
                              }
                            }
                          })
                        });
                        setPaymentStatus("paid");
                        setTimeout(() => {
                          router.replace(`/billing/success?order_id=${order.order_id}&plan=${planCode}`);
                        }, 1000);
                      } catch (e) {
                        console.error("Mock webhook failed", e);
                      }
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg shadow-lg"
                  >
                    Simulate Payment (Dev)
                  </button>
                </div>
              )}
            </div>

            {/* Alternative Payment Link */}
            <div className="bg-surface-950 p-4 border-t border-surface-800 text-center">
              <button
                onClick={() => router.push(`/billing/checkout?plan=${planCode}&billing_cycle=${billingCycle}&provider=razorpay`)}
                className="text-xs text-surface-400 hover:text-white transition-colors underline underline-offset-4"
              >
                Use Credit Card, Debit Card, or Netbanking instead
              </button>
            </div>
            
          </div>
        </div>
      </main>
    </div>
  );
}

export default function UpiCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
      </div>
    }>
      <UpiCheckoutInner />
    </Suspense>
  );
}
