"use client";

import { useEffect, useState } from "react";
import { billingApi, Invoice } from "@/domains/billing/api";
import { Download, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";

export function PaymentHistory() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    billingApi.getInvoices()
      .then((data) => {
        setInvoices(data);
      })
      .catch((err) => console.error("Failed to fetch invoices", err))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 p-4">
        <div className="h-6 bg-white/5 rounded-full w-1/4 border border-white/10"></div>
        <div className="h-32 bg-white/5 rounded-[1.5rem] border border-white/10"></div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-16 bg-white/5 border border-white/10 rounded-[2rem] backdrop-blur-md relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-surface-800/50 flex items-center justify-center mb-4 border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                <FileText className="w-8 h-8 text-surface-400" />
            </div>
            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2">No payment history</h3>
            <p className="text-surface-400 text-xs font-bold uppercase tracking-widest">You haven't been billed yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden backdrop-blur-md shadow-xl">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-900/50 border-b border-white/10">
          <tr>
            <th className="px-8 py-5 text-[10px] font-black text-surface-400 uppercase tracking-[0.2em]">Date</th>
            <th className="px-8 py-5 text-[10px] font-black text-surface-400 uppercase tracking-[0.2em]">Amount</th>
            <th className="px-8 py-5 text-[10px] font-black text-surface-400 uppercase tracking-[0.2em]">Status</th>
            <th className="px-8 py-5 text-[10px] font-black text-surface-400 uppercase tracking-[0.2em] text-right">Receipt</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {invoices.map((inv) => (
            <tr key={inv.id} className="hover:bg-white/5 transition-colors group">
              <td className="px-8 py-6 text-primary font-bold text-xs uppercase tracking-wider">
                {new Date(inv.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </td>
              <td className="px-8 py-6 text-primary font-black tracking-widest">
                {formatCurrency(parseFloat(inv.amount_paid) > 0 ? inv.amount_paid : inv.amount_due, inv.currency)}
              </td>
              <td className="px-8 py-6">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm
                  ${
                    inv.status === "paid"
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/20"
                      : inv.status === "open"
                      ? "bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-amber-500/20"
                      : "bg-surface-500/10 text-surface-400 border-surface-500/20"
                  }`}
                >
                  {inv.status}
                </span>
              </td>
              <td className="px-8 py-6 text-right space-x-4">
                {inv.status === "paid" && (
                  inv.refund_status ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      Refund {inv.refund_status}
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        const reason = window.prompt("Why are you requesting a refund?");
                        if (reason) {
                          billingApi.requestRefund(inv.id, reason).then(() => {
                            setInvoices((prev) =>
                              prev.map((i) =>
                                i.id === inv.id ? { ...i, refund_status: "pending" } : i
                              )
                            );
                          });
                        }
                      }}
                      className="text-[10px] font-bold text-surface-500 uppercase tracking-widest hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Request Refund
                    </button>
                  )
                )}
                {inv.pdf_url ? (
                  <a
                    href={inv.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[10px] font-black text-accent uppercase tracking-widest hover:text-primary transition-colors bg-accent/10 px-4 py-2 rounded-lg border border-accent/20 hover:bg-accent hover:text-background"
                  >
                    <Download className="w-3 h-3" />
                    <span>Receipt</span>
                  </a>
                ) : (
                  <span className="text-surface-500 text-[10px] font-bold uppercase tracking-widest">No Receipt</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
