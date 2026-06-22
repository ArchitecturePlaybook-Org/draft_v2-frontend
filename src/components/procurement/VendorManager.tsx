import React, { useState, useEffect } from "react";
import { projectsApi } from "@/domains/projects/api";
import { Vendor } from "@/types/projects";
import { toast } from "sonner";

export default function VendorManager() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", contact_name: "", email: "", phone: "", address: "" });

  const fetchVendors = async () => {
    try {
      const data = await projectsApi.getVendors();
      setVendors(data);
    } catch (e) {
      toast.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return toast.error("Name is required");
    try {
      await projectsApi.createVendor(form);
      toast.success("Vendor created!");
      setShowForm(false);
      setForm({ name: "", contact_name: "", email: "", phone: "", address: "" });
      fetchVendors();
    } catch (e) {
      toast.error("Failed to create vendor");
    }
  };

  if (loading) return <div className="p-4">Loading vendors...</div>;

  return (
    <div className="bg-white rounded-3xl border border-surface-200 shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black text-primary uppercase tracking-tight">Vendor Directory</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary text-white text-xs font-bold uppercase rounded-lg hover:bg-primary/90"
        >
          {showForm ? "Cancel" : "Add Vendor"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 bg-surface-50 p-4 rounded-xl border border-surface-200 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1">Company Name *</label>
            <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full h-10 px-3 rounded-lg border border-surface-300 outline-none focus:border-accent text-sm" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1">Contact Name</label>
            <input value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})} className="w-full h-10 px-3 rounded-lg border border-surface-300 outline-none focus:border-accent text-sm" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full h-10 px-3 rounded-lg border border-surface-300 outline-none focus:border-accent text-sm" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1">Phone</label>
            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full h-10 px-3 rounded-lg border border-surface-300 outline-none focus:border-accent text-sm" />
          </div>
          <div className="col-span-2">
            <button type="submit" className="w-full h-10 bg-accent text-white font-black text-xs uppercase rounded-lg">Save Vendor</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vendors.map(v => (
          <div key={v.id} className="p-4 border border-surface-200 rounded-xl hover:border-accent transition-colors">
            <h3 className="font-bold text-lg text-primary">{v.name}</h3>
            {v.contact_name && <p className="text-sm text-surface-600 mt-2">👤 {v.contact_name}</p>}
            {v.email && <p className="text-sm text-surface-600">✉️ {v.email}</p>}
            {v.phone && <p className="text-sm text-surface-600">📞 {v.phone}</p>}
          </div>
        ))}
        {vendors.length === 0 && <p className="col-span-3 text-surface-500 font-bold text-center py-8">No vendors found. Add one above.</p>}
      </div>
    </div>
  );
}
