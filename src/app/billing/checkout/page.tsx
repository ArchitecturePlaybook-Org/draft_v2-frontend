"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

function CheckoutInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "opening" | "error">("loading");
  const razorpayRef = useRef<any>(null);

  const subscriptionId = searchParams.get("subscription_id");
  const keyId = searchParams.get("key_id");
  const plan = searchParams.get("plan");
  const provider = searchParams.get("provider");

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (provider === "razorpay" && subscriptionId && keyId) {
      // 10-second safety timeout in case script or popup gets blocked/stuck
      timeoutId = setTimeout(() => {
        setStatus((currentStatus) => {
          if (currentStatus !== "error") {
            setError(
              "Payment gateway took too long to load. This might be caused by an AdBlocker, popup blocker, or invalid keys."
            );
            return "error";
          }
          return currentStatus;
        });
      }, 10000);

      const initRazorpay = () => {
        try {
          if (window.Razorpay) {
            clearTimeout(timeoutId);
            openRazorpayCheckout();
            return;
          }

          // Check if script already exists in document
          let script = document.querySelector<HTMLScriptElement>(
            'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
          );

          if (!script) {
            script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.async = true;
            document.body.appendChild(script);
          }

          script.onload = () => {
            clearTimeout(timeoutId);
            openRazorpayCheckout();
          };
          script.onerror = () => {
            clearTimeout(timeoutId);
            setError("Failed to load Razorpay script. Please check your network connection or AdBlocker settings.");
            setStatus("error");
          };
        } catch (err: any) {
          clearTimeout(timeoutId);
          setError(err?.message || "An unexpected error occurred while initializing payment.");
          setStatus("error");
        }
      };

      initRazorpay();

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (razorpayRef.current) {
          try {
            razorpayRef.current.close();
          } catch (_) {}
        }
      };
    } else {
      // Fallback: redirect to mock checkout
      router.replace(`/billing/mock-checkout?${searchParams.toString()}`);
    }
  }, []);

  const openRazorpayCheckout = () => {
    setStatus("opening");

    try {
      const options = {
        key: keyId,
        subscription_id: subscriptionId,
        name: "Architecture Playbook",
        description: `${plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "Pro"} Plan Subscription`,
        image: "/logo.png",
        handler: async function (response: any) {
          // Notify backend to activate subscription (handles local development where Razorpay cloud webhook cannot reach localhost)
          try {
            const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            await fetch(`${backendUrl}/api/v1/billing/webhook/razorpay/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                event: "subscription.charged",
                payload: {
                  subscription: { entity: { id: response.razorpay_subscription_id || subscriptionId, charge_at: null } },
                  payment: { entity: { id: response.razorpay_payment_id || `pay_${Date.now()}`, amount: 249900, currency: "INR" } },
                },
              }),
            });
          } catch (e) {
            console.error("Local activation webhook error:", e);
          }

          // Payment successful — redirect to success page
          router.replace(
            `/billing/success?subscription_id=${response.razorpay_subscription_id || subscriptionId}&payment_id=${response.razorpay_payment_id || ""}&plan=${plan}`
          );
        },
        modal: {
          ondismiss: function () {
            // User closed the payment modal — go back to subscription page
            router.replace("/dashboard/subscription");
          },
        },
        theme: {
          color: "#6366f1",
        },
      };

      if (window.Razorpay) {
        razorpayRef.current = new window.Razorpay(options);
        razorpayRef.current.on("payment.failed", function (response: any) {
          setError(response?.error?.description || "Payment failed. Please try another payment method.");
          setStatus("error");
        });
        razorpayRef.current.open();
      } else {
        setError("Razorpay SDK is not available on this page.");
        setStatus("error");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to launch Razorpay checkout modal.");
      setStatus("error");
    }
  };

  const handleRetry = () => {
    setError(null);
    setStatus("loading");
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6 p-10 max-w-md bg-surface-900/80 backdrop-blur-md rounded-2xl border border-surface-800 shadow-2xl"
      >
        {status === "error" ? (
          <>
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto" />
            <h2 className="text-xl font-black text-white">Payment Gateway Error</h2>
            <p className="text-surface-400 text-sm leading-relaxed">{error}</p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={handleRetry}
                className="flex-1 px-4 py-2.5 bg-accent text-background font-bold text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition"
              >
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
              <button
                onClick={() => router.replace("/dashboard/subscription")}
                className="flex-1 px-4 py-2.5 bg-surface-800 text-surface-200 font-bold text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 hover:bg-surface-700 transition"
              >
                <ArrowLeft className="w-4 h-4" /> Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <Loader2 className="w-12 h-12 text-accent mx-auto animate-spin" />
            <h2 className="text-xl font-black text-white tracking-tight">
              {status === "loading" ? "Loading payment gateway..." : "Opening payment window..."}
            </h2>
            <p className="text-surface-400 text-sm font-medium">
              You'll be redirected to our secure payment provider in a moment.
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-surface-950">
          <Loader2 className="w-12 h-12 text-accent animate-spin" />
        </div>
      }
    >
      <CheckoutInner />
    </Suspense>
  );
}
