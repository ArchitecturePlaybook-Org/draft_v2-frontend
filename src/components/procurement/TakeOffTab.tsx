"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";
import { ProjectAsset } from "@/types/projects";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { FloorPlanAnalyzerCanvas } from "./FloorPlanAnalyzerCanvas";

interface TakeOffTabProps {
  projectUid: string;
  projectAssets: ProjectAsset[];
  initialUnitSystem?: "metric" | "imperial";
}

type UnitSystem = "metric" | "imperial";

interface EstimationRow {
  id?: number;
  floor_plan: number;
  item_code: string;
  description: string;
  unit: string;
  no_of_items: string;
  length: string;
  width: string;
  depth_height: string;
  gross_qty: string;
  is_deduction: boolean;
  net_qty: string;
}

// Unit label maps for each system
const UNIT_LABELS: Record<UnitSystem, { linear: string; area: string; volume: string }> = {
  metric:   { linear: "m",   area: "sq m",   volume: "cu m"   },
  imperial: { linear: "ft",  area: "sq ft",  volume: "cu ft"  },
};

// Helper for calculation
const calculateQuantities = (row: Partial<EstimationRow>, unitSystem: UnitSystem = "metric") => {
  const no = parseFloat(row.no_of_items || "1") || 1;
  const l = parseFloat(row.length || "");
  const w = parseFloat(row.width || "");
  const d = parseFloat(row.depth_height || "");

  const hasL = !isNaN(l);
  const hasW = !isNaN(w);
  const hasD = !isNaN(d);

  const labels = UNIT_LABELS[unitSystem];
  let unit = "pcs";
  let gross = no;

  if (hasL && hasW && hasD) {
    unit = labels.volume;
    gross = no * l * w * d;
  } else if (hasL && hasW) {
    unit = labels.area;
    gross = no * l * w;
  } else if (hasL) {
    unit = labels.linear;
    gross = no * l;
  } else {
    gross = no;
  }

  const net = row.is_deduction ? -gross : gross;

  return {
    unit,
    gross_qty: gross.toFixed(2),
    net_qty: net.toFixed(2)
  };
};


// Custom hook for debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// Editable Row Component
const EditableRow = ({ 
  initialData, 
  onSave, 
  onDelete, 
  isGhost = false,
  unitSystem = "metric"
}: { 
  initialData: EstimationRow, 
  onSave: (data: EstimationRow) => Promise<boolean>, 
  onDelete?: (id: number) => void,
  isGhost?: boolean,
  unitSystem?: UnitSystem
}) => {
  const [rowData, setRowData] = useState<EstimationRow>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  
  const debouncedRowData = useDebounce(rowData, 800);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Auto-calculation on every change
  const handleChange = (field: keyof EstimationRow, value: any) => {
    const newData = { ...rowData, [field]: value };
    const { unit, gross_qty, net_qty } = calculateQuantities(newData, unitSystem);
    setRowData({ ...newData, unit, gross_qty, net_qty });
    setIsDirty(true);
  };

  // Auto-save logic for existing rows
  useEffect(() => {
    if (!isGhost && isDirty && debouncedRowData.item_code && debouncedRowData.description) {
      triggerSave(debouncedRowData);
    }
  }, [debouncedRowData, isGhost]);

  const triggerSave = async (dataToSave: EstimationRow) => {
    if (!dataToSave.item_code || !dataToSave.description) {
      if (!isGhost) toast.error("Item Code & Description required");
      return;
    }
    setIsSaving(true);
    const success = await onSave(dataToSave);
    setIsSaving(false);
    if (success) {
      setIsDirty(false);
      if (isGhost) {
        // Reset ghost row after successful save
        setRowData({
          floor_plan: initialData.floor_plan,
          item_code: "", description: "", no_of_items: "1", length: "", width: "", depth_height: "",
          gross_qty: "1.00", is_deduction: false, net_qty: "1.00", unit: "pcs"
        });
        if (firstInputRef.current) firstInputRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      triggerSave(rowData);
    }
  };

  const inputClass = "w-full h-8 px-2 bg-transparent border border-transparent hover:border-surface-300 focus:border-accent focus:bg-white focus:ring-1 focus:ring-accent rounded text-sm font-bold outline-none transition-all";

  return (
    <tr className={`border-b border-surface-200 transition-colors ${isGhost ? 'bg-surface-50' : (rowData.is_deduction ? 'bg-red-50/20' : 'bg-white hover:bg-surface-50')}`} onKeyDown={handleKeyDown}>
      <td className="p-1 w-[12%]">
        <input 
          ref={firstInputRef}
          type="text" 
          value={rowData.item_code} 
          onChange={e => handleChange('item_code', e.target.value)} 
          placeholder="Code *"
          className={inputClass} 
        />
      </td>
      <td className="p-1 w-[20%]">
        <input 
          type="text" 
          value={rowData.description} 
          onChange={e => handleChange('description', e.target.value)} 
          placeholder="Description *"
          className={inputClass} 
        />
      </td>
      <td className="p-1 w-[10%]">
        <select 
          value={rowData.is_deduction ? "deduct" : "add"}
          onChange={e => handleChange('is_deduction', e.target.value === "deduct")}
          className={`w-full h-8 px-1 bg-transparent border border-transparent hover:border-surface-300 focus:border-accent focus:bg-white rounded text-xs font-bold outline-none cursor-pointer ${rowData.is_deduction ? 'text-red-600' : 'text-emerald-600'}`}
        >
          <option value="add">[+] Add</option>
          <option value="deduct">[-] Deduct</option>
        </select>
      </td>
      <td className="p-1 w-[8%]">
        <input 
          type="number" step="0.01" 
          value={rowData.no_of_items} 
          onChange={e => handleChange('no_of_items', e.target.value)} 
          className={`${inputClass} text-center`} 
        />
      </td>
      <td className="p-1 w-[9%]">
        <input 
          type="number" step="0.01" 
          value={rowData.length || ""} 
          onChange={e => handleChange('length', e.target.value)} 
          placeholder="L"
          className={`${inputClass} text-right`} 
        />
      </td>
      <td className="p-1 w-[9%]">
        <input 
          type="number" step="0.01" 
          value={rowData.width || ""} 
          onChange={e => handleChange('width', e.target.value)} 
          placeholder="W"
          className={`${inputClass} text-right`} 
        />
      </td>
      <td className="p-1 w-[9%]">
        <input 
          type="number" step="0.01" 
          value={rowData.depth_height || ""} 
          onChange={e => handleChange('depth_height', e.target.value)} 
          placeholder="D"
          className={`${inputClass} text-right`} 
        />
      </td>
      <td className="p-1 w-[12%] text-right px-3">
        <span className={`text-sm font-black ${rowData.is_deduction ? 'text-red-600' : 'text-emerald-600'}`}>
          {rowData.net_qty} {rowData.unit}
        </span>
      </td>
      <td className="p-1 w-[11%] text-right px-2">
        <div className="flex items-center justify-end gap-1">
          {isSaving && <span className="text-[10px] text-surface-400 font-bold uppercase animate-pulse mr-2">Saving</span>}
          {isGhost ? (
            <button 
              onClick={() => triggerSave(rowData)} 
              className="px-2 h-7 rounded bg-primary text-white text-[10px] font-black uppercase tracking-wider hover:bg-primary/90 transition-colors"
            >
              Add
            </button>
          ) : (
            <button 
              onClick={() => onDelete && onDelete(rowData.id!)} 
              className="w-7 h-7 rounded text-surface-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors text-lg leading-none"
              title="Delete Row"
            >
              ×
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};


// Component for a single Floor Plan's Take-Off Section
const FloorPlanTakeOffSection = ({ plan, unitSystem, cvLoaded }: { plan: ProjectAsset; unitSystem: UnitSystem; cvLoaded: boolean }) => {
  const [estimations, setEstimations] = useState<EstimationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchEstimations();
  }, [plan.id]);

  const fetchEstimations = async () => {
    setLoading(true);
    try {
      const data = await projectsApi.getEstimations(plan.id);
      setEstimations(data.map((item: any) => ({
        ...item,
        no_of_items: item.no_of_items?.toString() || "",
        length: item.length?.toString() || "",
        width: item.width?.toString() || "",
        depth_height: item.depth_height?.toString() || "",
        gross_qty: item.gross_qty?.toString() || "",
        is_deduction: item.is_deduction || false,
        net_qty: item.net_qty?.toString() || "",
      })));
    } catch (err) {
      toast.error(`Failed to load estimations for ${plan.title}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRow = async (rowData: EstimationRow): Promise<boolean> => {
    try {
      if (rowData.id) {
        const updated = await projectsApi.updateEstimation(rowData.id, rowData);
        setEstimations(prev => prev.map(est => est.id === rowData.id ? { ...updated, ...rowData, id: rowData.id } : est));
        return true;
      } else {
        const saved = await projectsApi.createEstimation(rowData);
        setEstimations(prev => [...prev, saved]);
        return true;
      }
    } catch (err) {
      toast.error("Failed to save row");
      return false;
    }
  };

  const handleDeleteRow = async (id: number) => {
    try {
      await projectsApi.deleteEstimation(id);
      setEstimations(prev => prev.filter(e => e.id !== id));
      toast.success("Row deleted");
    } catch (err) {
      toast.error("Failed to delete row");
    }
  };

  const dimLabel = UNIT_LABELS[unitSystem];

  const ghostRowData: EstimationRow = {
    floor_plan: plan.id,
    item_code: "", description: "", no_of_items: "1",
    length: "", width: "", depth_height: "",
    gross_qty: "1.00", is_deduction: false, net_qty: "1.00", unit: "pcs"
  };

  const handleBulkSave = async () => {
    const unsaved = estimations.filter(e => !e.id);
    if (unsaved.length === 0) {
      toast.info("No unsaved estimations found.");
      return;
    }
    let successCount = 0;
    for (const row of unsaved) {
      try {
        const saved = await projectsApi.createEstimation(row);
        setEstimations(prev => prev.map(est => est === row ? saved : est));
        successCount++;
      } catch (err: any) {
        console.error("Failed to save row:", row, err);
        toast.error(`Failed to save ${row.item_code}: ${err.message || "Unknown error"}`);
      }
    }
    if (successCount === unsaved.length) {
      toast.success(`Successfully saved all ${successCount} estimations!`);
    } else {
      toast.warning(`Saved ${successCount} out of ${unsaved.length} estimations.`);
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-3xl border border-surface-200 shadow-sm overflow-hidden">
      
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-surface-200 flex items-center justify-between bg-surface-50">
        <h2 className="text-xl font-black text-primary uppercase tracking-tight">{plan.title}</h2>
      </div>

      {/* Floor Plan AI Analyzer Canvas */}
      {plan.file ? (
        <FloorPlanAnalyzerCanvas
          plan={plan}
          unitSystem={unitSystem}
          onAIDataExtracted={(newRows) => setEstimations(prev => [...prev, ...newRows])}
          isExpanded={isExpanded}
          onToggleExpand={() => setIsExpanded(!isExpanded)}
          existingEstimations={estimations}
          cvLoaded={cvLoaded}
        />
      ) : (
        <div className={`bg-surface-100 border-b border-surface-200 relative flex items-center justify-center ${isExpanded ? 'h-[800px]' : 'h-[400px]'}`}>
          <p className="text-surface-400 font-bold">No image available</p>
        </div>
      )}

      {/* Full-Width DataGrid */}
      <div className="flex flex-col bg-white">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 bg-white">
          <div>
            <h3 className="text-sm font-black text-primary uppercase tracking-tight">Estimation DataGrid</h3>
            <div className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Auto-saves as you type</div>
          </div>
          {estimations.filter(e => !e.id).length > 0 && (
            <button
              onClick={handleBulkSave}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm transition-all"
            >
              💾 Save {estimations.filter(e => !e.id).length} Unsaved Estimations
            </button>
          )}
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
            <thead className="bg-surface-50 border-b border-surface-200 shadow-sm">
              <tr className="text-[10px] font-black text-surface-600 uppercase tracking-widest">
                <th className="py-3 px-3 w-[12%] border-r border-surface-200/50">Item Code</th>
                <th className="py-3 px-3 w-[20%] border-r border-surface-200/50">Description</th>
                <th className="py-3 px-3 w-[10%] border-r border-surface-200/50">Type</th>
                <th className="py-3 px-3 w-[8%] text-center border-r border-surface-200/50">No.</th>
                <th className="py-3 px-3 w-[9%] text-right border-r border-surface-200/50">L ({dimLabel.linear})</th>
                <th className="py-3 px-3 w-[9%] text-right border-r border-surface-200/50">W ({dimLabel.linear})</th>
                <th className="py-3 px-3 w-[9%] text-right border-r border-surface-200/50">D ({dimLabel.linear})</th>
                <th className="py-3 px-4 w-[12%] text-right border-r border-surface-200/50">Net Qty</th>
                <th className="py-3 px-3 w-[11%] text-right"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="py-10 text-center font-bold text-surface-400">Loading...</td></tr>
              ) : (
                <>
                  {estimations.map((row, index) => (
                    <EditableRow 
                      key={row.id || `unsaved-${index}`} 
                      initialData={row} 
                      onSave={handleSaveRow} 
                      onDelete={handleDeleteRow}
                      unitSystem={unitSystem}
                    />
                  ))}
                  
                  {/* Always-Visible Ghost Row */}
                  <EditableRow 
                    key={`ghost-${estimations.length}`} 
                    initialData={ghostRowData} 
                    onSave={handleSaveRow} 
                    isGhost={true}
                    unitSystem={unitSystem}
                  />
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};


import Script from "next/script";

export default function TakeOffTab({ projectUid, projectAssets, initialUnitSystem = "metric" }: TakeOffTabProps) {
  const floorPlans = useMemo(() => projectAssets.filter(a => a.category === "2d_plan"), [projectAssets]);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(initialUnitSystem as UnitSystem);

  useEffect(() => {
    setUnitSystem(initialUnitSystem as UnitSystem);
  }, [initialUnitSystem]);

  const handleUnitSystemChange = async (newSystem: UnitSystem) => {
    setUnitSystem(newSystem);
    try {
      await projectsApi.updateProject(projectUid, { unit_system: newSystem } as any);
      toast.success("Measurement System saved");
    } catch (err) {
      toast.error("Failed to save Measurement System");
    }
  };

  const [cvLoaded, setCvLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).cv) {
      setCvLoaded(true);
    }
  }, []);

  if (floorPlans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 h-full">
        <p className="text-3xl mb-4">📄</p>
        <p className="text-surface-500 font-bold">No Floor Plans available. Please upload a 2D Plan in the Data Hub first.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <Script 
        src="https://docs.opencv.org/4.8.0/opencv.js" 
        onLoad={() => setCvLoaded(true)} 
        strategy="lazyOnload"
      />

      {/* Unit System Toggle */}
      <div className="flex items-center justify-between bg-white px-6 py-3 rounded-2xl border border-surface-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-surface-500">Measurement System</span>
          <span className="text-[10px] font-medium text-surface-400">— select the unit for dimensions (L, W, D)</span>
        </div>
        <div className="flex items-center gap-1 bg-surface-100 p-1 rounded-xl">
          <button
            onClick={() => handleUnitSystemChange("metric")}
            className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
              unitSystem === "metric"
                ? "bg-primary text-white shadow-sm"
                : "text-surface-500 hover:text-primary"
            }`}
          >
            Metric (m)
          </button>
          <button
            onClick={() => handleUnitSystemChange("imperial")}
            className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
              unitSystem === "imperial"
                ? "bg-accent text-white shadow-sm"
                : "text-surface-500 hover:text-accent"
            }`}
          >
            Imperial (ft)
          </button>
        </div>
      </div>

      {floorPlans.map(plan => (
        <FloorPlanTakeOffSection key={plan.id} plan={plan} unitSystem={unitSystem} cvLoaded={cvLoaded} />
      ))}
    </div>
  );
}

