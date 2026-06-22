"use client";

import React, { useEffect, useState } from "react";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";
import { useParams } from "next/navigation";

interface EstimationItem {
  item_code: string;
  description: string;
  unit: string;
  total_net_qty: number;
  unit_cost: number;
  total_cost: number;
  composition_mapping?: string | null;
}

interface EstimationSummary {
  items: EstimationItem[];
  grand_total: number;
}

interface EstimationTabProps {
  onPushToBoq?: () => void;
  onSwitchToBoq?: () => void;
}

export default function EstimationTab({ onPushToBoq, onSwitchToBoq }: EstimationTabProps) {
  const params = useParams();
  const projectId = params.id as string;
  const [data, setData] = useState<EstimationSummary | null>(null);
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPushing, setIsPushing] = useState(false);

  // Missing Recipe Flow
  const [missingItems, setMissingItems] = useState<EstimationItem[]>([]);
  const [currentMissingIndex, setCurrentMissingIndex] = useState(0);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [recipeData, setRecipeData] = useState<{
    item_code: string;
    description: string;
    unit: string;
    components: any[];
  }>({ item_code: "", description: "", unit: "", components: [] });
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);
  const [compositionMappings, setCompositionMappings] = useState<Record<string, string>>({});

  const [newComponent, setNewComponent] = useState({
    material_code: "",
    description: "",
    quantity_per_unit: 1,
    unit: "nos",
    waste_percentage: 0,
    default_unit_rate: 0
  });

  // Local state for tracking unsaved edits
  const [editingCosts, setEditingCosts] = useState<Record<string, string>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summary, asms] = await Promise.all([
        projectsApi.getEstimationSummary(projectId),
        projectsApi.getMaterialAssemblies()
      ]);
      setData(summary);
      setAssemblies(asms);
      
      const initialCosts: Record<string, string> = {};
      const initialMappings: Record<string, string> = {};
      const asmCodes = new Set(asms.map(a => a.item_code));

      summary.items.forEach(item => {
        initialCosts[item.item_code] = item.unit_cost.toString();
        if (item.composition_mapping !== undefined && item.composition_mapping !== null) {
          initialMappings[item.item_code] = item.composition_mapping;
        } else {
          initialMappings[item.item_code] = asmCodes.has(item.item_code) ? item.item_code : "";
        }
      });
      setEditingCosts(initialCosts);
      setCompositionMappings(initialMappings);
      
    } catch (err) {
      toast.error("Failed to load estimation summary.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  const executePushToBoq = async () => {
    setIsPushing(true);
    try {
      const res = await projectsApi.pushEstimationToBoq(projectId, compositionMappings);
      toast.success(`Successfully pushed ${res.pushed_items} items to BOQ!`);
      if (onPushToBoq) onPushToBoq();
      if (onSwitchToBoq) onSwitchToBoq();
    } catch (err: any) {
      toast.error("Failed to push to BOQ");
    } finally {
      setIsPushing(false);
      setShowMissingModal(false);
    }
  };

  const handleInitiatePush = () => {
    if (!data) return;
    const missing = data.items.filter(i => compositionMappings[i.item_code] === "");
    
    if (missing.length > 0) {
      setMissingItems(missing);
      setCurrentMissingIndex(0);
      setupRecipeForm(missing[0]);
      setShowMissingModal(true);
    } else {
      if (!confirm("Are you sure you want to push this estimate to the BOQ Builder? Existing items with the same code will be updated.")) return;
      executePushToBoq();
    }
  };

  const setupRecipeForm = (item: EstimationItem) => {
    setRecipeData({
      item_code: item.item_code,
      description: item.description,
      unit: item.unit,
      components: []
    });
  };

  const handleAddComponent = () => {
    if (!newComponent.material_code || !newComponent.description) {
      toast.error("Material code and description are required");
      return;
    }
    setRecipeData(prev => ({
      ...prev,
      components: [...prev.components, { ...newComponent }]
    }));
    setNewComponent({
      material_code: "",
      description: "",
      quantity_per_unit: 1,
      unit: "nos",
      waste_percentage: 0,
      default_unit_rate: 0
    });
  };

  const handleRemoveComponent = (index: number) => {
    setRecipeData(prev => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index)
    }));
  };

  const handleSaveRecipeAndContinue = async () => {
    setIsSavingRecipe(true);
    try {
      // 1. Create the assembly
      const asm = await projectsApi.createMaterialAssembly({
        item_code: recipeData.item_code,
        description: recipeData.description,
        unit: recipeData.unit
      });

      // 2. Create the components
      for (const comp of recipeData.components) {
        await projectsApi.createMaterialAssemblyComponent({
          assembly: asm.id,
          ...comp
        });
      }

      // Add to local state so we know it exists
      setAssemblies(prev => [...prev, asm]);
      setCompositionMappings(prev => ({ ...prev, [recipeData.item_code]: asm.item_code }));

      toast.success(`Recipe saved for ${recipeData.item_code}`);

      // 3. Move to next missing item, or execute push
      if (currentMissingIndex + 1 < missingItems.length) {
        const nextIndex = currentMissingIndex + 1;
        setCurrentMissingIndex(nextIndex);
        setupRecipeForm(missingItems[nextIndex]);
      } else {
        executePushToBoq();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save recipe");
    } finally {
      setIsSavingRecipe(false);
    }
  };

  const handleSkipRecipe = () => {
    if (currentMissingIndex + 1 < missingItems.length) {
      const nextIndex = currentMissingIndex + 1;
      setCurrentMissingIndex(nextIndex);
      setupRecipeForm(missingItems[nextIndex]);
    } else {
      executePushToBoq();
    }
  };

  const handleCostChange = (itemCode: string, value: string) => {
    setEditingCosts(prev => ({ ...prev, [itemCode]: value }));
  };

  const handleCostBlur = async (itemCode: string) => {
    const cost = parseFloat(editingCosts[itemCode]) || 0;
    
    if (data) {
      const newItems = data.items.map(i => {
        if (i.item_code === itemCode) {
          return { ...i, unit_cost: cost, total_cost: cost * i.total_net_qty };
        }
        return i;
      });
      const newTotal = newItems.reduce((acc, i) => acc + i.total_cost, 0);
      setData({ items: newItems, grand_total: newTotal });
    }

    try {
      await projectsApi.updateEstimationPricing(projectId, itemCode, cost);
    } catch (err) {
      toast.error("Failed to save unit cost");
    }
  };

  const handleCompositionChange = async (itemCode: string, value: string) => {
    setCompositionMappings(prev => ({ ...prev, [itemCode]: value }));
    try {
      await projectsApi.updateEstimationMapping(projectId, itemCode, value);
    } catch (err) {
      toast.error("Failed to save composition mapping");
    }
  };

  if (loading && !data) {
    return <div className="p-8 text-center text-surface-500 font-bold">Loading Estimate...</div>;
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="p-16 text-center text-surface-500 bg-white rounded-3xl border border-surface-200">
        <p className="text-4xl mb-4">📐</p>
        <p className="font-black text-xl text-primary">No Take-Off Data Found</p>
        <p className="mt-2 text-sm max-w-md mx-auto">
          Start measuring from your floor plans in the Take-Off tab. The quantities will automatically aggregate here for pricing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-24 relative">
      {/* Missing Recipe Modal Overlay */}
      {showMissingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-surface-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-surface-200 bg-surface-50 shrink-0 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black text-primary uppercase tracking-tight">Missing Recipe Detected</h3>
                <p className="text-sm font-bold text-surface-500 mt-1">
                  Item {currentMissingIndex + 1} of {missingItems.length}: You are pushing <span className="text-accent">{recipeData.item_code}</span> but it has no assembly recipe.
                </p>
              </div>
              <button onClick={() => setShowMissingModal(false)} className="text-surface-400 hover:text-red-500 font-bold text-xl leading-none">×</button>
            </div>
            
            <div className="p-8 flex-1 overflow-y-auto space-y-6">
              <div className="flex justify-between items-center bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <div>
                  <h4 className="font-black text-blue-900">{recipeData.item_code}</h4>
                  <p className="text-sm font-medium text-blue-700">{recipeData.description}</p>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-3">Recipe Components (Per 1 {recipeData.unit})</h4>
                <div className="border border-surface-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-50 text-[10px] uppercase tracking-widest text-surface-500">
                      <tr>
                        <th className="p-4 font-bold">Mat Code</th>
                        <th className="p-4 font-bold">Description</th>
                        <th className="p-4 font-bold w-24">Qty/Unit</th>
                        <th className="p-4 font-bold w-20">Waste %</th>
                        <th className="p-4 font-bold w-24">Unit Cost</th>
                        <th className="p-4 font-bold w-12 text-center">Act</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                      {recipeData.components.map((comp, idx) => (
                        <tr key={idx} className="hover:bg-surface-50">
                          <td className="p-4 font-mono text-primary font-bold">{comp.material_code}</td>
                          <td className="p-4 text-surface-600">{comp.description}</td>
                          <td className="p-4 font-bold">{comp.quantity_per_unit} {comp.unit}</td>
                          <td className="p-4 text-surface-500">{comp.waste_percentage}%</td>
                          <td className="p-4 text-emerald-600 font-bold">₹{comp.default_unit_rate}</td>
                          <td className="p-4 text-center">
                            <button onClick={() => handleRemoveComponent(idx)} className="text-red-400 hover:text-red-600 font-bold">✕</button>
                          </td>
                        </tr>
                      ))}
                      
                      {/* Manual Add Row */}
                      <tr className="bg-surface-50/50">
                        <td className="p-2">
                          <input type="text" placeholder="Code (e.g. CEM)" className="w-full text-xs p-2 rounded border border-surface-200 outline-none focus:border-accent" value={newComponent.material_code} onChange={e => setNewComponent({...newComponent, material_code: e.target.value.toUpperCase()})} />
                        </td>
                        <td className="p-2">
                          <input type="text" placeholder="Material Description" className="w-full text-xs p-2 rounded border border-surface-200 outline-none focus:border-accent" value={newComponent.description} onChange={e => setNewComponent({...newComponent, description: e.target.value})} />
                        </td>
                        <td className="p-2 flex space-x-1">
                          <input type="number" placeholder="Qty" className="w-12 text-xs p-2 rounded border border-surface-200 outline-none focus:border-accent" value={newComponent.quantity_per_unit || ""} onChange={e => setNewComponent({...newComponent, quantity_per_unit: parseFloat(e.target.value) || 0})} />
                          <input type="text" placeholder="Unit" className="w-10 text-xs p-2 rounded border border-surface-200 outline-none focus:border-accent" value={newComponent.unit} onChange={e => setNewComponent({...newComponent, unit: e.target.value})} />
                        </td>
                        <td className="p-2">
                          <input type="number" placeholder="0%" className="w-full text-xs p-2 rounded border border-surface-200 outline-none focus:border-accent" value={newComponent.waste_percentage || ""} onChange={e => setNewComponent({...newComponent, waste_percentage: parseFloat(e.target.value) || 0})} />
                        </td>
                        <td className="p-2">
                          <input type="number" placeholder="₹0.00" className="w-full text-xs p-2 rounded border border-surface-200 outline-none focus:border-accent" value={newComponent.default_unit_rate || ""} onChange={e => setNewComponent({...newComponent, default_unit_rate: parseFloat(e.target.value) || 0})} />
                        </td>
                        <td className="p-2 text-center">
                          <button onClick={handleAddComponent} className="bg-surface-200 hover:bg-surface-300 text-surface-700 px-2 py-1.5 rounded text-xs font-bold w-full">+</button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-surface-200 bg-surface-50 shrink-0 flex justify-between items-center">
              <button 
                onClick={handleSkipRecipe}
                disabled={isSavingRecipe || isPushing}
                className="text-surface-500 hover:text-surface-800 text-xs font-black uppercase tracking-widest px-4 py-2"
              >
                Skip (Push as Single Item)
              </button>
              
              <button 
                onClick={handleSaveRecipeAndContinue}
                disabled={isSavingRecipe || isPushing || recipeData.components.length === 0}
                className="bg-primary text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-accent transition-all disabled:opacity-50"
              >
                {isSavingRecipe ? "Saving..." : "Save Recipe & Continue"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-6 rounded-3xl border border-surface-200 shadow-sm gap-4">
        <div>
          <h2 className="text-lg font-black text-primary uppercase tracking-tight">Master Estimate</h2>
          <p className="text-xs text-surface-500 font-bold mt-1">Aggregated quantities from all floor plans</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-surface-50 border border-surface-200 p-1 rounded-xl flex">
            <button
              onClick={() => projectsApi.exportProjectData(projectId, "estimations", "excel", "flat")}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-surface-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
              title="Export Flat Excel"
            >
              📊 Excel (Flat)
            </button>
            <button
              onClick={() => projectsApi.exportProjectData(projectId, "estimations", "excel", "floor_plan")}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-surface-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
              title="Export Grouped Excel"
            >
              📑 Excel (Grouped)
            </button>
            <div className="w-px bg-surface-200 mx-1 my-1" />
            <button
              onClick={() => projectsApi.exportProjectData(projectId, "estimations", "pdf", "flat")}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-surface-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
              title="Export Flat PDF"
            >
              📄 PDF (Flat)
            </button>
            <button
              onClick={() => projectsApi.exportProjectData(projectId, "estimations", "pdf", "floor_plan")}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-surface-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
              title="Export Grouped PDF"
            >
              🖨️ PDF (Grouped)
            </button>
          </div>
          <button
            onClick={handleInitiatePush}
            disabled={isPushing}
            className="bg-accent text-white px-6 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-accent-dark transition-all shadow-md disabled:opacity-50"
          >
            {isPushing ? "Pushing..." : "Push Estimate to BOQ ↗"}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-3xl border border-surface-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200 text-[10px] font-black text-surface-400 uppercase tracking-widest">
                <th className="py-4 px-6 w-32">Item Code</th>
                <th className="py-4 px-6">Description</th>
                <th className="py-4 px-6 w-48">Composition</th>
                <th className="py-4 px-6 w-32 text-right">Total Net Qty</th>
                <th className="py-4 px-6 w-16">Unit</th>
                <th className="py-4 px-6 w-40 text-right">Unit Cost (₹)</th>
                <th className="py-4 px-6 w-48 text-right text-emerald-600">Total Cost (₹)</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={`${item.item_code}-${index}`} className="border-b border-surface-100 hover:bg-surface-50 group">
                  <td className="py-2 px-6 font-black text-primary text-sm">{item.item_code}</td>
                  <td className="py-2 px-6 font-bold text-surface-600 text-sm truncate max-w-xs" title={item.description}>
                    {item.description}
                  </td>
                  <td className="py-2 px-6">
                    <select
                      className="w-full text-xs p-2 rounded border border-surface-200 outline-none focus:border-accent bg-surface-50 font-bold text-surface-600"
                      value={compositionMappings[item.item_code] ?? ""}
                      onChange={(e) => handleCompositionChange(item.item_code, e.target.value)}
                    >
                      <option value="">-- None (1:1 Item) --</option>
                      {assemblies.map(asm => (
                        <option key={asm.item_code} value={asm.item_code}>{asm.item_code}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-6 font-black tabular-nums text-right text-surface-800 text-sm">
                    {item.total_net_qty}
                  </td>
                  <td className="py-2 px-6 font-bold text-surface-400 text-xs">
                    {item.unit}
                  </td>
                  <td className="py-2 px-6">
                    <div className="relative flex items-center justify-end">
                      <span className="absolute left-3 text-surface-400 font-bold text-xs pointer-events-none">₹</span>
                      <input 
                        type="number"
                        value={editingCosts[item.item_code] || ""}
                        onChange={(e) => handleCostChange(item.item_code, e.target.value)}
                        onBlur={() => handleCostBlur(item.item_code)}
                        className="w-full h-9 pl-7 pr-3 text-right border border-surface-200 rounded-lg text-sm font-black text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all group-hover:bg-white"
                        placeholder="0.00"
                      />
                    </div>
                  </td>
                  <td className="py-2 px-6 font-black tabular-nums text-right text-emerald-600 text-base">
                    ₹{item.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-[260px] right-0 bg-white border-t border-surface-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] p-4 px-12 z-20 flex justify-between items-center pointer-events-none">
        <div className="pointer-events-auto">
          <p className="text-[10px] font-black uppercase tracking-widest text-surface-500">Project Master Estimate</p>
        </div>
        <div className="pointer-events-auto text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-0.5">Grand Total Estimated Cost</p>
          <p className="text-3xl font-black text-emerald-600 tabular-nums tracking-tight">
            ₹{data.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </div>
  );
}
