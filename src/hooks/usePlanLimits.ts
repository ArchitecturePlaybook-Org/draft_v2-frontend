"use client";

import { useState, useEffect } from "react";
import { billingApi, PlanUsage, Subscription } from "@/domains/billing/api";

export interface PlanLimits {
  isLoading: boolean;
  subscription: Subscription | null;
  usage: PlanUsage | null;

  // Derived convenience flags
  isOnStarter: boolean;
  isOnProfessional: boolean;
  isOnEnterprise: boolean;
  isTrialing: boolean;
  isExpired: boolean;

  // Feature access flags
  canUseAI: boolean;
  canUseMatrix: boolean;
  canUseMarketplace: boolean;
  canUseFieldModules: boolean;
  canUseAnalytics: boolean;
  canUseApiAccess: boolean;

  // Limit checks (true = within limit, false = at/over limit)
  canCreateProject: boolean;
  canInviteMember: boolean;

  // Usage percentages (0–100)
  projectUsagePct: number;
  storageUsagePct: number;
  memberUsagePct: number;
  aiUsagePct: number;

  // Days left in trial
  trialDaysLeft: number | null;
}

const DEFAULT_LIMITS: PlanLimits = {
  isLoading: true,
  subscription: null,
  usage: null,
  isOnStarter: false,
  isOnProfessional: false,
  isOnEnterprise: false,
  isTrialing: false,
  isExpired: false,
  canUseAI: false,
  canUseMatrix: false,
  canUseMarketplace: false,
  canUseFieldModules: false,
  canUseAnalytics: false,
  canUseApiAccess: false,
  canCreateProject: true,
  canInviteMember: true,
  projectUsagePct: 0,
  storageUsagePct: 0,
  memberUsagePct: 0,
  aiUsagePct: 0,
  trialDaysLeft: null,
};

function calcPct(used: number, limit: number): number {
  if (limit === -1) return 0; // Unlimited
  if (limit === 0) return 100; // Disabled
  return Math.min(100, Math.round((used / limit) * 100));
}

function isWithinLimit(used: number, limit: number): boolean {
  if (limit === -1) return true; // Unlimited
  return used < limit;
}

/**
 * usePlanLimits
 * 
 * Fetches the current subscription and usage data and returns
 * derived feature flags and limit checks for use throughout the UI.
 * 
 * @example
 * const { canCreateProject, isOnStarter } = usePlanLimits();
 * if (!canCreateProject) showUpgradeModal();
 */
export function usePlanLimits(): PlanLimits {
  const [limits, setLimits] = useState<PlanLimits>(DEFAULT_LIMITS);

  useEffect(() => {
    async function fetchData() {
      try {
        const [subscriptions, usage] = await Promise.all([
          billingApi.getCurrentSubscription(),
          billingApi.getUsage(),
        ]);

        const sub = subscriptions[0] ?? null;
        const plan = sub?.plan ?? null;
        const features = plan?.features ?? {};
        const u = usage?.usage;

        let trialDaysLeft: number | null = null;
        if (sub?.status === "trialing" && sub.current_period_end) {
          const diff = new Date(sub.current_period_end).getTime() - Date.now();
          trialDaysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        }

        setLimits({
          isLoading: false,
          subscription: sub,
          usage,

          isOnStarter: plan?.code === "starter",
          isOnProfessional: plan?.code === "professional",
          isOnEnterprise: plan?.code === "enterprise",
          isTrialing: sub?.status === "trialing",
          isExpired: sub?.status === "past_due" || sub?.status === "canceled",

          canUseAI: features.has_ai_estimation === true,
          canUseMatrix: features.has_matrix_engine === true,
          canUseMarketplace: features.has_marketplace === true,
          canUseFieldModules: features.has_field_modules === true,
          canUseAnalytics: features.has_analytics === true,
          canUseApiAccess: features.has_api_access === true,

          canCreateProject: u
            ? isWithinLimit(u.projects.used, u.projects.limit)
            : true,
          canInviteMember: u
            ? isWithinLimit(u.team_members.used, u.team_members.limit)
            : true,

          projectUsagePct: u ? calcPct(u.projects.used, u.projects.limit) : 0,
          storageUsagePct: u ? calcPct(u.storage_gb.used, u.storage_gb.limit) : 0,
          memberUsagePct: u ? calcPct(u.team_members.used, u.team_members.limit) : 0,
          aiUsagePct: u
            ? calcPct(u.ai_runs_this_month.used, u.ai_runs_this_month.limit)
            : 0,

          trialDaysLeft,
        });
      } catch (err) {
        console.error("Failed to fetch plan limits", err);
        setLimits((prev) => ({ ...prev, isLoading: false }));
      }
    }

    fetchData();
  }, []);

  return limits;
}
