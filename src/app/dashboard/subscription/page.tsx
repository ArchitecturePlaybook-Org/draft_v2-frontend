"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { billingApi, Subscription, Plan, PlanUsage } from "@/domains/billing/api";
import { orgsApi } from "@/domains/orgs/api";
import { PaymentHistory } from "@/components/billing/PaymentHistory";
import { formatCurrency } from "@/lib/utils/currency";
import { motion, Variants } from "framer-motion";
import {
  Check, X, Zap, Building2, User, ArrowRight, AlertCircle,
  Clock, Crown, RefreshCw, ChevronDown
} from "lucide-react";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

// --- Usage Meter ---
function UsageMeter({
  label,
  used,
  limit,
  unit = "",
}: {
  label: string;
  used: number;
  limit: number;
  unit?: string;
}) {
  const isUnlimited = limit === -1;
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const isNearLimit = pct >= 80;
  const isAtLimit = pct >= 100;

  return (
    <li className="space-y-2">
      <div className="flex justify-between items-center text-[10px]">
        <span className="font-bold text-surface-400 uppercase tracking-widest">{label}</span>
        <span className={`font-black tracking-wider ${isAtLimit ? "text-red-400" : isNearLimit ? "text-amber-400" : "text-primary"}`}>
          {unit ? `${used}${unit}` : used} / {isUnlimited ? "∞" : `${limit}${unit}`}
        </span>
      </div>
      <div className="w-full bg-black/10 dark:bg-white/5 h-2 rounded-full overflow-hidden border border-white/10">
        {!isUnlimited && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full relative ${isAtLimit ? "bg-red-500" : isNearLimit ? "bg-amber-400" : "bg-primary"}`}
          >
            <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] -skew-x-12" />
          </motion.div>
        )}
        {isUnlimited && (
          <div className="h-full bg-gradient-to-r from-accent/40 to-accent/20 rounded-full" />
        )}
      </div>
    </li>
  );
}

// --- Plan Feature Row ---
function FeatureRow({ label, starter, professional, enterprise }: {
  label: string;
  starter: string | boolean;
  professional: string | boolean;
  enterprise: string | boolean;
}) {
  const renderVal = (val: string | boolean) => {
    if (val === true) return <Check className="w-4 h-4 text-emerald-400 mx-auto" />;
    if (val === false) return <X className="w-4 h-4 text-surface-600 mx-auto" />;
    return <span className="text-[11px] font-bold text-primary">{val}</span>;
  };
  return (
    <tr className="border-b border-white/5 hover:bg-white/2 transition-colors">
      <td className="py-3 px-4 text-[11px] font-bold text-surface-400">{label}</td>
      <td className="py-3 px-4 text-center">{renderVal(starter)}</td>
      <td className="py-3 px-4 text-center bg-accent/5">{renderVal(professional)}</td>
      <td className="py-3 px-4 text-center">{renderVal(enterprise)}</td>
    </tr>
  );
}

export default function SubscriptionPage() {
  const router = useRouter();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [defaultAccountId, setDefaultAccountId] = useState<number | null>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [subscriptions, allPlans, usageData, orgsData] = await Promise.all([
          billingApi.getCurrentSubscription(),
          billingApi.getPlans(),
          billingApi.getUsage(),
          orgsApi.listOrgs(),
        ]);
        if (subscriptions.length > 0) setSub(subscriptions[0]);
        setPlans(allPlans);
        setUsage(usageData);
        
        const orgList = Array.isArray(orgsData) ? orgsData : (orgsData as any).results || [];
        if (orgList.length > 0) setDefaultAccountId(orgList[0].id);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleUpgrade = async (plan: Plan) => {
    const accountId = sub?.account ?? defaultAccountId;
    if (!accountId) {
      showToast("error", "Could not determine your account. Please refresh.");
      return;
    }
    setIsUpgrading(plan.code);
    try {
      const { checkout_url } = await billingApi.createCheckoutSession(
        accountId,
        plan.code,
        billingCycle
      );
      window.location.href = checkout_url;
    } catch (err: any) {
      showToast("error", err?.message || "Failed to start checkout. Please try again.");
    } finally {
      setIsUpgrading(null);
    }
  };

  const handleCancel = async () => {
    const accountId = sub?.account ?? defaultAccountId;
    if (!accountId) return;
    setIsCancelling(true);
    try {
      await billingApi.cancelSubscription(accountId);
      setSub((prev) => prev ? { ...prev, cancel_at_period_end: true } : prev);
      setShowCancelConfirm(false);
      showToast("success", "Your subscription will cancel at the end of the billing period.");
    } catch (err: any) {
      showToast("error", err?.message || "Failed to cancel subscription.");
    } finally {
      setIsCancelling(false);
    }
  };

  const currentPlanCode = sub?.plan?.code ?? "starter";

  const trialDaysLeft =
    sub?.status === "trialing" && sub.current_period_end
      ? Math.max(0, Math.ceil((new Date(sub.current_period_end).getTime() - Date.now()) / (1000 * 3600 * 24)))
      : null;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-10 max-w-5xl mx-auto py-8 relative"
    >
      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl border ${
            toast.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          {toast.message}
        </motion.div>
      )}

      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-primary mb-3 tracking-tighter">Subscription</h1>
          <p className="text-surface-400 font-bold uppercase tracking-widest text-[10px] max-w-2xl leading-relaxed">
            Manage your billing, active plans, and institutional access capabilities.
          </p>
        </div>
      </motion.div>

      {/* Current Plan Banner */}
      <motion.section
        variants={itemVariants}
        className="bg-surface-50/40 backdrop-blur-2xl p-8 border border-white/20 dark:border-white/5 rounded-[2rem] relative overflow-hidden shadow-2xl shadow-primary/5 group"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-full arch-grid opacity-[0.05] pointer-events-none mix-blend-overlay" />

        {/* Trial banner */}
        {sub?.status === "trialing" && trialDaysLeft !== null && (
          <div className={`mb-6 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold ${
            trialDaysLeft <= 3
              ? "bg-red-500/10 border-red-500/20 text-red-400"
              : trialDaysLeft <= 7
              ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
              : "bg-blue-500/10 border-blue-500/20 text-blue-400"
          }`}>
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>
              {trialDaysLeft === 0
                ? "Your trial expires today."
                : `${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""} remaining in your free trial.`}
            </span>
          </div>
        )}

        {sub?.status === "past_due" && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl border bg-red-500/10 border-red-500/20 text-red-400 text-sm font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Your trial has expired. Your account is in read-only mode. Upgrade to restore full access.</span>
          </div>
        )}

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${sub?.status === "active" ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-amber-500"}`} />
              Active Subscription
            </h3>
            <div className="flex items-center gap-4 flex-wrap">
              <h2 className="text-3xl font-black text-primary tracking-tighter">{sub?.plan?.name ?? "Starter"}</h2>
              <span className={`text-[10px] font-bold px-3 py-1 uppercase tracking-[0.2em] rounded-full border ${
                sub?.status === "active"
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : sub?.status === "trialing"
                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/20"
              }`}>
                {sub?.status ?? "free"}
              </span>
              {sub?.cancel_at_period_end && (
                <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Cancels {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : "soon"}
                </span>
              )}
            </div>
            <p className="text-surface-400 text-[10px] font-bold uppercase tracking-widest">
              Next billing cycle:{" "}
              <span className="text-primary">
                {sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : "N/A"}
              </span>
            </p>
          </div>
          <div className="text-right flex flex-col md:items-end gap-3">
            <p className="text-5xl font-black text-primary tracking-tighter flex items-end">
              {sub?.plan
                ? formatCurrency(sub.plan.monthly_price, sub.plan.currency)
                : "₹0.00"}
              <span className="text-xl text-surface-400 font-bold tracking-normal mb-1 ml-1">/mo</span>
            </p>
            {sub?.status === "active" && !sub.cancel_at_period_end && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="text-[10px] font-bold text-surface-500 uppercase tracking-widest hover:text-red-400 transition-colors"
              >
                Cancel Subscription
              </button>
            )}
          </div>
        </div>

        {/* Cancel confirm */}
        {showCancelConfirm && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-3">
            <p className="text-red-400 text-sm font-bold">
              Are you sure? Your subscription will remain active until{" "}
              {sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : "end of period"}.
              After that, your account will downgrade to Starter.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors disabled:opacity-50"
              >
                {isCancelling ? "Cancelling..." : "Yes, Cancel"}
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-primary text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors"
              >
                Keep Plan
              </button>
            </div>
          </div>
        )}
      </motion.section>

      {/* Live Usage Meters */}
      {usage && (
        <motion.section variants={itemVariants} className="bg-surface-50/40 backdrop-blur-xl p-8 border border-white/20 dark:border-white/5 rounded-[2rem] space-y-6 shadow-xl shadow-primary/5">
          <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
            Current Usage
          </h3>
          <ul className="space-y-5">
            <UsageMeter
              label="Active Projects"
              used={usage.usage.projects.used}
              limit={usage.usage.projects.limit}
            />
            <UsageMeter
              label="Storage Used"
              used={Math.round(usage.usage.storage_gb.used * 10) / 10}
              limit={usage.usage.storage_gb.limit}
              unit=" GB"
            />
            <UsageMeter
              label="Team Members"
              used={usage.usage.team_members.used}
              limit={usage.usage.team_members.limit}
            />
            {usage.usage.ai_runs_this_month.limit !== 0 && (
              <UsageMeter
                label="AI Estimation Runs (this month)"
                used={usage.usage.ai_runs_this_month.used}
                limit={usage.usage.ai_runs_this_month.limit}
              />
            )}
          </ul>
        </motion.section>
      )}

      {/* Plan Comparison */}
      <motion.section variants={itemVariants} className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
            {currentPlanCode !== "enterprise" ? "Upgrade Your Plan" : "Your Plan"}
          </h3>
          {/* Billing cycle toggle */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full p-1">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                billingCycle === "monthly" ? "bg-primary text-background" : "text-surface-400 hover:text-primary"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                billingCycle === "yearly" ? "bg-primary text-background" : "text-surface-400 hover:text-primary"
              }`}
            >
              Yearly
              <span className="ml-1.5 text-emerald-400">-17%</span>
            </button>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {isLoading
            ? [1, 2, 3].map((i) => (
                <div key={i} className="h-72 bg-white/5 border border-white/10 rounded-[2rem] animate-pulse" />
              ))
            : plans.map((plan) => {
                const isCurrent = plan.code === currentPlanCode;
                const isEnterprise = plan.code === "enterprise";
                const isPro = plan.code === "professional";
                const price = billingCycle === "yearly" ? plan.yearly_price : plan.monthly_price;

                return (
                  <motion.div
                    key={plan.code}
                    whileHover={!isCurrent ? { y: -6, scale: 1.01 } : {}}
                    className={`relative p-7 rounded-[2rem] flex flex-col gap-5 transition-all duration-300 ${
                      isPro
                        ? "bg-surface-900 border-2 border-accent/40 shadow-2xl shadow-accent/10"
                        : "bg-surface-50/40 backdrop-blur-xl border border-white/20 dark:border-white/5"
                    }`}
                  >
                    {isPro && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-accent text-background text-[9px] font-black uppercase tracking-[0.3em] px-4 py-1 rounded-full shadow-lg">
                          Recommended
                        </span>
                      </div>
                    )}
                    {isCurrent && (
                      <div className="absolute -top-3 right-6">
                        <span className="bg-emerald-500 text-white text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full shadow-lg">
                          Current Plan
                        </span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {plan.code === "starter" && <User className="w-4 h-4 text-surface-400" />}
                        {plan.code === "professional" && <Zap className="w-4 h-4 text-accent" />}
                        {plan.code === "enterprise" && <Crown className="w-4 h-4 text-amber-400" />}
                        <h4 className="text-sm font-black text-primary uppercase tracking-[0.2em]">{plan.name}</h4>
                      </div>
                      <p className="text-[10px] text-surface-400 font-medium leading-relaxed">{plan.description}</p>
                    </div>

                    <div>
                      <p className="text-3xl font-black text-primary tracking-tighter">
                        {parseFloat(price) === 0 ? "Free" : formatCurrency(price, plan.currency)}
                      </p>
                      {parseFloat(price) > 0 && (
                        <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">
                          /{billingCycle === "yearly" ? "year" : "month"}
                        </p>
                      )}
                    </div>

                    <ul className="space-y-2 flex-1 text-[11px]">
                      {[
                        `${plan.max_projects === -1 ? "Unlimited" : plan.max_projects} projects`,
                        `${plan.max_storage_gb === -1 ? "Unlimited" : plan.max_storage_gb + " GB"} storage`,
                        `${plan.max_team_members === -1 ? "Unlimited" : plan.max_team_members} team members`,
                        plan.features.has_ai_estimation
                          ? `AI Estimation${plan.max_ai_runs_per_month === -1 ? " (unlimited)" : ` (${plan.max_ai_runs_per_month}/mo)`}`
                          : null,
                        plan.features.has_matrix_engine ? "Matrix Engine" : null,
                        plan.features.has_field_modules ? "Field Diary & HSE" : null,
                        plan.features.has_analytics ? "Analytics Dashboard" : null,
                        plan.features.has_api_access ? "Full API Access" : null,
                        plan.features.has_sso ? "SSO & Auto-Join" : null,
                      ]
                        .filter(Boolean)
                        .map((feat) => (
                          <li key={feat} className="flex items-center gap-2 text-surface-400 font-medium">
                            <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            {feat}
                          </li>
                        ))}
                    </ul>

                    {isCurrent ? (
                      <div className="h-11 flex items-center justify-center text-[10px] font-black text-surface-500 uppercase tracking-widest border border-white/10 rounded-2xl">
                        Current Plan
                      </div>
                    ) : isEnterprise ? (
                      <a
                        href="mailto:sales@architectureplaybook.com?subject=Enterprise Plan Enquiry"
                        className="h-11 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-2xl hover:bg-amber-500/20 transition-colors"
                      >
                        Contact Sales
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <div className="space-y-2">
                        <button
                          onClick={() => handleUpgrade(plan)}
                          disabled={isUpgrading === plan.code}
                          className={`w-full h-11 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all disabled:opacity-60 ${
                            isPro
                              ? "bg-accent hover:bg-accent/90 text-background shadow-[0_0_15px_rgba(var(--color-accent),0.3)]"
                              : "bg-white/10 hover:bg-white/20 text-primary border border-white/10"
                          }`}
                        >
                          {isUpgrading === plan.code ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5" />
                              {parseFloat(price) === 0 ? `Upgrade to ${plan.name}` : 'Pay with Card / Wallet'}
                            </>
                          )}
                        </button>
                        
                        {parseFloat(price) > 0 && (
                          <button
                            onClick={() => {
                              router.push(`/billing/upi?plan=${plan.code}&billing_cycle=${billingCycle}`);
                            }}
                            className="w-full h-11 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest bg-[#5f259f] hover:bg-[#4b1d7d] text-white border border-[#5f259f]/50 rounded-2xl transition-all shadow-lg shadow-[#5f259f]/20"
                          >
                            <span className="text-sm leading-none">⚡</span> Pay with UPI
                          </button>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
        </div>

        {/* Feature comparison table */}
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer text-[10px] font-black text-surface-400 uppercase tracking-widest hover:text-primary transition-colors w-fit list-none">
            <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
            Compare All Features
          </summary>
          <div className="mt-4 bg-surface-50/30 backdrop-blur-xl border border-white/10 rounded-[1.5rem] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-surface-900/30">
                  <th className="py-4 px-4 text-left text-[10px] font-black text-surface-400 uppercase tracking-widest w-1/2">Feature</th>
                  <th className="py-4 px-4 text-center text-[10px] font-black text-surface-400 uppercase tracking-widest">Starter</th>
                  <th className="py-4 px-4 text-center text-[10px] font-black text-accent uppercase tracking-widest bg-accent/5">Professional</th>
                  <th className="py-4 px-4 text-center text-[10px] font-black text-amber-400 uppercase tracking-widest">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                <FeatureRow label="Active Projects" starter="3" professional="15" enterprise="Unlimited" />
                <FeatureRow label="Storage" starter="2 GB" professional="25 GB" enterprise="500 GB" />
                <FeatureRow label="Team Members" starter="2" professional="10" enterprise="Unlimited" />
                <FeatureRow label="Matrix Engine" starter={false} professional={true} enterprise={true} />
                <FeatureRow label="AI Estimation" starter={false} professional="50/mo" enterprise="Unlimited" />
                <FeatureRow label="Marketplace Listings" starter={false} professional="5 listings" enterprise="Unlimited" />
                <FeatureRow label="Field Diary & HSE" starter={false} professional={true} enterprise={true} />
                <FeatureRow label="Analytics Dashboard" starter={false} professional="Basic" enterprise="Advanced" />
                <FeatureRow label="Template Publishing" starter={false} professional="Org scope" enterprise="Global scope" />
                <FeatureRow label="API Access" starter={false} professional={false} enterprise={true} />
                <FeatureRow label="SSO / Auto-join Domain" starter={false} professional={false} enterprise={true} />
                <FeatureRow label="IP Restrictions" starter={false} professional={false} enterprise={true} />
                <FeatureRow label="Priority Support" starter={false} professional={false} enterprise="Dedicated CSM" />
              </tbody>
            </table>
          </div>
        </details>
      </motion.section>

      {/* Payment History */}
      <motion.section variants={itemVariants} className="bg-surface-50/40 backdrop-blur-xl p-8 border border-white/20 dark:border-white/5 rounded-[2rem] space-y-8 shadow-xl shadow-primary/5">
        <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
          Payment History
        </h3>
        <PaymentHistory />
      </motion.section>
    </motion.div>
  );
}
