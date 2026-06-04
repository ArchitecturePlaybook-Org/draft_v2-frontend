"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ProcurementAggregatorItem, MilestonePhase, ProjectDetail } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";
import TakeOffTab from "@/components/procurement/TakeOffTab";
import EstimationTab from "@/components/procurement/EstimationTab";
import { MaterialAssemblyManager } from "@/components/procurement/MaterialAssemblyManager";

export default function ProcurementDashboard() {
  const params = useParams();
  const projectId = params.id as string;

  const [activeTab, setActiveTab] = useState<"TAKE_OFF" | "ESTIMATION" | "BOQ" | "ASSEMBLIES" | "TRACKING">("TAKE_OFF");
  
  const [items, setItems] = useState<ProcurementAggregatorItem[]>([]);
  const [phases, setPhases] = useState<MilestonePhase[]>([]);
  const [projectAssets, setProjectAssets] = useState<any[]>([]);
  const [projectIntId, setProjectIntId] = useState<number | null>(null);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Record<string | number, boolean>>({});
  const [selectedAllocations, setSelectedAllocations] = useState<Record<number, boolean>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // BOQ Phase Filter
  const [boqPhaseFilter, setBoqPhaseFilter] = useState<string>("");
  
  const [boqViewMode, setBoqViewMode] = useState<"assembly" | "material">("assembly");
  
  const [subItemForm, setSubItemForm] = useState<Record<number, {material_code: string, description: string, quantity: string, unit_rate: string}>>({});

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
      setProject(projectData);
      setPhases(matrixData.phases);
      setProjectAssets(projectData.assets || []);
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

  const toggleRow = (id: number | string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAllocation = (allocId: number) => {
    setSelectedAllocations(prev => ({ ...prev, [allocId]: !prev[allocId] }));
  };



  const handleUpdateBOQPhase = async (id: number, newPhase: string) => {
    try {
      await projectsApi.updateBOQItem(id, { phase: newPhase ? parseInt(newPhase) : null });
      toast.success("Updated BOQ Item phase.");
      await fetchData();
    } catch (err: any) {
      toast.error("Failed to update phase.");
    }
  };

  const handleAddSubItem = async (e: React.FormEvent, parentId: number) => {
    e.preventDefault();
    const form = subItemForm[parentId];
    if (!form || !form.material_code || !form.quantity || !form.unit_rate) {
      toast.error("Please fill in required fields for the sub-item.");
      return;
    }
    setIsProcessing(true);
    try {
      await projectsApi.createBOQSubItem({
        parent: parentId,
        material_code: form.material_code,
        description: form.description || "",
        quantity: form.quantity,
        unit_rate: form.unit_rate
      });
      toast.success("Sub-item added successfully!");
      setSubItemForm(prev => ({...prev, [parentId]: {material_code: "", description: "", quantity: "", unit_rate: ""}}));
      await fetchData();
    } catch (err: any) {
      toast.error("Failed to add sub-item");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSubItem = async (subItemId: number) => {
    if (!confirm("Are you sure you want to delete this sub-item?")) return;
    try {
      await projectsApi.deleteBOQSubItem(subItemId);
      toast.success("Sub-item deleted.");
      await fetchData();
    } catch (err: any) {
      toast.error("Failed to delete sub-item.");
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
  


  // Material-Centric Grouping logic
  const groupedMaterials = React.useMemo(() => {
    const groups: Record<string, any> = {};
    
    items.forEach(boqItem => {
      // Respect the existing Phase filter
      if (boqPhaseFilter && boqItem.phase?.toString() !== boqPhaseFilter) return;

      boqItem.sub_items?.forEach(sub => {
        const code = sub.material_code;
        if (!groups[code]) {
          groups[code] = {
            material_code: code,
            description: sub.description,
            unit_rate: Number(sub.unit_rate),
            total_quantity: 0,
            total_cost: 0,
            parent_assemblies: []
          };
        }
        
        const qty = Number(sub.quantity);
        const cost = qty * (1 + (Number(sub.waste_percentage) || 0) / 100) * Number(sub.unit_rate);
        
        groups[code].total_quantity += qty;
        groups[code].total_cost += cost;
        groups[code].parent_assemblies.push({
          parent_id: boqItem.id,
          parent_code: boqItem.material_code,
          quantity: qty,
          cost: cost
        });
      });
    });
    
    return Object.values(groups).sort((a, b) => b.total_cost - a.total_cost);
  }, [items, boqPhaseFilter]);

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
            onClick={() => setActiveTab("TAKE_OFF")}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
              activeTab === "TAKE_OFF" ? "bg-primary text-white" : "bg-surface-100 text-surface-500 hover:bg-surface-200"
            }`}
          >
            Take-Off
          </button>
          <button
            onClick={() => setActiveTab("ESTIMATION")}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
              activeTab === "ESTIMATION" ? "bg-primary text-white" : "bg-surface-100 text-surface-500 hover:bg-surface-200"
            }`}
          >
            Estimation
          </button>
          <button
            onClick={() => setActiveTab("ASSEMBLIES")}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
              activeTab === "ASSEMBLIES" ? "bg-primary text-white" : "bg-surface-100 text-surface-500 hover:bg-surface-200"
            }`}
          >
            Composition
          </button>
          <button
            onClick={() => setActiveTab("BOQ")}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
              activeTab === "BOQ" ? "bg-primary text-white" : "bg-surface-100 text-surface-500 hover:bg-surface-200"
            }`}
          >
            BOQ Builder
          </button>
          <button
            onClick={() => setActiveTab("TRACKING")}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
              activeTab === "TRACKING" ? "bg-primary text-white" : "bg-surface-100 text-surface-500 hover:bg-surface-200"
            }`}
          >
            Procurement & Tracking
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {activeTab === "BOQ" && (
            <div className="space-y-6">
              {/* BOQ Table Header & Toggle */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-black text-primary tracking-tight">Bill of Quantities</h3>
                  <select
                    value={boqPhaseFilter}
                    onChange={e => setBoqPhaseFilter(e.target.value)}
                    className="h-8 px-2 border border-surface-300 rounded-md text-xs font-bold bg-white text-surface-500 focus:border-accent outline-none"
                  >
                    <option value="">-- All Phases --</option>
                    {phases.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex bg-surface-100 p-1 rounded-lg">
                  <button
                    onClick={() => setBoqViewMode('assembly')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${boqViewMode === 'assembly' ? 'bg-white text-primary shadow-sm' : 'text-surface-500 hover:text-primary'}`}
                  >
                    Assembly View
                  </button>
                  <button
                    onClick={() => setBoqViewMode('material')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${boqViewMode === 'material' ? 'bg-white text-primary shadow-sm' : 'text-surface-500 hover:text-primary'}`}
                  >
                    Raw Material View
                  </button>
                </div>
              </div>

              {/* BOQ Table */}
              <div className="bg-white rounded-3xl border border-surface-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    {boqViewMode === 'assembly' ? (
                      <>
                        <thead>
                          <tr className="bg-surface-50 border-b border-surface-200 text-[10px] font-black text-surface-400 uppercase tracking-widest">
                            <th className="py-4 px-6 font-black w-8"></th>
                            <th className="py-4 px-6 font-black">Material Code</th>
                            <th className="py-4 px-6 font-black">Phase</th>
                            <th className="py-4 px-6 font-black">Budget Qty</th>
                            <th className="py-4 px-6 font-black">Unit Rate</th>
                            <th className="py-4 px-6 font-black">Remaining</th>
                          </tr>
                        </thead>
                        <tbody>
                      {items.filter(item => {
                        if (!boqPhaseFilter) return true; // Show all if no phase selected in form
                        return item.phase?.toString() === boqPhaseFilter;
                      }).map((item) => {
                        const isExpanded = expandedRows[item.id];
                        const sForm = subItemForm[item.id] || {material_code: "", description: "", quantity: "", unit_rate: ""};
                        
                        return (
                        <React.Fragment key={item.id}>
                          <tr className={`border-b border-surface-100 hover:bg-surface-50 ${isExpanded ? "bg-surface-50" : ""}`}>
                            <td className="py-4 px-6">
                              <button 
                                onClick={() => toggleRow(item.id)}
                                className="w-6 h-6 rounded-md bg-surface-200 text-surface-600 flex items-center justify-center hover:bg-accent hover:text-white transition-all font-bold"
                              >
                                {isExpanded ? "v" : ">"}
                              </button>
                            </td>
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
                            <td className="py-4 px-6 font-bold tabular-nums text-surface-600">₹{item.unit_rate}</td>
                            <td className="py-4 px-6 font-bold tabular-nums text-emerald-600">₹{item.remaining_budget}</td>
                          </tr>
                          
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="p-0 border-b border-surface-200">
                                <div className="bg-surface-100/50 px-14 py-4 border-l-4 border-accent">
                                  <h4 className="text-[10px] font-black uppercase text-surface-500 mb-2">Detailed Breakdown</h4>
                                  <table className="w-full text-left bg-white rounded-lg border border-surface-200 overflow-hidden mb-4">
                                    <thead className="bg-surface-50 border-b border-surface-200">
                                      <tr>
                                        <th className="py-2 px-3 text-[10px] font-black text-surface-400 uppercase w-[20%]">Sub Material Code</th>
                                        <th className="py-2 px-3 text-[10px] font-black text-surface-400 uppercase w-[30%]">Description</th>
                                        <th className="py-2 px-3 text-[10px] font-black text-surface-400 uppercase w-[15%]">Qty / Unit</th>
                                        <th className="py-2 px-3 text-[10px] font-black text-surface-400 uppercase w-[15%]">Unit Cost</th>
                                        <th className="py-2 px-3 text-[10px] font-black text-surface-400 uppercase w-[15%] text-right">Total Cost</th>
                                        <th className="py-2 px-3 text-[10px] font-black text-surface-400 uppercase text-right w-[5%]"></th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {item.sub_items?.map(sub => (
                                        <tr key={sub.id} className="border-b border-surface-100 last:border-0 hover:bg-surface-50 transition-colors">
                                          <td className="py-2 px-3 font-bold text-sm text-primary">{sub.material_code}</td>
                                          <td className="py-2 px-3 text-xs font-medium text-surface-500">{sub.description || "-"}</td>
                                          <td className="py-2 px-3 font-black text-sm tabular-nums text-surface-600">{sub.quantity}</td>
                                          <td className="py-2 px-3 font-bold text-sm tabular-nums text-surface-600">₹{sub.unit_rate}</td>
                                          <td className="py-2 px-3 font-black text-sm tabular-nums text-emerald-600 text-right">
                                            ₹{(Number(sub.quantity) * (1 + (Number(sub.waste_percentage) || 0) / 100) * Number(sub.unit_rate)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </td>
                                          <td className="py-2 px-3 text-right">
                                            <button onClick={() => handleDeleteSubItem(sub.id)} className="w-6 h-6 rounded text-surface-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors text-lg leading-none" title="Delete Row">×</button>
                                          </td>
                                        </tr>
                                      ))}
                                      
                                      {/* Ghost Row for adding new sub-item */}
                                      <tr 
                                        className="bg-surface-50 border-t border-surface-200"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddSubItem(e as any, item.id);
                                          }
                                        }}
                                      >
                                        <td className="p-1">
                                          <input 
                                            type="text" 
                                            value={sForm.material_code} 
                                            onChange={e => setSubItemForm(prev => ({...prev, [item.id]: {...sForm, material_code: e.target.value}}))} 
                                            className="w-full h-8 px-2 bg-transparent border border-transparent hover:border-surface-300 focus:border-accent focus:bg-white rounded text-sm font-bold outline-none transition-all" 
                                            placeholder="Code *" 
                                          />
                                        </td>
                                        <td className="p-1">
                                          <input 
                                            type="text" 
                                            value={sForm.description} 
                                            onChange={e => setSubItemForm(prev => ({...prev, [item.id]: {...sForm, description: e.target.value}}))} 
                                            className="w-full h-8 px-2 bg-transparent border border-transparent hover:border-surface-300 focus:border-accent focus:bg-white rounded text-sm font-bold outline-none transition-all" 
                                            placeholder="Description" 
                                          />
                                        </td>
                                        <td className="p-1">
                                          <input 
                                            type="number" step="any" 
                                            value={sForm.quantity} 
                                            onChange={e => setSubItemForm(prev => ({...prev, [item.id]: {...sForm, quantity: e.target.value}}))} 
                                            className="w-full h-8 px-2 bg-transparent border border-transparent hover:border-surface-300 focus:border-accent focus:bg-white rounded text-sm font-bold outline-none transition-all" 
                                            placeholder="Qty *" 
                                          />
                                        </td>
                                        <td className="p-1">
                                          <input 
                                            type="number" step="any" 
                                            value={sForm.unit_rate} 
                                            onChange={e => setSubItemForm(prev => ({...prev, [item.id]: {...sForm, unit_rate: e.target.value}}))} 
                                            className="w-full h-8 px-2 bg-transparent border border-transparent hover:border-surface-300 focus:border-accent focus:bg-white rounded text-sm font-bold outline-none transition-all" 
                                            placeholder="Cost *" 
                                          />
                                        </td>
                                        <td className="p-1 text-right text-surface-400 font-bold text-sm pr-4">
                                          ₹{((Number(sForm.quantity) || 0) * (Number(sForm.unit_rate) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-1 text-right pr-2">
                                          <button 
                                            onClick={(e) => handleAddSubItem(e as any, item.id)} 
                                            disabled={isProcessing} 
                                            className="px-3 h-7 rounded bg-primary text-white text-[10px] font-black uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50"
                                          >
                                            Add
                                          </button>
                                        </td>
                                      </tr>
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
                    </>
                    ) : (
                      <>
                        <thead>
                          <tr className="bg-surface-50 border-b border-surface-200 text-[10px] font-black text-surface-400 uppercase tracking-widest">
                            <th className="py-4 px-6 font-black w-8"></th>
                            <th className="py-4 px-6 font-black">Raw Material Code</th>
                            <th className="py-4 px-6 font-black">Description</th>
                            <th className="py-4 px-6 font-black text-right">Total Quantity</th>
                            <th className="py-4 px-6 font-black text-right">Unit Cost</th>
                            <th className="py-4 px-6 font-black text-emerald-600 text-right">Total Est. Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupedMaterials.map((material, idx) => {
                            const isExpanded = expandedRows[`mat_${material.material_code}`];
                            return (
                              <React.Fragment key={material.material_code}>
                                <tr className={`border-b border-surface-100 hover:bg-surface-50 ${isExpanded ? "bg-surface-50" : ""}`}>
                                  <td className="py-4 px-6">
                                    <button 
                                      onClick={() => toggleRow(`mat_${material.material_code}`)}
                                      className="w-6 h-6 rounded-md bg-surface-200 text-surface-600 flex items-center justify-center hover:bg-accent hover:text-white transition-all font-bold"
                                    >
                                      {isExpanded ? "v" : ">"}
                                    </button>
                                  </td>
                                  <td className="py-4 px-6 font-extrabold text-primary">{material.material_code}</td>
                                  <td className="py-4 px-6 font-bold text-surface-500">{material.description || "-"}</td>
                                  <td className="py-4 px-6 font-black tabular-nums text-surface-600 text-right">{material.total_quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  <td className="py-4 px-6 font-bold tabular-nums text-surface-600 text-right">₹{material.unit_rate}</td>
                                  <td className="py-4 px-6 font-black tabular-nums text-emerald-600 text-right">₹{material.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                                {isExpanded && (
                                  <tr>
                                    <td colSpan={6} className="p-0 border-b border-surface-200">
                                      <div className="bg-surface-100/50 px-14 py-4 border-l-4 border-emerald-500">
                                        <h4 className="text-[10px] font-black uppercase text-surface-500 mb-2">Used In Assemblies</h4>
                                        <table className="w-full text-left bg-white rounded-lg border border-surface-200 overflow-hidden mb-4">
                                          <thead className="bg-surface-50 border-b border-surface-200">
                                            <tr>
                                              <th className="py-2 px-3 text-[10px] font-black text-surface-400 uppercase w-[40%]">Parent Assembly</th>
                                              <th className="py-2 px-3 text-[10px] font-black text-surface-400 uppercase w-[30%] text-right">Qty Contributed</th>
                                              <th className="py-2 px-3 text-[10px] font-black text-surface-400 uppercase w-[30%] text-right">Cost Contributed</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {material.parent_assemblies.map((parent: any, pIdx: number) => (
                                              <tr key={pIdx} className="border-b border-surface-100 last:border-0 hover:bg-surface-50 transition-colors">
                                                <td className="py-2 px-3 font-bold text-sm text-primary">{parent.parent_code}</td>
                                                <td className="py-2 px-3 font-black text-sm tabular-nums text-surface-600 text-right">{parent.quantity}</td>
                                                <td className="py-2 px-3 font-bold text-sm tabular-nums text-emerald-600 text-right">₹{parent.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
                      </>
                    )}
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "TRACKING" && (
            <div className="bg-white rounded-3xl border border-surface-200 shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-10 text-center text-surface-500 font-bold">Loading ledger...</div>
              ) : items.length === 0 ? (
                <div className="p-10 text-center text-surface-500">
                  <p className="font-bold">No material items found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-50 border-b border-surface-200 text-[10px] font-black text-surface-400 uppercase tracking-widest">
                        <th className="py-4 px-6 font-black w-8"></th>
                        <th className="py-4 px-6 font-black">BOQ Item</th>
                        <th className="py-4 px-6 font-black">Phase</th>
                        <th className="py-4 px-6 font-black">Remaining Qty</th>
                        <th className="py-4 px-6 font-black text-amber-600">🔴 Requisitioned</th>
                        <th className="py-4 px-6 font-black text-blue-600">🔵 Ordered</th>
                        <th className="py-4 px-6 font-black">Allocations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const isExpanded = expandedRows[item.id];
                        const allocations = item.allocations || [];
                        const anomalyCount = allocations.filter(a => a.is_anomaly).length;

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
                              <td className="py-4 px-6 font-black tabular-nums text-emerald-600">
                                {item.remaining_phase_qty ?? item.remaining_budget}
                              </td>
                              <td className="py-4 px-6 font-black tabular-nums text-amber-600">{item.requisitioned_qty}</td>
                              <td className="py-4 px-6 font-bold tabular-nums text-blue-600">{item.ordered_qty}</td>
                              <td className="py-4 px-6 font-bold tabular-nums">
                                {allocations.length} {anomalyCount > 0 && <span className="text-red-500 ml-2">({anomalyCount} Anomalies 🚨)</span>}
                              </td>
                            </tr>

                            {isExpanded && allocations.length > 0 && (
                              <tr>
                                <td colSpan={7} className="p-0 border-b border-surface-200">
                                  <div className="bg-surface-50/50 px-14 py-4 border-l-4 border-surface-300">
                                    <table className="w-full text-left">
                                      <thead>
                                        <tr className="text-[10px] text-surface-400 uppercase tracking-widest font-black border-b border-surface-200">
                                          <th className="pb-2 px-4">Task</th>
                                          <th className="pb-2 px-4">Target Qty</th>
                                          <th className="pb-2 px-4">Actual Qty</th>
                                          <th className="pb-2 px-4">Status / Action</th>
                                          <th className="pb-2 px-4">Total Cost</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {allocations.map(alloc => (
                                          <React.Fragment key={alloc.id}>
                                            <tr className={`border-b border-surface-100 hover:bg-white transition-colors ${alloc.is_anomaly ? "bg-red-50/50" : ""}`}>
                                              <td className="py-3 px-4 font-bold text-sm text-primary flex items-center gap-2">
                                                <span className="text-surface-400">↳</span>
                                                {alloc.task_zone_name ? `${alloc.task_zone_name} (${alloc.task_title})` : alloc.task_title}
                                                {alloc.req_status === "REQUISITIONED" && (
                                                  <span className="text-[10px] font-bold text-surface-400 ml-2">
                                                    (Req {alloc.expected_on_site_by || "ASAP"})
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-3 px-4 font-black tabular-nums text-surface-600 w-32">
                                                {alloc.allocated_qty}
                                              </td>
                                              <td className={`py-3 px-4 font-black tabular-nums w-32 ${alloc.is_anomaly ? "text-red-600" : "text-emerald-600"}`}>
                                                {alloc.is_logged ? alloc.actual_consumed_qty : "—"}
                                              </td>
                                              <td className="py-3 px-4 w-56 flex items-center gap-2">
                                                {alloc.is_logged ? (
                                                  alloc.is_anomaly ? (
                                                    <span className="px-2 py-1 text-[9px] font-black uppercase rounded bg-red-100 text-red-600">🚨 Anomaly</span>
                                                  ) : (
                                                    <span className="px-2 py-1 text-[9px] font-black uppercase rounded bg-emerald-100 text-emerald-600">✅ Logged</span>
                                                  )
                                                ) : alloc.req_status === "ORDERED" ? (
                                                  <>
                                                    <span className="px-2 py-1 text-[9px] font-black uppercase rounded bg-blue-100 text-blue-600">🔵 Ordered</span>
                                                    <button
                                                      onClick={() => handlePrintPO(alloc.id)}
                                                      className="flex items-center gap-1 px-2 py-1 bg-surface-200 text-surface-600 text-[9px] font-black uppercase tracking-widest rounded hover:bg-blue-100 hover:text-blue-600 transition-colors"
                                                    >
                                                      🖨️ Print
                                                    </button>
                                                  </>
                                                ) : alloc.req_status === "REQUISITIONED" ? (
                                                  <label className="flex items-center gap-2 cursor-pointer group bg-amber-50 px-2 py-1 rounded">
                                                    <input 
                                                      type="checkbox" 
                                                      checked={!!selectedAllocations[alloc.id]}
                                                      onChange={() => toggleAllocation(alloc.id)}
                                                      className="w-4 h-4 rounded border-surface-300 accent-accent cursor-pointer"
                                                    />
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 group-hover:text-primary">Buy Now</span>
                                                  </label>
                                                ) : (
                                                  <span className="px-2 py-1 text-[9px] font-black uppercase rounded bg-surface-200 text-surface-600">⏳ Pending</span>
                                                )}
                                              </td>
                                              <td className="py-3 px-4 w-32 font-bold text-emerald-600">
                                                {alloc.logs && alloc.logs.length > 0 ? (
                                                  `$${alloc.logs.reduce((sum, log) => sum + parseFloat(log.total_cost as string), 0).toFixed(2)}`
                                                ) : "—"}
                                              </td>
                                            </tr>
                                            {alloc.logs && alloc.logs.length > 0 && (
                                              <tr className="bg-surface-50 border-b border-surface-100">
                                                <td colSpan={5} className="py-2 px-8">
                                                  <div className="space-y-1">
                                                    {alloc.logs.map(log => (
                                                      <div key={log.id} className="text-[10px] flex items-center gap-4 text-surface-500 font-medium">
                                                        <span className="w-24 border-r border-surface-200">{new Date(log.created_at).toLocaleDateString()}</span>
                                                        <span className="w-24 border-r border-surface-200">Qty: {log.consumed_qty}</span>
                                                        <span className="w-24 border-r border-surface-200">Cost: ${log.total_cost}</span>
                                                        <span>
                                                          {log.receipt ? (
                                                            <a href={log.receipt} target="_blank" rel="noreferrer" className="text-accent underline hover:text-primary">View Proof</a>
                                                          ) : "No Receipt"}
                                                        </span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </td>
                                              </tr>
                                            )}
                                          </React.Fragment>
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

          {activeTab === "TAKE_OFF" && (
            <TakeOffTab 
              projectUid={projectId}
              projectAssets={projectAssets} 
              initialUnitSystem={project?.unit_system || "metric"} 
            />
          )}

          {activeTab === "ESTIMATION" && (
            <EstimationTab onPushToBoq={fetchData} onSwitchToBoq={() => setActiveTab("BOQ")} />
          )}

          {activeTab === "ASSEMBLIES" && (
            <div className="bg-white rounded-3xl border border-surface-200 shadow-sm p-6">
              <MaterialAssemblyManager />
            </div>
          )}

          {/* Action Footer */}
          {activeTab === "TRACKING" && selectedCount > 0 && (
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
