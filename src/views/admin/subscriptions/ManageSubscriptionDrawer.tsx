"use client";

import React, { useState, useEffect } from "react";
import { X, Check, CreditCard, Calendar, ShieldCheck, AlertCircle, Building2, User, RefreshCw, Hash } from "lucide-react";
import { toast } from "sonner";
import { AdminSubscriptionListItem, adminBillingApi } from "@/domains/admin/billing-api";
import { COMPACT_UI } from "@/theme/ui-tokens";

interface ManageSubscriptionDrawerProps {
  subscription: AdminSubscriptionListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ManageSubscriptionDrawer({
  subscription,
  isOpen,
  onClose,
  onSuccess,
}: ManageSubscriptionDrawerProps) {
  const [planCode, setPlanCode] = useState<string>("starter");
  const [status, setStatus] = useState<string>("active");
  const [provider, setProvider] = useState<string>("razorpay");
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string>("");
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (subscription) {
      setPlanCode(subscription.plan?.code || "starter");
      setStatus(subscription.status || "active");
      setProvider(subscription.provider || "razorpay");
      setCancelAtPeriodEnd(subscription.cancel_at_period_end || false);
      if (subscription.current_period_end) {
        const dateStr = subscription.current_period_end.split("T")[0];
        setCurrentPeriodEnd(dateStr);
      } else {
        setCurrentPeriodEnd("");
      }
    }
  }, [subscription]);

  if (!isOpen || !subscription) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let isoDateStr: string | undefined = undefined;
      if (currentPeriodEnd) {
        isoDateStr = new Date(currentPeriodEnd).toISOString();
      }

      await adminBillingApi.updateSubscription(subscription.id, {
        plan_code: planCode,
        status: status,
        provider: provider,
        cancel_at_period_end: cancelAtPeriodEnd,
        ...(isoDateStr ? { current_period_end: isoDateStr } : {}),
      });

      toast.success("Subscription updated successfully!");
      onSuccess();
      onClose();
    } catch (e) {
      console.error("Failed to update subscription", e);
      toast.error("Failed to update subscription.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-fade-in">
      <div className="w-full max-w-md bg-surface-50 dark:bg-surface-900 h-full shadow-2xl flex flex-col border-l border-surface-200/80 dark:border-surface-800">
        
        {/* Header */}
        <div className="p-4 border-b border-surface-200/80 dark:border-surface-800 flex items-center justify-between bg-surface-100/40 dark:bg-surface-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-primary uppercase tracking-wider">Manage Subscription</h2>
              <p className="text-[10px] text-surface-400 font-semibold">{subscription.account_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-400 hover:text-primary hover:bg-surface-200/60 dark:hover:bg-surface-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-semibold">
          
          {/* Summary Card */}
          <div className="p-3 rounded-xl bg-surface-100/60 dark:bg-surface-950/60 border border-surface-200/80 dark:border-surface-800 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-surface-400">
                <Building2 className="w-3.5 h-3.5" />
                <span>Firm ID:</span>
              </div>
              <span className="font-bold text-primary font-mono">{subscription.account_uid}</span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-surface-400">
                <User className="w-3.5 h-3.5" />
                <span>Owner:</span>
              </div>
              <span className="font-bold text-primary">{subscription.owner_email || "N/A"}</span>
            </div>

            {/* Transaction / Subscription Gateway ID */}
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-surface-400">
                <Hash className="w-3.5 h-3.5 text-accent" />
                <span>Transaction / Sub ID:</span>
              </div>
              <span className="font-bold text-accent font-mono text-[10px] bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20">
                {subscription.transaction_id || subscription.provider_subscription_id || "N/A"}
              </span>
            </div>

            {/* Customer ID */}
            {subscription.provider_customer_id && (
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-surface-400">
                  <Hash className="w-3.5 h-3.5 text-surface-400" />
                  <span>Customer ID:</span>
                </div>
                <span className="font-bold text-surface-400 font-mono text-[10px]">
                  {subscription.provider_customer_id}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-surface-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Total Lifetime Revenue:</span>
              </div>
              <span className="font-bold text-emerald-500">₹{subscription.total_paid?.toLocaleString() || "0"}</span>
            </div>
          </div>

          {/* Plan Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-surface-400 block">
              Assigned Subscription Plan
            </label>
            <select
              value={planCode}
              onChange={(e) => setPlanCode(e.target.value)}
              className={COMPACT_UI.select + " w-full"}
            >
              <option value="free">Free / Basic Trial</option>
              <option value="starter">Starter Plan</option>
              <option value="professional">Professional Plan</option>
              <option value="enterprise">Enterprise Plan</option>
            </select>
          </div>

          {/* Status Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-surface-400 block">
              Subscription Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={COMPACT_UI.select + " w-full"}
            >
              <option value="active">Active</option>
              <option value="trialing">Trialing</option>
              <option value="past_due">Past Due (Payment Overdue)</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>

          {/* Provider Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-surface-400 block">
              Payment Gateway Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className={COMPACT_UI.select + " w-full"}
            >
              <option value="razorpay">Razorpay</option>
              <option value="stripe">Stripe</option>
              <option value="manual">Manual (Bank Transfer / Cash)</option>
            </select>
          </div>

          {/* Validity Expiry Date */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-surface-400 block">
              Current Period End Date (Validity Expiry)
            </label>
            <input
              type="date"
              value={currentPeriodEnd}
              onChange={(e) => setCurrentPeriodEnd(e.target.value)}
              className={COMPACT_UI.input + " w-full"}
            />
          </div>

          {/* Cancel at Period End Toggle */}
          <div className="p-3 rounded-xl bg-surface-100/40 dark:bg-surface-950/40 border border-surface-200/80 dark:border-surface-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-primary block">Auto-Renew Status</span>
              <span className="text-[10px] text-surface-400 block">Cancel subscription at current period end</span>
            </div>
            <input
              type="checkbox"
              checked={cancelAtPeriodEnd}
              onChange={(e) => setCancelAtPeriodEnd(e.target.checked)}
              className="w-4 h-4 text-accent rounded border-surface-300 focus:ring-accent cursor-pointer"
            />
          </div>

          {/* Info note */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Manually modifying the subscription plan or end date will immediately update quota limits and feature access for all members of this workspace.
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-200/80 dark:border-surface-800 bg-surface-100/40 dark:bg-surface-950/40 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 hover:bg-surface-200/50 text-surface-400 text-[11px] font-bold transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 rounded-lg bg-accent text-background text-[11px] font-black uppercase tracking-wider hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
