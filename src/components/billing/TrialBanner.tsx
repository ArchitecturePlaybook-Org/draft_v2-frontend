"use client";

import { useEffect, useState } from "react";
import { billingApi, Subscription } from "@/domains/billing/api";
import Link from "next/link";
import { AlertCircle, Clock } from "lucide-react";

export function TrialBanner() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    billingApi.getCurrentSubscription()
      .then((data) => {
        if (data && data.length > 0) {
          setSubscription(data[0]);
        }
      })
      .catch((err) => console.error("Failed to load subscription status", err));
  }, []);

  if (!subscription) return null;

  if (subscription.status === "trialing") {
    let daysLeft = 0;
    if (subscription.current_period_end) {
      const end = new Date(subscription.current_period_end);
      const diff = end.getTime() - new Date().getTime();
      daysLeft = Math.ceil(diff / (1000 * 3600 * 24));
    }

    return (
      <div className="bg-orange-500/10 border-b border-orange-500/20 px-4 py-3 text-orange-400 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5" />
          <span className="text-sm font-medium">
            You have {Math.max(0, daysLeft)} days remaining in your free trial.
          </span>
        </div>
        <Link 
          href="/dashboard/subscription" 
          className="text-xs bg-orange-500 hover:bg-orange-600 text-white font-bold py-1.5 px-4 rounded-md transition-colors"
        >
          Upgrade Now
        </Link>
      </div>
    );
  }

  if (subscription.status === "past_due") {
    return (
      <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-3 text-red-400 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-medium">
            Your trial has expired. You are currently in read-only mode. Please upgrade your plan to create or edit projects.
          </span>
        </div>
        <Link 
          href="/dashboard/subscription" 
          className="text-xs bg-red-500 hover:bg-red-600 text-white font-bold py-1.5 px-4 rounded-md transition-colors"
        >
          Upgrade Plan
        </Link>
      </div>
    );
  }

  return null;
}
