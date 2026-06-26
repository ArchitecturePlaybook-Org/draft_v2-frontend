"use client";

import React, { useState, useEffect } from "react";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";

export default function InvoiceManager({ projectId }: { projectId: string }) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = async () => {
    try {
      const data = await projectsApi.getVendorInvoices();
      setInvoices(data);
    } catch (e) {
      toast.error("Failed to load vendor invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  if (loading) return <div className="p-4">Loading invoices...</div>;

  return (
    <div className="bg-surface-100 rounded-3xl border border-surface-200 shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black text-primary uppercase tracking-tight">Vendor Invoices</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-50 border-b border-surface-200 text-[10px] font-black text-surface-400 uppercase tracking-widest">
              <th className="py-4 px-4">Invoice Number</th>
              <th className="py-4 px-4">Vendor</th>
              <th className="py-4 px-4">Total Amount</th>
              <th className="py-4 px-4">Status</th>
              <th className="py-4 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(invoice => (
              <tr key={invoice.id} className="border-b border-surface-100 hover:bg-surface-50">
                <td className="py-3 px-4 font-extrabold text-primary">{invoice.invoice_number}</td>
                <td className="py-3 px-4 font-bold text-surface-600">{invoice.vendor_name || invoice.vendor}</td>
                <td className="py-3 px-4 font-black tabular-nums text-emerald-600">₹{invoice.total_amount}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 text-[9px] font-black uppercase rounded ${
                    invoice.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' :
                    invoice.status === 'PAID' ? 'bg-blue-100 text-blue-600' :
                    invoice.status === 'DISCREPANCY' ? 'bg-red-100 text-red-600' :
                    'bg-surface-200 text-surface-600'
                  }`}>
                    {invoice.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <button 
                    onClick={() => projectsApi.exportVendorInvoice(invoice.id)} 
                    className="px-3 py-1 bg-surface-200 text-surface-600 text-[10px] font-bold uppercase rounded hover:opacity-90 hover:text-white transition-all flex items-center justify-end gap-2 ml-auto"
                  >
                    <span>📄</span> Download PDF
                  </button>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-surface-500 font-bold">No vendor invoices found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
