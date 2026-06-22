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
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-surface-200 rounded w-1/4"></div>
        <div className="h-32 bg-surface-100 rounded"></div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-12 bg-surface-50 border border-surface-200 rounded-lg">
        <FileText className="w-12 h-12 text-surface-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-surface-900">No payment history</h3>
        <p className="text-surface-500 mt-1">You haven't been billed yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-surface-200 rounded-lg overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-50 border-b border-surface-200">
          <tr>
            <th className="px-6 py-3 font-medium text-surface-600">Date</th>
            <th className="px-6 py-3 font-medium text-surface-600">Amount</th>
            <th className="px-6 py-3 font-medium text-surface-600">Status</th>
            <th className="px-6 py-3 font-medium text-surface-600 text-right">Receipt</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-200">
          {invoices.map((inv) => (
            <tr key={inv.id} className="hover:bg-surface-50 transition-colors">
              <td className="px-6 py-4 text-surface-900 font-medium">
                {new Date(inv.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </td>
              <td className="px-6 py-4 text-surface-900 font-medium">
                {formatCurrency(parseFloat(inv.amount_paid) > 0 ? inv.amount_paid : inv.amount_due, inv.currency)}
              </td>
              <td className="px-6 py-4">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                  ${
                    inv.status === "paid"
                      ? "bg-green-100 text-green-800"
                      : inv.status === "open"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-surface-200 text-surface-800"
                  }`}
                >
                  {inv.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right space-x-4">
                {inv.status === "paid" && (
                  inv.refund_status ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-yellow-100 text-yellow-800">
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
                      className="text-xs font-medium text-surface-500 hover:text-primary-600 transition-colors"
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
                    className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-800 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Receipt</span>
                  </a>
                ) : (
                  <span className="text-surface-400 text-sm">No Receipt</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
