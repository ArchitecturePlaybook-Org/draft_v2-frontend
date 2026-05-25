"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ProcurementAggregatorItem, MilestonePhase } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";

export default function ProcurementDashboard() {
  const params = useParams();
  const projectId = params.id as string;

  const [activeTab, setActiveTab] = useState<"BOQ" | "SIGNALS">("BOQ");
  
  const [items, setItems] = useState<ProcurementAggregatorItem[]>([]);
  const [phases, setPhases] = useState<MilestonePhase[]>([]);
  const [projectIntId, setProjectIntId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [selectedAllocations, setSelectedAllocations] = useState<Record<number, boolean>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // BOQ Form State
  const [boqForm, setBoqForm] = useState({
    material_code: "",
    total_budgeted_qty: "",
    unit_rate: "",
    phase: ""
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [aggData, projectData, matrixData] = await Promise.all([
        projectsApi.getProcurementAggregation(projectId),
        projectsApi.getProjectDetails(projectId),
        projectsApi.getMatrix(projectId)
      ]);
      setItems(aggData);
      setProjectIntId(projectData.id);
      setPhases(matrixData.phases);
    } catch (err) {
      toast.error("Failed to load procurement data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  const toggleRow = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAllocation = (allocId: number) => {
    setSelectedAllocations(prev => ({ ...prev, [allocId]: !prev[allocId] }));
  };

  const handleCreateBOQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boqForm.material_code || !boqForm.total_budgeted_qty || !boqForm.unit_rate) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!projectIntId) {
      toast.error("Project data not loaded yet.");
      return;
    }
    
    setIsProcessing(true);
    try {
      await projectsApi.createBOQItem({
        project: projectIntId,
        material_code: boqForm.material_code,
        total_budgeted_qty: boqForm.total_budgeted_qty,
        unit_rate: boqForm.unit_rate,
        phase: boqForm.phase ? parseInt(boqForm.phase) : null
      });
      toast.success("BOQ Item created successfully!");
      setBoqForm({ material_code: "", total_budgeted_qty: "", unit_rate: "", phase: "" });
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create BOQ Item.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateBOQPhase = async (id: number, newPhase: string) => {
    try {
      await projectsApi.updateBOQItem(id, { phase: newPhase ? parseInt(newPhase) : null });
      toast.success("Phase updated successfully.");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update phase.");
    }
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
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate PO.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintPO = (allocId: number) => {
    // In a real app, this would generate a PDF or open a print view.
    window.print();
    toast.success("PO print dialog opened.");
  };

  const selectedCount = Object.values(selectedAllocations).filter(Boolean).length;
  
  // Filter for Buy Signals tab (only items with REQUISITIONED or ORDERED)
  const signalItems = items.filter(item => 
    parseFloat(item.requisitioned_qty as string) > 0 || parseFloat(item.ordered_qty as string) > 0
  );

  return (
    <div className="flex-1 flex flex-col bg-surface-50 h-full overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 bg-white border-b border-surface-200 shrink-0">
        <div className="flex items-center gap-4">
          <Link 
            href={`/dashboard/projects/${projectId}`}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-100 text-surface-500 hover:bg-primary hover:text-white transition-colors font-bold text-lg"
            title="Back to Project"
          >
            ←
          </Link>
          <div>
            <h1 className="text-2xl font-black text-primary uppercase tracking-tight">PROCUREMENT LEDGER</h1>
            <p className="text-sm font-bold text-surface-500 mt-1">Project-level BOQ Management & Buy Signals</p>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => setActiveTab("BOQ")}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
              activeTab === "BOQ" ? "bg-primary text-white" : "bg-surface-100 text-surface-500 hover:bg-surface-200"
            }`}
          >
            BOQ Builder
          </button>
          <button
            onClick={() => setActiveTab("SIGNALS")}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
              activeTab === "SIGNALS" ? "bg-primary text-white" : "bg-surface-100 text-surface-500 hover:bg-surface-200"
            }`}
          >
            Buy Signals & POs
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {activeTab === "BOQ" && (
            <div className="space-y-6">
              {/* Create BOQ Form */}
              <div className="bg-white p-6 rounded-3xl border border-surface-200 shadow-sm">
                <h2 className="text-lg font-black text-primary uppercase tracking-tight mb-4">Add Estimated BOQ Item</h2>
                <form onSubmit={handleCreateBOQ} className="grid grid-cols-5 gap-4 items-end">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black uppercase text-surface-500 mb-1">Material Code</label>
                    <input 
                      type="text" 
                      required
                      value={boqForm.material_code}
                      onChange={e => setBoqForm({...boqForm, material_code: e.target.value})}
                      className="w-full h-10 px-3 border border-surface-300 rounded-lg text-sm font-bold bg-surface-50 focus:bg-white focus:border-accent outline-none" 
                      placeholder="e.g. CONC-M30"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black uppercase text-surface-500 mb-1">Total Budget Qty</label>
                    <input 
                      type="number" 
                      required
                      value={boqForm.total_budgeted_qty}
                      onChange={e => setBoqForm({...boqForm, total_budgeted_qty: e.target.value})}
                      className="w-full h-10 px-3 border border-surface-300 rounded-lg text-sm font-bold bg-surface-50 focus:bg-white focus:border-accent outline-none" 
                      placeholder="e.g. 500"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black uppercase text-surface-500 mb-1">Unit Rate</label>
                    <input 
                      type="number" 
                      required
                      value={boqForm.unit_rate}
                      onChange={e => setBoqForm({...boqForm, unit_rate: e.target.value})}
                      className="w-full h-10 px-3 border border-surface-300 rounded-lg text-sm font-bold bg-surface-50 focus:bg-white focus:border-accent outline-none" 
                      placeholder="e.g. 120"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black uppercase text-surface-500 mb-1">Target Phase (Optional)</label>
                    <select 
                      value={boqForm.phase}
                      onChange={e => setBoqForm({...boqForm, phase: e.target.value})}
                      className="w-full h-10 px-3 border border-surface-300 rounded-lg text-sm font-bold bg-surface-50 focus:bg-white focus:border-accent outline-none"
                    >
                      <option value="">-- All Phases --</option>
                      {phases.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-1">
                    <button 
                      type="submit" 
                      disabled={isProcessing}
                      className="w-full h-10 bg-accent text-white font-black text-xs uppercase tracking-widest rounded-lg hover:bg-accent/90 disabled:opacity-50"
                    >
                      + Add Item
                    </button>
                  </div>
                </form>
              </div>

              {/* BOQ Table */}
              <div className="bg-white rounded-3xl border border-surface-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-50 border-b border-surface-200 text-[10px] font-black text-surface-400 uppercase tracking-widest">
                        <th className="py-4 px-6 font-black">Material Code</th>
                        <th className="py-4 px-6 font-black">Phase</th>
                        <th className="py-4 px-6 font-black">Budget Qty</th>
                        <th className="py-4 px-6 font-black">Unit Rate</th>
                        <th className="py-4 px-6 font-black">Remaining</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.filter(item => {
                        if (!boqForm.phase) return true; // Show all if no phase selected in form
                        return item.phase == boqForm.phase;
                      }).map((item) => (
                        <tr key={item.id} className="border-b border-surface-100 hover:bg-surface-50">
                          <td className="py-4 px-6 font-extrabold text-primary">{item.material_code}</td>
                          <td className="py-2 px-6 font-bold text-surface-500">
                            <select 
                              value={item.phase || ""}
                              onChange={(e) => handleUpdateBOQPhase(item.id, e.target.value)}
                              className="w-full h-8 px-2 border border-surface-300 rounded-md text-xs font-bold bg-surface-50 focus:bg-white focus:border-accent outline-none"
                            >
                              <option value="">-- Global --</option>
                              {phases.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-4 px-6 font-bold tabular-nums text-surface-600">{item.total_budgeted_qty}</td>
                          <td className="py-4 px-6 font-bold tabular-nums text-surface-600">${item.unit_rate}</td>
                          <td className="py-4 px-6 font-bold tabular-nums text-emerald-600">{item.remaining_budget}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "SIGNALS" && (
            <div className="bg-white rounded-3xl border border-surface-200 shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-10 text-center text-surface-500 font-bold">Loading ledger...</div>
              ) : signalItems.length === 0 ? (
                <div className="p-10 text-center text-surface-500">
                  <p className="text-3xl mb-2">📦</p>
                  <p className="font-bold">No pending buy signals found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-50 border-b border-surface-200 text-[10px] font-black text-surface-400 uppercase tracking-widest">
                        <th className="py-4 px-6 font-black w-8"></th>
                        <th className="py-4 px-6 font-black">BOQ Item</th>
                        <th className="py-4 px-6 font-black">Phase</th>
                        <th className="py-4 px-6 font-black text-amber-600">🔴 REQUISITIONED (Buy Now)</th>
                        <th className="py-4 px-6 font-black text-blue-600">Ordered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {signalItems.map((item) => {
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
                              <td className="py-4 px-6 font-bold text-surface-500">
                                {item.phase ? phases.find(p => p.id == item.phase)?.name || `Phase ${item.phase}` : "Global"}
                              </td>
                              <td className="py-4 px-6 font-black tabular-nums text-amber-600">{item.requisitioned_qty}</td>
                              <td className="py-4 px-6 font-bold tabular-nums text-blue-600">{item.ordered_qty}</td>
                            </tr>

                            {isExpanded && reqOrOrdAllocations.length > 0 && (
                              <tr>
                                <td colSpan={5} className="p-0 border-b border-surface-200">
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
          )}

          {/* Action Footer */}
          {activeTab === "SIGNALS" && selectedCount > 0 && (
            <div className="sticky bottom-8 bg-primary text-white rounded-2xl shadow-2xl p-4 px-6 flex items-center justify-between animate-fade-in border border-surface-200/20">
              <div>
                <p className="text-sm font-bold">{selectedCount} items selected for Purchase Order</p>
                <p className="text-xs text-white/60">Selected allocations will become locked as ORDERED.</p>
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
