"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Briefcase, IndianRupee, Trash2, ShieldAlert } from "lucide-react";
import { inventoryApi, LaborMaster, Vendor } from "@/domains/inventory/api";
import { formatCurrency } from "@/lib/utils/formatters";
import { toast } from "sonner";

export function ManpowerRegistryTab() {
  const [labors, setLabors] = useState<LaborMaster[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLabor, setSelectedLabor] = useState<LaborMaster | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      const [lRes, vRes] = await Promise.all([
        inventoryApi.getLaborMasters(),
        inventoryApi.getVendors(),
      ]);
      setLabors(lRes);
      // We expect vendors response might be paginated or raw array depending on endpoint
      setVendors(Array.isArray(vRes) ? vRes : (vRes as any).results || []);
    } catch (err) {
      toast.error("Failed to load manpower data.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleEdit = (labor: LaborMaster) => {
    setSelectedLabor(labor);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedLabor(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this manpower type?")) return;
    try {
      await inventoryApi.deleteLaborMaster(id);
      toast.success("Deleted successfully.");
      fetchData();
    } catch (err) {
      toast.error("Failed to delete.");
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-white/5 rounded-full w-1/4"></div>
        <div className="h-64 bg-white/5 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-accent" />
            Manpower Registry
          </h2>
          <p className="text-xs text-surface-400">Manage standard trades and daily labor rates</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-background px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Add Manpower Type
        </button>
      </div>

      <div className="bg-surface-50/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-900/50 border-b border-white/10">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-surface-400 uppercase tracking-widest">Trade / Crew Type</th>
              <th className="px-6 py-4 text-[10px] font-black text-surface-400 uppercase tracking-widest">Category</th>
              <th className="px-6 py-4 text-[10px] font-black text-surface-400 uppercase tracking-widest">Standard Daily Rate</th>
              <th className="px-6 py-4 text-[10px] font-black text-surface-400 uppercase tracking-widest">Vendor / Agency</th>
              <th className="px-6 py-4 text-right text-[10px] font-black text-surface-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {labors.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <Briefcase className="w-8 h-8 text-surface-500 mx-auto mb-3" />
                  <p className="text-xs text-surface-400 font-bold uppercase tracking-widest">No manpower types registered</p>
                </td>
              </tr>
            ) : (
              labors.map((item) => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => handleEdit(item)}>
                  <td className="px-6 py-4 font-bold text-primary text-xs tracking-wider">
                    {item.trade_type}
                    {!item.is_active && (
                      <span className="ml-2 inline-block px-2 py-0.5 bg-red-500/10 text-red-500 text-[9px] rounded-full">INACTIVE</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded-md text-surface-300 font-bold tracking-widest uppercase">
                      {item.category.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-primary font-bold">
                    {formatCurrency(parseFloat(item.standard_daily_rate), "INR")} / day
                  </td>
                  <td className="px-6 py-4 text-surface-300 text-xs font-bold">
                    {item.vendor_name || "Direct / Company"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="p-2 text-surface-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <LaborModal
            labor={selectedLabor}
            vendors={vendors}
            onClose={() => setIsModalOpen(false)}
            onSave={() => {
              setIsModalOpen(false);
              fetchData();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function LaborModal({
  labor,
  vendors,
  onClose,
  onSave,
}: {
  labor: LaborMaster | null;
  vendors: Vendor[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    trade_type: labor?.trade_type || "",
    category: labor?.category || "UNSKILLED",
    vendor: labor?.vendor || "",
    standard_daily_rate: labor?.standard_daily_rate || "0",
    is_active: labor !== null ? labor.is_active : true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: any = {
        ...formData,
        vendor: formData.vendor ? parseInt(formData.vendor as string) : null,
      };

      if (labor) {
        await inventoryApi.updateLaborMaster(labor.id, payload);
        toast.success("Updated successfully.");
      } else {
        await inventoryApi.createLaborMaster(payload);
        toast.success("Created successfully.");
      }
      onSave();
    } catch (err) {
      toast.error("Failed to save.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-surface-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-surface-900/50">
          <h3 className="text-lg font-bold text-primary">
            {labor ? "Edit Manpower Type" : "Add Manpower Type"}
          </h3>
          <button onClick={onClose} className="p-2 text-surface-400 hover:text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2">
                Trade / Crew Type
              </label>
              <input
                type="text"
                required
                value={formData.trade_type}
                onChange={(e) => setFormData({ ...formData, trade_type: e.target.value })}
                placeholder="e.g. Mason (Brickwork)"
                className="w-full bg-surface-950 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-primary placeholder:text-surface-600 focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-surface-950 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-primary focus:outline-none focus:border-accent transition-colors"
                >
                  <option value="UNSKILLED">Unskilled</option>
                  <option value="SEMI_SKILLED">Semi-Skilled</option>
                  <option value="SKILLED">Skilled</option>
                  <option value="SUPERVISORY">Supervisory</option>
                  <option value="OPERATOR">Operator</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2">
                  Standard Daily Rate (₹)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IndianRupee className="h-4 w-4 text-surface-500" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.standard_daily_rate}
                    onChange={(e) => setFormData({ ...formData, standard_daily_rate: e.target.value })}
                    className="w-full bg-surface-950 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-primary focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2">
                Supply Vendor / Agency (Optional)
              </label>
              <select
                value={formData.vendor || ""}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                className="w-full bg-surface-950 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-primary focus:outline-none focus:border-accent transition-colors"
              >
                <option value="">Direct / Company Labor</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            {labor && (
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-white/10 bg-surface-950 text-accent focus:ring-accent"
                />
                <label htmlFor="isActive" className="text-sm font-bold text-surface-300 cursor-pointer">
                  Active (Available for Field Diary)
                </label>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-primary rounded-xl text-sm font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-accent hover:bg-accent/90 text-background rounded-xl text-sm font-bold shadow-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Manpower"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
