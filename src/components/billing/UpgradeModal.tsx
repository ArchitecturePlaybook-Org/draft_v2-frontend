"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { X, Zap, ArrowRight, Lock } from "lucide-react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: "project" | "member" | "storage" | "ai" | "feature";
  featureName?: string;
  currentPlan?: string;
}

const LIMIT_COPY: Record<string, { title: string; body: string; icon: string }> = {
  project: {
    icon: "🗂️",
    title: "Project Limit Reached",
    body: "You've hit the maximum number of active projects on your current plan. Upgrade to create unlimited projects.",
  },
  member: {
    icon: "👥",
    title: "Team Seat Limit Reached",
    body: "Your plan doesn't allow more team members. Upgrade to add unlimited collaborators.",
  },
  storage: {
    icon: "💾",
    title: "Storage Limit Reached",
    body: "You've used all available storage on your plan. Upgrade to get more Data Hub space.",
  },
  ai: {
    icon: "🤖",
    title: "AI Estimation Limit Reached",
    body: "You've used all your AI Estimation runs this month. Upgrade to Enterprise for unlimited runs.",
  },
  feature: {
    icon: "⚡",
    title: "Feature Not Available",
    body: "This feature is not included in your current plan. Upgrade to unlock full access.",
  },
};

const UPGRADE_HIGHLIGHTS = [
  "Unlimited projects & storage",
  "Full Matrix Engine access",
  "AI Estimation runs",
  "Advanced analytics",
  "Priority support",
];

export function UpgradeModal({ isOpen, onClose, limitType, featureName, currentPlan }: UpgradeModalProps) {
  const copy = LIMIT_COPY[limitType] ?? LIMIT_COPY.feature;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-md bg-surface-900 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Gradient decoration */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-transparent to-primary/10 pointer-events-none" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-accent/30 blur-3xl rounded-full pointer-events-none" />

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>

              <div className="relative z-10 p-8 space-y-6">
                {/* Header */}
                <div className="text-center space-y-3">
                  <div className="text-5xl">{copy.icon}</div>
                  <h2 className="text-2xl font-black text-white tracking-tighter">{copy.title}</h2>
                  <p className="text-white/60 text-sm font-medium leading-relaxed">
                    {featureName ? `"${featureName}" requires a higher plan. ` : ""}
                    {copy.body}
                  </p>
                  {currentPlan && (
                    <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                      <Lock className="w-3 h-3 text-surface-400" />
                      <span className="text-[10px] font-black text-surface-400 uppercase tracking-widest">
                        Current: {currentPlan}
                      </span>
                    </div>
                  )}
                </div>

                {/* Feature highlights */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                  <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em] flex items-center gap-2">
                    <Zap className="w-3 h-3" />
                    What you'll unlock
                  </p>
                  <ul className="space-y-2">
                    {UPGRADE_HIGHLIGHTS.map((item) => (
                      <li key={item} className="flex items-center gap-3 text-sm font-medium text-white/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA buttons */}
                <div className="space-y-3">
                  <Link
                    href="/dashboard/subscription"
                    onClick={onClose}
                    className="w-full flex items-center justify-center gap-2 h-12 bg-accent hover:bg-accent/90 text-background font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl transition-all shadow-[0_0_20px_rgba(var(--color-accent),0.4)] hover:shadow-[0_0_30px_rgba(var(--color-accent),0.6)]"
                  >
                    <Zap className="w-4 h-4" />
                    Upgrade Plan
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={onClose}
                    className="w-full h-10 text-[10px] font-bold text-surface-400 uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
