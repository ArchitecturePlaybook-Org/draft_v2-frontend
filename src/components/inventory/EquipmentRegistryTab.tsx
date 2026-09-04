import React, { useState, useEffect, useCallback } from "react";
import { Wrench, Plus, Search, Edit2, Trash2, MapPin, Building, ShieldCheck, Tag, Clock } from "lucide-react";
import { inventoryApi } from "@/domains/inventory/api";
import { Equipment } from "@/domains/inventory/types";
import { EquipmentFormModal } from "@/components/inventory/EquipmentFormModal";
import { EquipmentDetailModal } from "@/components/inventory/EquipmentDetailModal";
import { toast } from "sonner";

export function EquipmentRegistryTab() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [ownershipFilter, setOwnershipFilter] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  
  // Utilization Detail Modal state
  const [selectedForDetail, setSelectedForDetail] = useState<Equipment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.getEquipmentList();
      setEquipment(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load equipment registry");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this equipment? This action cannot be undone unless it has existing history.")) return;
    try {
      await inventoryApi.deleteEquipment(id);
      toast.success("Equipment deleted");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete equipment");
    }
  };

  const filteredEquipment = equipment.filter(e => {
    if (ownershipFilter !== "ALL" && e.ownership_type !== ownershipFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        e.name.toLowerCase().includes(q) ||
        e.equipment_code.toLowerCase().includes(q) ||
        (e.serial_no && e.serial_no.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="p-6 h-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
            <input
              placeholder="Search by code, name, serial..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-sm bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
          
          <select
            value={ownershipFilter}
            onChange={(e) => setOwnershipFilter(e.target.value)}
            className="h-10 px-3 text-sm bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Ownership Types</option>
            <option value="OWNED">Company Owned</option>
            <option value="RENTED">Hired / Rented</option>
            <option value="SUBCONTRACTOR">Subcontractor Owned</option>
          </select>
        </div>

        <button
          onClick={() => {
            setEditingEquipment(null);
            setShowModal(true);
          }}
          className="h-10 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-bold flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20 w-full md:w-auto"
        >
          <Plus className="w-4 h-4" />
          Register Asset
        </button>
      </div>

      <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/50 flex-1">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-zinc-900/80 text-xs uppercase tracking-wider text-zinc-500 sticky top-0 z-10">
              <tr>
                <th className="py-4 px-6 font-semibold">Asset Info</th>
                <th className="py-4 px-6 font-semibold">Category</th>
                <th className="py-4 px-6 font-semibold">Ownership & Status</th>
                <th className="py-4 px-6 font-semibold">Current Location</th>
                <th className="py-4 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500">
                    <Wrench className="w-6 h-6 mx-auto mb-2 animate-bounce opacity-50" />
                    Loading registry...
                  </td>
                </tr>
              ) : filteredEquipment.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    <Tag className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    No equipment matches your filters.
                  </td>
                </tr>
              ) : (
                filteredEquipment.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-900/30 transition-colors">
                    <td 
                      className="py-4 px-6 cursor-pointer group"
                      onClick={() => {
                        setSelectedForDetail(item);
                        setShowDetailModal(true);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 group-hover:bg-cyan-500/20 group-hover:border-cyan-500/30 border border-transparent transition-all flex items-center justify-center shrink-0">
                          <Wrench className="w-5 h-5 text-cyan-500" />
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm group-hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                            {item.name}
                          </div>
                          <div className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-cyan-400 bg-cyan-400/10 px-1.5 rounded">{item.equipment_code}</span>
                            {item.serial_no && <span>SN: {item.serial_no}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-zinc-300 capitalize">{item.category?.replace(/_/g, ' ').toLowerCase()}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1.5 items-start">
                        {item.ownership_type === "OWNED" && <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">Owned</span>}
                        {item.ownership_type === "RENTED" && <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">Rented</span>}
                        {item.ownership_type === "SUBCONTRACTOR" && <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">Subcontractor</span>}

                        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                           <div className={`w-2 h-2 rounded-full ${item.status === 'AVAILABLE' || item.status === 'OPERATIONAL' ? 'bg-emerald-400' : item.status === 'IN_USE' ? 'bg-amber-400' : item.status === 'UNDER_MAINTENANCE' ? 'bg-red-400' : 'bg-zinc-500'}`} />
                           {item.status?.replace(/_/g, ' ')}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {item.current_site ? (
                        <div className="flex items-center gap-2 text-sm text-zinc-300">
                          <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{typeof item.current_site === "object" && item.current_site ? (item.current_site as any).name : item.site_name || item.current_site}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-500 italic">Unassigned / Main Yard</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedForDetail(item);
                            setShowDetailModal(true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                          title="View Utilization History"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          Utilization
                        </button>
                        <button
                          onClick={() => {
                            setEditingEquipment(item);
                            setShowModal(true);
                          }}
                          className="p-1.5 text-zinc-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded transition-colors"
                          title="Edit Equipment"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                          title="Delete Equipment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EquipmentFormModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingEquipment(null);
        }}
        equipment={editingEquipment}
        onSaved={loadData}
      />

      <EquipmentDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedForDetail(null);
        }}
        equipment={selectedForDetail}
      />
    </div>
  );
}
