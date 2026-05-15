"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { billingApi, Subscription } from "@/domains/billing/api";

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
    <div className="space-y-10 animate-in fade-in duration-500 max-w-5xl mx-auto py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-primary mb-3 tracking-tight">Subscription</h1>
          <p className="text-surface-600 max-w-2xl leading-relaxed">
            Manage your billing, active plans, and institutional access capabilities.
          </p>
        </div>
      </div>

      {/* Current Plan Details */}
      <section className="bg-white p-8 border border-surface-200 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 arch-grid opacity-5 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-primary">{sub?.plan_name || "Free Tier"}</h2>
              <span className="bg-accent/10 text-accent text-[10px] font-bold px-2 py-1 uppercase tracking-widest rounded">{sub?.status || "Active"}</span>
            </div>
            <p className="text-surface-600 text-sm">Next billing cycle: {sub?.next_billing_date || "N/A"}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-extrabold text-primary">${sub?.price || "0.00"}<span className="text-lg text-surface-600 font-medium">/mo</span></p>
          </div>
        </div>
      </section>

      {/* Plan Features / Upgrade */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-surface-50 p-8 border border-surface-200 rounded-2xl space-y-6">
          <h3 className="text-lg font-bold text-primary uppercase tracking-wider text-[13px]">Current Limits</h3>
          <ul className="space-y-4">
            {[
              { label: "Active Projects", current: 8, max: 10 },
              { label: "Storage Used", current: "45GB", max: "100GB" },
              { label: "Collaborators", current: 15, max: 20 },
            ].map((item, idx) => (
              <li key={idx} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-surface-600">{item.label}</span>
                  <span className="font-bold text-primary">{item.current} / {item.max}</span>
                </div>
                <div className="w-full bg-surface-200 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full" 
                    style={{ width: typeof item.current === 'number' ? `${(item.current / (item.max as number)) * 100}%` : '45%' }} 
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-primary text-white p-8 rounded-2xl space-y-6 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-xl font-bold">Enterprise Access</h3>
            <p className="text-surface-400 text-sm leading-relaxed">
              Need more power? Upgrade to the Enterprise plan for unlimited projects, priority support, and advanced cross-tenant integration.
            </p>
          </div>
          <Button variant="outline" className="w-full border-white text-white hover:bg-white hover:text-primary transition-all">
            Contact Sales
          </Button>
        </div>
      </section>

      {/* Payment Methods Placeholder */}
      <section className="bg-white p-8 border border-surface-200 rounded-2xl space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-primary uppercase tracking-wider text-[13px]">Payment Methods</h3>
          <button className="text-[11px] font-bold text-accent uppercase tracking-widest hover:underline">Add New</button>
        </div>
        <div className="flex items-center gap-4 p-4 border border-surface-200 rounded-xl">
          <div className="w-12 h-8 bg-surface-100 rounded flex items-center justify-center font-bold text-xs">VISA</div>
          <div>
            <p className="text-sm font-bold text-primary">•••• •••• •••• 4242</p>
            <p className="text-xs text-surface-600">Expires 12/28</p>
          </div>
          <div className="ml-auto">
            <span className="text-[10px] font-bold bg-surface-100 text-surface-600 px-2 py-1 rounded uppercase tracking-widest">Default</span>
          </div>
        </div>
      </section>
    </div>
  );
}
