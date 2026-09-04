import React, { useState, useEffect } from "react";
import { X, Wrench, Search, AlertCircle, MapPin, RefreshCw } from "lucide-react";
import { Equipment, Site } from "@/domains/inventory/types";
import { inventoryApi } from "@/domains/inventory/api";
import { toast } from "sonner";

interface EquipmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment?: Equipment | null;
  onSaved: () => void;
}

export function EquipmentFormModal({ isOpen, onClose, equipment, onSaved }: EquipmentFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    equipment_code: "",
    serial_no: "",
    category: "POWER_TOOLS",
    ownership_type: "OWNED",
    status: "AVAILABLE",
    current_site_id: "",
  });

  useEffect(() => {
    if (isOpen) {
      // Load sites
      inventoryApi.getSites().then(setSites).catch(console.error);

      if (equipment) {
        setForm({
          name: equipment.name,
          equipment_code: equipment.equipment_code,
          serial_no: equipment.serial_no || "",
          category: equipment.category,
          ownership_type: equipment.ownership_type || "OWNED",
          status: equipment.status || "AVAILABLE",
          current_site_id: equipment.current_site_id || (typeof equipment.current_site === "object" && equipment.current_site ? (equipment.current_site as any).id : equipment.current_site) || "",
        });
      } else {
        setForm({
          name: "",
          equipment_code: "",
          serial_no: "",
          category: "POWER_TOOLS",
          ownership_type: "OWNED",
          status: "AVAILABLE",
          current_site_id: "",
        });
      }
    }
  }, [isOpen, equipment]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const payload: any = { ...form };
      if (!payload.current_site_id) {
        payload.current_site_id = null; // Convert empty string to null for API
      }

      if (equipment?.id) {
        await inventoryApi.updateEquipment(equipment.id, payload);
        toast.success("Equipment updated successfully");
      } else {
        await inventoryApi.createEquipment(payload);
        toast.success("Equipment registered successfully");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save equipment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {equipment ? "Edit Equipment" : "Register New Equipment"}
              </h2>
              <p className="text-xs text-zinc-400">
                {equipment ? "Update details for this asset" : "Add a new tool or machinery to the registry"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <div className="text-sm text-red-400">{error}</div>
            </div>
          )}

          <form id="equipment-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Asset Details */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Asset Details</h3>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Equipment Name <span className="text-red-400">*</span></label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. JCB Excavator 3DX"
                    className="w-full h-10 px-3 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Equipment Code / Tag <span className="text-red-400">*</span></label>
                  <input
                    required
                    value={form.equipment_code}
                    onChange={(e) => setForm({ ...form, equipment_code: e.target.value })}
                    placeholder="e.g. EQ-EXC-001"
                    className="w-full h-10 px-3 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Serial No / VIN</label>
                  <input
                    value={form.serial_no}
                    onChange={(e) => setForm({ ...form, serial_no: e.target.value })}
                    placeholder="Factory serial number"
                    className="w-full h-10 px-3 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                  />
                </div>
              </div>

              {/* Classification */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Classification</h3>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full h-10 px-3 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                  >
                    <option value="HEAVY_MACHINERY">Heavy Machinery</option>
                    <option value="POWER_TOOLS">Power Tools</option>
                    <option value="CONCRETING">Concreting Equipment</option>
                    <option value="SCAFFOLDING">Scaffolding & Formwork</option>
                    <option value="SURVEYING">Surveying & Testing</option>
                    <option value="SAFETY">Safety Systems</option>
                    <option value="GENERATORS">Generators & Pumps</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Ownership Type</label>
                  <select
                    value={form.ownership_type}
                    onChange={(e) => setForm({ ...form, ownership_type: e.target.value })}
                    className="w-full h-10 px-3 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                  >
                    <option value="OWNED">Company Owned</option>
                    <option value="RENTED">Hired / Rented (Vendor)</option>
                    <option value="SUBCONTRACTOR">Subcontractor Owned</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full h-10 px-3 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="IN_USE">In Use</option>
                    <option value="IN_TRANSIT">In Transit</option>
                    <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                    <option value="DECOMMISSIONED">Decommissioned</option>
                  </select>
                </div>

              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <div className="space-y-1.5 md:w-1/2">
                <label className="text-xs font-medium text-zinc-300 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  Current Site / Location
                </label>
                <select
                  value={form.current_site_id}
                  onChange={(e) => setForm({ ...form, current_site_id: e.target.value })}
                  className="w-full h-10 px-3 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                >
                  <option value="">Unassigned / Main Yard</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="equipment-form"
            disabled={loading}
            className="px-6 py-2 text-sm font-bold text-zinc-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            {equipment ? "Save Changes" : "Register Equipment"}
          </button>
        </div>
      </div>
    </div>
  );
}
