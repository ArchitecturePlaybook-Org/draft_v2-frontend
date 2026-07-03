"use client";

import { useEffect, useState } from "react";
import { billingApi, Subscription } from "@/domains/billing/api";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Clock, Zap, X } from "lucide-react";

/**
 * TrialBanner
 * -----------
 * Renders an urgency-aware sticky banner at the top of the dashboard:
 *
 * - 8–14 days left  → Subtle blue info
 * - 4–7 days left   → Amber warning
 * - 1–3 days left   → Red urgent (pulsing)
 * - Expired (past_due / canceled) → Blocking red bar
 */
export function TrialBanner() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    billingApi
      .getCurrentSubscription()
      .then((data) => {
        if (data && data.length > 0) setSubscription(data[0]);
      })
      .catch((err) => console.error("TrialBanner: failed to load subscription", err));
  }, []);

  if (!subscription || dismissed) return null;

  // ── Expired / Past Due ───────────────────────────────────────────────────
  if (subscription.status === "past_due" || subscription.status === "canceled") {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-red-500/10 border-b border-red-500/30 px-4 py-3 text-red-400 flex items-center justify-between gap-4 z-50 sticky top-0"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <AlertCircle className="w-4 h-4 flex-shrink-0 animate-pulse" />
            <span className="text-xs font-bold leading-tight">
              Your{" "}
              {subscription.status === "canceled" ? "subscription has been cancelled" : "trial has expired"}.
              Your account is in <strong>read-only mode</strong>. Upgrade to restore full access.
            </span>
          </div>
          <Link
            href="/dashboard/subscription"
            className="flex-shrink-0 flex items-center gap-1.5 text-[10px] bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-[0.15em] py-2 px-4 rounded-xl transition-colors shadow-[0_0_12px_rgba(239,68,68,0.4)]"
          >
            <Zap className="w-3 h-3" />
            Upgrade Now
          </Link>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── Trialing ─────────────────────────────────────────────────────────────
  if (subscription.status === "trialing") {
    let daysLeft = 0;
    if (subscription.current_period_end) {
      const diff = new Date(subscription.current_period_end).getTime() - Date.now();
      daysLeft = Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
    }

    // Urgency tier
    const isUrgent = daysLeft <= 3;
    const isWarning = daysLeft > 3 && daysLeft <= 7;
    const isInfo = daysLeft > 7;

    const colorClass = isUrgent
      ? "bg-red-500/10 border-red-500/30 text-red-400"
      : isWarning
      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
      : "bg-blue-500/10 border-blue-500/30 text-blue-400";

    const buttonClass = isUrgent
      ? "bg-red-500 hover:bg-red-600 shadow-[0_0_12px_rgba(239,68,68,0.4)]"
      : isWarning
      ? "bg-amber-500 hover:bg-amber-600 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
      : "bg-blue-500 hover:bg-blue-600";

    const message =
      daysLeft === 0
        ? "Your trial expires today!"
        : isUrgent
        ? `Only ${daysLeft} day${daysLeft !== 1 ? "s" : ""} left in your trial — upgrade now to avoid disruption.`
        : isWarning
        ? `${daysLeft} days remaining in your free trial. Upgrade before it ends.`
        : `You have ${daysLeft} days remaining in your Professional trial.`;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className={`border-b px-4 py-3 flex items-center justify-between gap-4 z-50 sticky top-0 ${colorClass}`}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {isUrgent ? (
              <AlertCircle className="w-4 h-4 flex-shrink-0 animate-pulse" />
            ) : (
              <Clock className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="text-xs font-bold leading-tight">{message}</span>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              href="/dashboard/subscription"
              className={`flex items-center gap-1.5 text-[10px] text-white font-black uppercase tracking-[0.15em] py-2 px-4 rounded-xl transition-colors ${buttonClass}`}
            >
              <Zap className="w-3 h-3" />
              Upgrade
            </Link>
            {/* Only allow dismissing non-urgent banners */}
            {!isUrgent && (
              <button
                onClick={() => setDismissed(true)}
                aria-label="Dismiss trial banner"
                className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors opacity-60 hover:opacity-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return null;
}
