"use client";

import React, { useEffect, useState } from "react";
import { ProcurementAggregatorItem } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";

export default function GlobalProcurementDashboard() {
  const [items, setItems] = useState<ProcurementAggregatorItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for expanded rows (BOQ items) and project sections
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  
  const [selectedAllocations, setSelectedAllocations] = useState<Record<number, boolean>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchAggregation = async () => {
    setLoading(true);
    try {
      const data = await projectsApi.getProcurementAggregation();
      // Filter out items that have no REQUISITIONED or ORDERED allocations
      const filteredData = data.filter((item: ProcurementAggregatorItem) => 
        parseFloat(item.requisitioned_qty as string) > 0 || parseFloat(item.ordered_qty as string) > 0
      );
      setItems(filteredData);
    } catch (err) {
      toast.error("Failed to load procurement data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAggregation();
  }, []);

  const toggleRow = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  const toggleProject = (projectName: string) => {
    setExpandedProjects(prev => ({ ...prev, [projectName]: prev[projectName] === false ? true : false }));
  };

  const toggleAllocation = (allocId: number) => {
    setSelectedAllocations(prev => ({ ...prev, [allocId]: !prev[allocId] }));
  };

  const handleGeneratePO = async () => {
    const idsToOrder = Object.entries(selectedAllocations)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => parseInt(id, 10));

    if (idsToOrder.length === 0) {
      toast.error("Select at least one requisitioned item to generate PO.");
      return;
    }

    setIsProcessing(true);
    try {
      await projectsApi.bulkUpdateMaterialAllocationStatus(idsToOrder, "ORDERED");
      toast.success(`Successfully generated POs for ${idsToOrder.length} requests.`);
      setSelectedAllocations({});
      await fetchAggregation();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate PO.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintPO = (allocId: number) => {
    window.print();
    toast.success("PO print dialog opened.");
  };

  const selectedCount = Object.values(selectedAllocations).filter(Boolean).length;

  // Group items by project_name
  const groupedItems = items.reduce((acc, item) => {
    const pName = item.project_name || "Unknown Project";
    if (!acc[pName]) acc[pName] = [];
    acc[pName].push(item);
    return acc;
  }, {} as Record<string, ProcurementAggregatorItem[]>);

  return (
    <div className="flex-1 flex flex-col bg-surface-50 h-full overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 bg-white border-b border-surface-200 shrink-0">
        <h1 className="text-2xl font-black text-primary uppercase tracking-tight">GLOBAL PROCUREMENT & BOQ LEDGER</h1>
        <p className="text-sm font-bold text-surface-500 mt-1">Aggregated Buy Signals & Purchase Orders Across All Projects</p>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {loading ? (
            <div className="p-10 text-center text-surface-500 font-bold">Loading ledger...</div>
          ) : Object.keys(groupedItems).length === 0 ? (
            <div className="p-10 text-center text-surface-500">
              <p className="text-3xl mb-2">📦</p>
              <p className="font-bold">No pending buy signals found.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedItems).map(([projectName, projectItems]) => {
                const isProjectExpanded = expandedProjects[projectName] !== false; // Default true
                
                return (
                  <div key={projectName} className="bg-white rounded-3xl border border-surface-200 shadow-sm overflow-hidden">
                    {/* Project Header */}
                    <div 
                      className="px-6 py-4 bg-surface-100 border-b border-surface-200 flex justify-between items-center cursor-pointer hover:bg-surface-200 transition-colors"
                      onClick={() => toggleProject(projectName)}
                    >
                      <h2 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2">
                        <span>🏢</span> {projectName}
                      </h2>
                      <span className="text-xs font-bold text-surface-500 bg-white px-3 py-1 rounded-full border border-surface-200">
                        {projectItems.length} BOQ Items
                      </span>
                    </div>

                    {/* Project BOQ Table */}
                    {isProjectExpanded && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-surface-50 border-b border-surface-200 text-[10px] font-black text-surface-400 uppercase tracking-widest">
                              <th className="py-4 px-6 font-black w-8"></th>
                              <th className="py-4 px-6 font-black">BOQ Item & Code</th>
                              <th className="py-4 px-6 font-black">Phase</th>
                              <th className="py-4 px-6 font-black">Total BOQ</th>
                              <th className="py-4 px-6 font-black">In Draft</th>
                              <th className="py-4 px-6 font-black text-amber-600">🔴 REQUISITIONED (Buy Now)</th>
                              <th className="py-4 px-6 font-black text-blue-600">Ordered</th>
                            </tr>
                          </thead>
                          <tbody>
                            {projectItems.map((item) => {
                              const isExpanded = expandedRows[item.id];
                              const reqOrOrdAllocations = (item.allocations || []).filter(
                                a => a.req_status === "REQUISITIONED" || a.req_status === "ORDERED"
                              );

                              return (
                                <React.Fragment key={item.id}>
                                  <tr className={`border-b border-surface-100 hover:bg-surface-50 transition-colors ${isExpanded ? "bg-surface-50" : ""}`}>
                                    <td className="py-4 px-6">
                                      <button 
                                        onClick={() => toggleRow(item.id)}
                                        className="w-6 h-6 rounded-md bg-surface-200 text-surface-600 flex items-center justify-center hover:bg-accent hover:text-white transition-all font-bold"
                                      >
                                        {isExpanded ? "v" : ">"}
                                      </button>
                                    </td>
                                    <td className="py-4 px-6 font-extrabold text-primary">{item.material_code}</td>
                                    <td className="py-4 px-6 font-bold text-surface-500">{item.phase ? `Phase ${item.phase}` : "Global"}</td>
                                    <td className="py-4 px-6 font-bold tabular-nums text-surface-600">{item.total_budgeted_qty}</td>
                                    <td className="py-4 px-6 font-bold tabular-nums text-surface-600">{item.draft_qty}</td>
                                    <td className="py-4 px-6 font-black tabular-nums text-amber-600">{item.requisitioned_qty}</td>
                                    <td className="py-4 px-6 font-bold tabular-nums text-blue-600">{item.ordered_qty}</td>
                                  </tr>

                                  {isExpanded && reqOrOrdAllocations.length > 0 && (
                                    <tr>
                                      <td colSpan={7} className="p-0 border-b border-surface-200">
                                        <div className="bg-amber-50/30 px-14 py-4 border-l-4 border-amber-300">
                                          <table className="w-full text-left">
                                            <tbody>
                                              {reqOrOrdAllocations.map(alloc => (
                                                <tr key={alloc.id} className="border-b border-surface-100 last:border-0 hover:bg-white transition-colors">
                                                  <td className="py-3 px-4 font-bold text-sm text-primary flex items-center gap-2">
                                                    <span className="text-surface-400">↳</span>
                                                    {alloc.task_zone_name ? `${alloc.task_zone_name} (${alloc.task_title})` : alloc.task_title}
                                                    <span className="text-[10px] font-bold text-surface-400">
                                                      (Req {alloc.expected_on_site_by || "ASAP"})
                                                    </span>
                                                  </td>
                                                  <td className="py-3 px-4 text-sm font-medium text-surface-500">
                                                    {alloc.notes || "No notes"}
                                                  </td>
                                                  <td className="py-3 px-4 font-black tabular-nums text-amber-600 w-32">
                                                    {alloc.allocated_qty}
                                                  </td>
                                                  <td className="py-3 px-4 w-32 flex justify-end">
                                                    {alloc.req_status === "ORDERED" ? (
                                                      <button
                                                        onClick={() => handlePrintPO(alloc.id)}
                                                        className="flex items-center gap-2 px-3 py-1.5 bg-surface-200 text-surface-600 text-[10px] font-black uppercase tracking-widest rounded hover:bg-blue-100 hover:text-blue-600 transition-colors"
                                                      >
                                                        🖨️ Print PO
                                                      </button>
                                                    ) : (
                                                      <label className="flex items-center gap-2 cursor-pointer group">
                                                        <input 
                                                          type="checkbox" 
                                                          checked={!!selectedAllocations[alloc.id]}
                                                          onChange={() => toggleAllocation(alloc.id)}
                                                          className="w-5 h-5 rounded border-surface-300 accent-accent cursor-pointer"
                                                        />
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-surface-500 group-hover:text-primary">Select</span>
                                                      </label>
                                                    )}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Footer */}
          {selectedCount > 0 && (
            <div className="sticky bottom-8 bg-primary text-white rounded-2xl shadow-2xl p-4 px-6 flex items-center justify-between animate-fade-in border border-surface-200/20">
              <div>
                <p className="text-sm font-bold">{selectedCount} items selected for Purchase Order</p>
                <p className="text-xs text-white/60">Selected allocations will transition to ORDERED state.</p>
              </div>
              <button
                onClick={handleGeneratePO}
                disabled={isProcessing}
                className="h-12 px-8 bg-accent text-white font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-white hover:text-accent transition-all shadow-lg disabled:opacity-50"
              >
                {isProcessing ? "Processing..." : `[ GENERATE PURCHASE ORDER FOR SELECTED ITEMS (${selectedCount}) ]`}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
