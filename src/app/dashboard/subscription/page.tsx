"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { billingApi, Subscription } from "@/domains/billing/api";
import { PaymentHistory } from "@/components/billing/PaymentHistory";
import { formatCurrency } from "@/lib/utils/currency";
import { motion, Variants } from "framer-motion";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function SubscriptionPage() {
  const [sub, setSub] = useState<Subscription | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await billingApi.getCurrentSubscription();
        const paginatedData = data as { results?: Subscription[] } | Subscription[];
        const items = Array.isArray(paginatedData) ? paginatedData : paginatedData?.results || [];
        if (items.length > 0) {
          setSub(items[0]);
        }
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);
  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-10 max-w-5xl mx-auto py-8"
    >
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-primary mb-3 tracking-tighter">Subscription</h1>
          <p className="text-surface-400 font-bold uppercase tracking-widest text-[10px] max-w-2xl leading-relaxed">
            Manage your billing, active plans, and institutional access capabilities.
          </p>
        </div>
      </motion.div>

      {/* Current Plan Details */}
      <motion.section variants={itemVariants} className="bg-surface-50/40 backdrop-blur-2xl p-10 border border-white/20 dark:border-white/5 rounded-[2rem] relative overflow-hidden shadow-2xl shadow-primary/5 group">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-full arch-grid opacity-[0.05] pointer-events-none mix-blend-overlay" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(var(--color-accent),0.8)]" />
                Active Subscription
            </h3>
            <div className="flex items-center gap-4">
              <h2 className="text-3xl font-black text-primary tracking-tighter">{sub?.plan?.name || "Free Tier"}</h2>
              <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold px-3 py-1 uppercase tracking-[0.2em] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                {sub?.status || "Active"}
              </span>
            </div>
            <p className="text-surface-400 text-[10px] font-bold uppercase tracking-widest">Next billing cycle: <span className="text-primary">{sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : "N/A"}</span></p>
          </div>
          <div className="text-right flex flex-col md:items-end">
            <p className="text-5xl font-black text-primary tracking-tighter flex items-end">
              {sub?.plan ? formatCurrency(sub.plan.monthly_price, sub.plan.currency) : "₹0.00"}
              <span className="text-xl text-surface-400 font-bold tracking-normal mb-1 ml-1">/mo</span>
            </p>
          </div>
        </div>
      </motion.section>

      {/* Plan Features / Upgrade */}
      <motion.section variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-surface-50/40 backdrop-blur-xl p-8 border border-white/20 dark:border-white/5 rounded-[2rem] space-y-8 shadow-xl shadow-primary/5">
          <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
            Current Limits
          </h3>
          <ul className="space-y-6">
            {[
              { label: "Active Projects", current: 8, max: 10 },
              { label: "Storage Used", current: "45GB", max: "100GB" },
              { label: "Collaborators", current: 15, max: 20 },
            ].map((item, idx) => (
              <li key={idx} className="space-y-3">
                <div className="flex justify-between text-[10px]">
                  <span className="font-bold text-surface-400 uppercase tracking-widest">{item.label}</span>
                  <span className="font-black text-primary tracking-wider">{item.current} / {item.max}</span>
                </div>
                <div className="w-full bg-black/10 dark:bg-white/5 h-2 rounded-full overflow-hidden border border-white/10 relative">
                  <div 
                    className="bg-primary h-full relative" 
                    style={{ width: typeof item.current === 'number' ? `${(item.current / (item.max as number)) * 100}%` : '45%' }} 
                  >
                    <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] -skew-x-12" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <motion.div 
          whileHover={{ rotateY: 2, rotateX: -2, y: -5, z: 20 }}
          style={{ transformStyle: "preserve-3d", perspective: 1000 }}
          className="bg-surface-900 border border-surface-800 p-8 rounded-[2rem] space-y-8 flex flex-col justify-between relative overflow-hidden shadow-2xl group hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-500"
        >
          <div className="absolute top-0 right-0 w-full h-full arch-grid opacity-[0.05] mix-blend-overlay pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          
          <div className="space-y-4 relative z-10">
            <h3 className="text-[10px] font-black text-accent uppercase tracking-[0.3em] flex items-center gap-2">
              <span className="w-2 h-2 bg-accent rounded-sm animate-pulse shadow-[0_0_8px_rgba(var(--color-accent),0.8)]" />
              Enterprise Access
            </h3>
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest leading-relaxed">
              Need more power? Upgrade to the Enterprise plan for unlimited projects, priority support, and advanced cross-tenant integration.
            </p>
          </div>
          <Button className="w-full bg-accent hover:bg-accent text-background font-black uppercase tracking-[0.3em] text-[10px] h-12 shadow-[0_0_15px_rgba(var(--color-accent),0.3)] transition-all relative z-10">
            Contact Sales
          </Button>
        </motion.div>
      </motion.section>

      {/* Payment Methods Placeholder */}
      <motion.section variants={itemVariants} className="bg-surface-50/40 backdrop-blur-xl p-8 border border-white/20 dark:border-white/5 rounded-[2rem] space-y-8 shadow-xl shadow-primary/5">
        <div className="flex justify-between items-center">
          <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
            Payment Methods
          </h3>
          <button className="text-[10px] font-black text-accent uppercase tracking-[0.2em] hover:text-primary transition-colors flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4"/></svg>
            Add New
          </button>
        </div>
        <motion.div 
          whileHover={{ rotateY: 2, rotateX: -2, y: -5, z: 20 }}
          style={{ transformStyle: "preserve-3d", perspective: 1000 }}
          className="flex items-center gap-6 p-5 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-inner group hover:bg-white/10 transition-colors cursor-pointer"
        >
          <div className="w-14 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center font-black text-white text-[10px] tracking-widest shadow-lg shadow-indigo-500/20">VISA</div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-black text-primary font-mono tracking-widest">•••• •••• •••• 4242</p>
            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Expires 12/28</p>
          </div>
          <div>
            <span className="text-[9px] font-black bg-surface-200/50 text-surface-500 px-3 py-1.5 rounded-full uppercase tracking-[0.2em] border border-surface-200 dark:border-white/10">Default</span>
          </div>
        </motion.div>
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
