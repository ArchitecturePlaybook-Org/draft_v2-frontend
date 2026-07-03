"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { motion } from "framer-motion";
import { Loader2, AlertCircle } from "lucide-react";

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
    if (provider === "razorpay" && subscriptionId && keyId) {
      // Load Razorpay checkout script dynamically
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => openRazorpayCheckout();
      script.onerror = () => setError("Failed to load payment gateway. Please check your connection.");
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
        if (razorpayRef.current) {
          razorpayRef.current.close();
        }
      };
    } else {
      // Fallback: redirect to mock checkout
      router.replace(`/billing/mock-checkout?${searchParams.toString()}`);
    }
  }, []);

  const openRazorpayCheckout = () => {
    setStatus("opening");

    const options = {
      key: keyId,
      subscription_id: subscriptionId,
      name: "Architecture Playbook",
      description: `${plan?.charAt(0).toUpperCase()}${plan?.slice(1)} Plan Subscription`,
      image: "/logo.png",
      handler: function (response: any) {
        // Payment successful — redirect to success page
        router.replace(
          `/billing/success?subscription_id=${response.razorpay_subscription_id}&payment_id=${response.razorpay_payment_id}&plan=${plan}`
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
      razorpayRef.current.open();
    } else {
      setError("Payment gateway could not be initialized. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6 p-10 max-w-sm"
      >
        {status === "error" ? (
          <>
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto" />
            <h2 className="text-xl font-black text-white">Payment Gateway Error</h2>
            <p className="text-surface-400 text-sm">{error}</p>
            <button
              onClick={() => router.replace("/dashboard/subscription")}
              className="mt-4 px-6 py-3 bg-accent text-background font-bold text-xs uppercase tracking-widest rounded-xl"
            >
              Back to Subscription
            </button>
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
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
      </div>
    }>
      <CheckoutInner />
    </Suspense>
  );
}
