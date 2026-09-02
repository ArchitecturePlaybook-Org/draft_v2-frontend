"use client";

import { useEffect, useState } from "react";
import { billingApi, Invoice } from "@/domains/billing/api";
import { Download, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";

export function PaymentHistory() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    billingApi
      .getInvoices()
      .then((data) => {
        setInvoices(data);
      })
      .catch((err) => console.error("Failed to fetch invoices", err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleDownloadReceipt = (inv: Invoice) => {
    const receiptWindow = window.open("", "_blank");
    if (!receiptWindow) return;

    const formattedDate = new Date(inv.created_at).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const amountStr = formatCurrency(
      parseFloat(inv.amount_paid) > 0 ? inv.amount_paid : inv.amount_due,
      inv.currency
    );

    receiptWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt #${inv.id} — Architecture Playbook</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; }
            .card { max-width: 600px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 24px; padding: 40px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 24px; margin-bottom: 24px; }
            .brand { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; color: #6366f1; text-transform: uppercase; }
            .title { font-size: 14px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; }
            .row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px dashed #334155; }
            .label { color: #94a3b8; font-size: 13px; font-weight: 600; text-transform: uppercase; }
            .value { color: #f8fafc; font-size: 14px; font-weight: 700; }
            .total-row { display: flex; justify-content: space-between; padding: 20px 0 0 0; font-size: 20px; font-weight: 900; }
            .badge { display: inline-block; padding: 4px 12px; background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); border-radius: 999px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
            .btn { margin-top: 32px; width: 100%; padding: 14px; background: #6366f1; color: #ffffff; border: none; border-radius: 12px; font-weight: 800; font-size: 13px; text-transform: uppercase; cursor: pointer; }
            @media print { .btn { display: none; } body { background: #fff; color: #000; } .card { border: none; box-shadow: none; background: #fff; color: #000; } .label, .title { color: #475569; } .value { color: #0f172a; } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="brand">Architecture Playbook</div>
              <div class="badge">PAYMENT ${inv.status.toUpperCase()}</div>
            </div>
            <div class="title" style="margin-bottom: 16px;">Official Payment Receipt</div>
            <div class="row"><span class="label">Receipt Ref</span><span class="value">${inv.provider_invoice_id || `INV-${inv.id}`}</span></div>
            <div class="row"><span class="label">Date</span><span class="value">${formattedDate}</span></div>
            <div class="row"><span class="label">Description</span><span class="value">Professional Plan Subscription</span></div>
            <div class="row"><span class="label">Status</span><span class="value">${inv.status.toUpperCase()}</span></div>
            <div class="total-row">
              <span style="color: #94a3b8; font-size: 14px; text-transform: uppercase;">Amount Paid</span>
              <span style="color: #6366f1;">${amountStr}</span>
            </div>
            <button class="btn" onclick="window.print()">Print / Save PDF</button>
          </div>
        </body>
      </html>
    `);
    receiptWindow.document.close();
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 p-4">
        <div className="h-6 bg-white/5 rounded-full w-1/4 border border-white/10"></div>
        <div className="h-32 bg-white/5 rounded-xl border border-white/10"></div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-surface-800/50 flex items-center justify-center mb-4 border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
            <FileText className="w-6 h-6 text-surface-400" />
          </div>
          <h3 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] mb-2">No payment history</h3>
          <p className="text-surface-400 text-xs font-bold uppercase tracking-widest">You haven't been billed yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-900/50 border-b border-white/10">
          <tr>
            <th className="px-6 py-4 text-[11px] font-black text-surface-400 uppercase tracking-[0.2em]">Date</th>
            <th className="px-6 py-4 text-[11px] font-black text-surface-400 uppercase tracking-[0.2em]">Amount</th>
            <th className="px-6 py-4 text-[11px] font-black text-surface-400 uppercase tracking-[0.2em]">Status</th>
            <th className="px-6 py-4 text-[11px] font-black text-surface-400 uppercase tracking-[0.2em] text-right">Receipt</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {invoices.map((inv) => (
            <tr key={inv.id} className="hover:bg-white/5 transition-colors group">
              <td className="px-6 py-4 text-primary font-bold text-xs uppercase tracking-wider">
                {new Date(inv.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </td>
              <td className="px-6 py-4 text-primary font-black tracking-widest">
                {formatCurrency(parseFloat(inv.amount_paid) > 0 ? inv.amount_paid : inv.amount_due, inv.currency)}
              </td>
              <td className="px-6 py-4">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm
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
              <td className="px-6 py-4 text-right space-x-4">
                {inv.status === "paid" &&
                  (inv.refund_status ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      Refund {inv.refund_status}
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        const reason = window.prompt("Why are you requesting a refund?");
                        if (reason) {
                          billingApi.requestRefund(inv.id, reason).then(() => {
                            setInvoices((prev) =>
                              prev.map((i) => (i.id === inv.id ? { ...i, refund_status: "pending" } : i))
                            );
                          });
                        }
                      }}
                      className="text-[11px] font-bold text-surface-500 uppercase tracking-widest hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Request Refund
                    </button>
                  ))}
                <button
                  onClick={() => handleDownloadReceipt(inv)}
                  className="inline-flex items-center gap-2 text-[11px] font-black text-accent uppercase tracking-widest hover:text-primary transition-colors bg-accent/10 px-3 py-1.5 rounded-lg border border-accent/20 hover:bg-accent hover:text-background"
                >
                  <Download className="w-3 h-3" />
                  <span>Receipt</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
