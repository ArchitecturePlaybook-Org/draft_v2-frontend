"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { CheckCircle2, Loader2, ArrowRight, Sparkles } from "lucide-react";

const PLAN_PERKS: Record<string, string[]> = {
  professional: [
    "15 active projects unlocked",
    "Matrix Engine enabled",
    "AI Estimation (50 runs/month)",
    "Field Diary & HSE modules",
    "Analytics Dashboard",
  ],
  enterprise: [
    "Unlimited projects & storage",
    "Unlimited AI Estimation",
    "API access enabled",
    "SSO & Auto-join domain",
    "Dedicated customer success manager",
  ],
  starter: ["3 projects", "2 GB storage", "2 team members"],
};

function PaymentSuccessInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  const plan = searchParams.get("plan") ?? "professional";
  const paymentId = searchParams.get("payment_id");
  const sessionId = searchParams.get("session_id");
  const perks = PLAN_PERKS[plan] ?? PLAN_PERKS.professional;

  // Auto-redirect countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          router.replace("/dashboard/subscription");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [router]);

  const ref = paymentId || sessionId;

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 relative overflow-hidden">
      {/* Background ambient */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-surface-950 to-accent/10 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="relative z-10 text-center space-y-8 p-10 max-w-lg w-full mx-4"
      >
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
          className="relative mx-auto w-24 h-24"
        >
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
          <div className="relative w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
          </div>
        </motion.div>

        {/* Heading */}
        <div className="space-y-3">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-black text-white tracking-tighter"
          >
            Payment Successful!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-surface-400 font-medium text-sm leading-relaxed"
          >
            Welcome to the{" "}
            <span className="text-emerald-400 font-bold capitalize">{plan}</span> plan.
            Your subscription is now active.
          </motion.p>
          {ref && (
            <p className="text-[10px] text-surface-600 font-mono tracking-wider">
              Ref: {ref}
            </p>
          )}
        </div>

        {/* Perks */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 text-left"
        >
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            What&apos;s unlocked
          </p>
          <ul className="space-y-2.5">
            {perks.map((perk) => (
              <li key={perk} className="flex items-center gap-3 text-sm font-medium text-white/80">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                {perk}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-3"
        >
          <Link
            href="/dashboard"
            className="w-full flex items-center justify-center gap-2 h-12 bg-accent hover:bg-accent/90 text-background font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)]"
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard/subscription"
            className="w-full flex items-center justify-center h-10 text-[10px] font-bold text-surface-400 uppercase tracking-widest hover:text-white transition-colors"
          >
            View Subscription Details
          </Link>
        </motion.div>

        {/* Countdown */}
        <p className="text-[10px] text-surface-600 font-medium">
          Redirecting to subscription page in{" "}
          <span className="text-surface-400 font-bold">{countdown}s</span>…
        </p>
      </motion.div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
      </div>
    }>
      <PaymentSuccessInner />
    </Suspense>
  );
}
