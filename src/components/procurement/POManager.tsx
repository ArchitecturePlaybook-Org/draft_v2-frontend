import React, { useState, useEffect } from "react";
import { projectsApi } from "@/domains/projects/api";
import { PurchaseOrder } from "@/types/projects";
import { toast } from "sonner";

export default function POManager({ projectId }: { projectId: string }) {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPOs = async () => {
    try {
      const data = await projectsApi.getPurchaseOrders();
      setPos(data);
    } catch (e) {
      toast.error("Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPOs();
  }, []);

  const handleAction = async (id: number, action: "submit" | "approve" | "reject") => {
    try {
      if (action === "submit") await projectsApi.submitPurchaseOrder(id);
      if (action === "approve") await projectsApi.approvePurchaseOrder(id);
      if (action === "reject") await projectsApi.rejectPurchaseOrder(id);
      toast.success(`Purchase order ${action}ed`);
      fetchPOs();
    } catch (e: any) {
      toast.error(e.message || `Failed to ${action} PO`);
    }
  };

  if (loading) return <div className="p-4">Loading purchase orders...</div>;

  return (
    <div className="bg-white rounded-3xl border border-surface-200 shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black text-primary uppercase tracking-tight">Purchase Orders</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-50 border-b border-surface-200 text-[10px] font-black text-surface-400 uppercase tracking-widest">
              <th className="py-4 px-4">PO Number</th>
              <th className="py-4 px-4">Vendor</th>
              <th className="py-4 px-4">Total Amount</th>
              <th className="py-4 px-4">Status</th>
              <th className="py-4 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pos.map(po => (
              <tr key={po.id} className="border-b border-surface-100 hover:bg-surface-50">
                <td className="py-3 px-4 font-extrabold text-primary">{po.po_number}</td>
                <td className="py-3 px-4 font-bold text-surface-600">{po.vendor_name}</td>
                <td className="py-3 px-4 font-black tabular-nums text-emerald-600">₹{po.total_amount}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 text-[9px] font-black uppercase rounded ${
                    po.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' :
                    po.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-600' :
                    'bg-surface-200 text-surface-600'
                  }`}>
                    {po.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  {po.status === 'DRAFT' && (
                    <button onClick={() => handleAction(po.id, "submit")} className="px-3 py-1 bg-accent text-white text-[10px] font-bold uppercase rounded hover:bg-accent/90">Submit</button>
                  )}
                  {po.status === 'PENDING_APPROVAL' && (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleAction(po.id, "approve")} className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-bold uppercase rounded hover:bg-emerald-600">Approve</button>
                      <button onClick={() => handleAction(po.id, "reject")} className="px-3 py-1 bg-red-500 text-white text-[10px] font-bold uppercase rounded hover:bg-red-600">Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {pos.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-surface-500 font-bold">No purchase orders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
