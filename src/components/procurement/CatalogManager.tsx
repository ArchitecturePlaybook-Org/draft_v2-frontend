import React, { useState, useEffect } from "react";
import { projectsApi } from "@/domains/projects/api";
import { MaterialCatalogItem, Vendor } from "@/types/projects";
import { toast } from "sonner";

export default function CatalogManager() {
  const [items, setItems] = useState<MaterialCatalogItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ item_code: "", description: "", default_unit_rate: "", unit: "EA", preferred_vendor: "" });

  const fetchData = async () => {
    try {
      const [catData, venData] = await Promise.all([
        projectsApi.getMaterialCatalog(),
        projectsApi.getVendors()
      ]);
      setItems(catData);
      setVendors(venData);
    } catch (e) {
      toast.error("Failed to load catalog");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.item_code || !form.default_unit_rate) return toast.error("Required fields missing");
    try {
      await projectsApi.createMaterialCatalogItem({
        ...form,
        preferred_vendor: form.preferred_vendor ? parseInt(form.preferred_vendor) : null,
        is_active: true
      });
      toast.success("Item added to catalog!");
      setShowForm(false);
      setForm({ item_code: "", description: "", default_unit_rate: "", unit: "EA", preferred_vendor: "" });
      fetchData();
    } catch (e) {
      toast.error("Failed to create catalog item");
    }
  };

  const handleSeed = async () => {
    try {
      const res = await projectsApi.seedMaterialCatalog();
      toast.success(`Seeded ${res.seeded_items} standard items!`);
      fetchData();
    } catch (e) {
      toast.error("Failed to load standard items");
    }
  };

  if (loading) return <div className="p-4">Loading catalog...</div>;

  return (
    <div className="bg-white rounded-3xl border border-surface-200 shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black text-primary uppercase tracking-tight">Material Master Catalog</h2>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSeed}
            className="px-4 py-2 bg-surface-100 text-surface-600 border border-surface-200 text-xs font-bold uppercase rounded-lg hover:bg-surface-200"
          >
            Load Standard Items
          </button>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-primary text-white text-xs font-bold uppercase rounded-lg hover:bg-primary/90"
          >
            {showForm ? "Cancel" : "Add Item"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 bg-surface-50 p-4 rounded-xl border border-surface-200 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1">Code *</label>
            <input required value={form.item_code} onChange={e => setForm({...form, item_code: e.target.value})} className="w-full h-10 px-3 rounded-lg border border-surface-300 outline-none focus:border-accent text-sm" placeholder="e.g. CEMENT-01" />
          </div>
          <div className="col-span-2 md:col-span-2">
            <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1">Description</label>
            <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full h-10 px-3 rounded-lg border border-surface-300 outline-none focus:border-accent text-sm" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1">Unit Rate (₹) *</label>
            <input required type="number" step="any" value={form.default_unit_rate} onChange={e => setForm({...form, default_unit_rate: e.target.value})} className="w-full h-10 px-3 rounded-lg border border-surface-300 outline-none focus:border-accent text-sm" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1">Unit *</label>
            <input required value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="w-full h-10 px-3 rounded-lg border border-surface-300 outline-none focus:border-accent text-sm" />
          </div>
          <div className="col-span-2 md:col-span-3">
            <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1">Preferred Vendor (Optional)</label>
            <select value={form.preferred_vendor} onChange={e => setForm({...form, preferred_vendor: e.target.value})} className="w-full h-10 px-3 rounded-lg border border-surface-300 outline-none focus:border-accent text-sm bg-white">
              <option value="">-- Select Vendor --</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 md:col-span-2 flex items-end">
            <button type="submit" className="w-full h-10 bg-accent text-white font-black text-xs uppercase rounded-lg">Save Item</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-50 border-b border-surface-200 text-[10px] font-black text-surface-400 uppercase tracking-widest">
              <th className="py-4 px-4">Code</th>
              <th className="py-4 px-4">Description</th>
              <th className="py-4 px-4 text-right">Default Rate</th>
              <th className="py-4 px-4">Unit</th>
              <th className="py-4 px-4">Preferred Vendor</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-b border-surface-100 hover:bg-surface-50">
                <td className="py-3 px-4 font-extrabold text-primary">{item.item_code}</td>
                <td className="py-3 px-4 text-sm font-medium text-surface-600">{item.description || "-"}</td>
                <td className="py-3 px-4 font-bold tabular-nums text-right text-emerald-600">₹{item.default_unit_rate}</td>
                <td className="py-3 px-4 font-bold text-surface-500">{item.unit}</td>
                <td className="py-3 px-4 text-sm text-surface-600">{item.vendor_name || "-"}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-surface-500 font-bold">No items in catalog.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
