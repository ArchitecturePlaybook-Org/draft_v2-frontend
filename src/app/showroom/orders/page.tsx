"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  fetchMyOrders, 
  fetchVendorOrders, 
  updateOrderStatus, 
  cancelOrder, 
  type ProductOrder, 
  type OrderStatus 
} from "@/domains/showroom/api";
import { ShowroomOrdersTable } from "@/components/showroom/ShowroomOrdersTable";
import { ShowroomOrderChatModal } from "@/components/showroom/ShowroomOrderChatModal";
import { toast } from "sonner";

export function ShowroomOrdersPageOriginal() {
  const [viewMode, setViewMode] = useState<"buyer" | "vendor">("buyer");
  const [buyerOrders, setBuyerOrders] = useState<ProductOrder[]>([]);
  const [vendorOrders, setVendorOrders] = useState<ProductOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatOrder, setChatOrder] = useState<ProductOrder | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [b, v] = await Promise.all([
        fetchMyOrders().catch(() => []),
        fetchVendorOrders().catch(() => [])
      ]);
      setBuyerOrders(b || []);
      setVendorOrders(v || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCancelOrder = async (id: number) => {
    if (!confirm("Are you sure you want to cancel this order enquiry?")) return;
    try {
      await cancelOrder(id);
      toast.success("Order enquiry cancelled.");
      setBuyerOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "CANCELLED" } : o)));
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel order.");
    }
  };

  const handleUpdateStatus = async (id: number, status: OrderStatus, vendorNote?: string) => {
    try {
      const updated = await updateOrderStatus(id, status, vendorNote);
      toast.success(`Order #${id} updated to ${status}`);
      setVendorOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
    } catch (err: any) {
      toast.error(err.message || "Failed to update order status.");
    }
  };

  const activeOrders = viewMode === "buyer" ? buyerOrders : vendorOrders;

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      
      {/* Showroom Order Live Chat Modal */}
      <ShowroomOrderChatModal
        order={chatOrder}
        isOpen={!!chatOrder}
        onClose={() => setChatOrder(null)}
      />

      {/* Header Bar */}
      <div className="bg-surface-card border border-surface-200 dark:border-surface-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/20 text-accent flex items-center justify-center font-black text-xl border border-accent/30 shadow-sm">
            📦
          </div>
          <div>
            <h1 className="text-xl font-black text-primary tracking-tight">
              Showroom Orders &amp; Quotation Inquiries
            </h1>
            <p className="text-xs text-surface-400 font-medium">
              Manage product sample inquiries, accept vendor RFQs, and negotiate via live chat
            </p>
          </div>
        </div>

        {/* Perspective Mode Switcher */}
        <div className="flex items-center p-1 bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl shrink-0 self-start sm:self-center">
          <button
            onClick={() => setViewMode("buyer")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "buyer"
                ? "bg-accent text-background shadow-xs"
                : "text-surface-500 hover:text-primary"
            }`}
          >
            <span>👤 My Placed Orders ({buyerOrders.length})</span>
          </button>

          <button
            onClick={() => setViewMode("vendor")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "vendor"
                ? "bg-accent text-background shadow-xs"
                : "text-surface-500 hover:text-primary"
            }`}
          >
            <span>🏪 Incoming Vendor RFQs ({vendorOrders.length})</span>
          </button>
        </div>
      </div>

      {/* Main Orders Data Table */}
      <ShowroomOrdersTable
        orders={activeOrders}
        mode={viewMode}
        loading={loading}
        onOpenChat={setChatOrder}
        onCancelOrder={handleCancelOrder}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}

export default function ShowroomOrdersPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <div className="w-20 h-20 bg-accent/20 text-accent rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-inner border border-accent/30">
        🚧
      </div>
      <h1 className="text-4xl font-black text-primary tracking-tight mb-4">Showroom Orders</h1>
      <p className="text-surface-500 font-medium max-w-md mb-8">
        We are actively building out this section of the architectural products marketplace. Check back soon for updates!
      </p>
      <div className="px-6 py-2 bg-surface-card border border-surface-200 rounded-full shadow-sm text-sm font-bold text-accent uppercase tracking-widest">
        Coming Soon
      </div>
    </div>
  );
}
