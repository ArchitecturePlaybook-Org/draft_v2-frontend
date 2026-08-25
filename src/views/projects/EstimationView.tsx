"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore } from "@/store/project-store";
import { projectsApi } from "@/domains/projects/api";
import { Spinner } from "@/components/ui/Spinner";
import { TakeoffCanvas } from "@/components/estimation/TakeoffCanvas";
import { EstimationGrid } from "@/components/estimation/EstimationGrid";
import { Toolbar } from "@/components/estimation/Toolbar";
import { useEstimationAutoSave } from "@/components/estimation/useEstimationAutoSave";
import { useEstimationStore } from "@/store/estimation-store";
import { TakeoffType } from "@/types/estimation.types";
import { LayoutGrid, Layers, PieChart, Download, Building2, Calculator, FileSpreadsheet } from "lucide-react";

interface EstimationSummaryType {
  grand_total?: number;
  items?: {
    description: string;
    item_code: string;
    total_qty: number;
    unit: string;
    total_cost: number;
  }[];
}

interface EstimationViewProps {
  projectUid: string;
}

function TakeoffCalculator({ item, updateItem }: { item: any, updateItem: any }) {
  if (!item) {
    return (
      <div className="text-center p-8 bg-surface-card rounded-xl border border-dashed border-surface-200">
        <span className="text-3xl mb-2 block opacity-30">🧱</span>
        <h4 className="text-xs font-black text-foreground uppercase tracking-wider mb-1">No Item Selected</h4>
        <p className="text-[10px] font-bold text-text-secondary leading-relaxed">
          Select a line, polygon, or count point on the floor plan to calculate and view material takeoff details.
        </p>
      </div>
    );
  }

  const trace = item.trace_data || {};
  const matType = trace.material_type || "generic";
  const breakdown = trace.takeoff_breakdown || {};

  const handleMatTypeChange = (newType: string) => {
    const defaultData: any = { material_type: newType };
    
    if (newType === 'brick') {
      defaultData.wall_height = 3;
      defaultData.wall_thickness = 0.23;
      defaultData.brick_length = 0.19;
      defaultData.brick_width = 0.09;
      defaultData.brick_height = 0.09;
      defaultData.mortar_joint = 0.01;
      defaultData.sand_ratio = 5;
      defaultData.waste_factor = 5;
      defaultData.billing_unit = 'vol';
    } else if (newType === 'tile') {
      defaultData.tile_length = 0.3;
      defaultData.tile_width = 0.3;
      defaultData.grout_width = 0.003;
      defaultData.grout_depth = 0.006;
      defaultData.adhesive_thickness = 0.003;
      defaultData.waste_factor = 10;
      defaultData.billing_unit = 'area';
    } else if (newType === 'concrete') {
      defaultData.slab_thickness = 0.15;
      defaultData.sand_ratio = 2;
      defaultData.aggregate_ratio = 4;
      defaultData.waste_factor = 5;
    }

    updateItem(item.id, {
      trace_data: {
        ...trace,
        ...defaultData
      }
    });
  };

  const handleParamChange = (key: string, value: any) => {
    updateItem(item.id, {
      trace_data: {
        ...trace,
        [key]: value
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Item info */}
      <div className="bg-surface-card p-3 rounded-xl border border-surface-200 shadow-2xs">
        <div className="flex justify-between items-start">
          <div className="min-w-0 flex-1 pr-2">
            <span className="text-[9px] bg-accent/10 border border-accent/20 px-1.5 py-0.5 rounded text-accent font-black uppercase tracking-wider">
              {item.item_code}
            </span>
            <h3 className="text-xs font-black text-foreground mt-1 truncate">{item.description}</h3>
            <p className="text-[9px] font-bold text-text-secondary uppercase tracking-widest mt-0.5">
              Measurement Type: {item.type}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs font-black text-foreground">
              {item.gross_qty} <span className="text-[9px] text-text-secondary font-bold uppercase">{item.unit}</span>
            </div>
            <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              ₹{item.total_cost?.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Material classification selector */}
      <div className="space-y-1">
        <label className="text-[9px] font-black text-surface-500 uppercase tracking-widest">Material Classification</label>
        <div className="grid grid-cols-2 gap-1.5">
          {item.type === 'length' && (
            <>
              <button
                type="button"
                onClick={() => handleMatTypeChange('generic')}
                className={`py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all ${
                  matType === 'generic' ? 'bg-accent border-accent text-background shadow-xs' : 'bg-surface-card hover:bg-surface-200 border-surface-200 text-foreground'
                }`}
              >
                📏 Generic Wall
              </button>
              <button
                type="button"
                onClick={() => handleMatTypeChange('brick')}
                className={`py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all ${
                  matType === 'brick' ? 'bg-accent border-accent text-background shadow-xs' : 'bg-surface-card hover:bg-surface-200 border-surface-200 text-foreground'
                }`}
              >
                🧱 Brick Wall
              </button>
            </>
          )}
          {item.type === 'area' && (
            <>
              <button
                type="button"
                onClick={() => handleMatTypeChange('generic')}
                className={`py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all ${
                  matType === 'generic' ? 'bg-accent border-accent text-background shadow-xs' : 'bg-surface-card hover:bg-surface-200 border-surface-200 text-foreground'
                }`}
              >
                🔲 Generic Area
              </button>
              <button
                type="button"
                onClick={() => handleMatTypeChange('tile')}
                className={`py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all ${
                  matType === 'tile' ? 'bg-accent border-accent text-background shadow-xs' : 'bg-surface-card hover:bg-surface-200 border-surface-200 text-foreground'
                }`}
              >
                🧱 Tile Floor
              </button>
              <button
                type="button"
                onClick={() => handleMatTypeChange('concrete')}
                className={`py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all ${
                  matType === 'concrete' ? 'bg-accent border-accent text-background shadow-xs' : 'bg-surface-card hover:bg-surface-200 border-surface-200 text-foreground'
                }`}
              >
                🪨 Concrete Slab
              </button>
            </>
          )}
          {item.type === 'count' && (
            <button
              type="button"
              className="py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border bg-accent border-accent text-background shadow-xs w-full col-span-2"
              disabled
            >
              📍 Item Count
            </button>
          )}
        </div>
      </div>

      {/* Input details form based on selection */}
      {matType === 'brick' && (
        <div className="bg-surface-card/60 backdrop-blur-md p-3.5 rounded-xl border border-surface-200 shadow-2xs space-y-3">
          <div className="border-b border-surface-200 pb-1.5">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-primary">Brick Wall Parameters</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[8px] font-bold text-surface-400 uppercase tracking-widest mb-0.5">Wall Height (m)</label>
              <input
                type="number"
                step="0.05"
                value={trace.wall_height ?? 3}
                onChange={e => handleParamChange('wall_height', parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-50 border border-surface-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-accent text-primary"
              />
            </div>
            <div>
              <label className="block text-[8px] font-bold text-surface-400 uppercase tracking-widest mb-0.5">Wall Thickness (m)</label>
              <input
                type="number"
                step="0.01"
                value={trace.wall_thickness ?? 0.23}
                onChange={e => handleParamChange('wall_thickness', parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-50 border border-surface-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-accent text-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[8px] font-bold text-surface-400 uppercase tracking-widest mb-0.5">Brick L (m)</label>
              <input
                type="number"
                step="0.001"
                value={trace.brick_length ?? 0.19}
                onChange={e => handleParamChange('brick_length', parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-50 border border-surface-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-accent text-primary"
              />
            </div>
            <div>
              <label className="block text-[8px] font-bold text-surface-400 uppercase tracking-widest mb-0.5">Brick W (m)</label>
              <input
                type="number"
                step="0.001"
                value={trace.brick_width ?? 0.09}
                onChange={e => handleParamChange('brick_width', parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-50 border border-surface-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-accent text-primary"
              />
            </div>
            <div>
              <label className="block text-[8px] font-bold text-surface-400 uppercase tracking-widest mb-0.5">Brick H (m)</label>
              <input
                type="number"
                step="0.001"
                value={trace.brick_height ?? 0.09}
                onChange={e => handleParamChange('brick_height', parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-50 border border-surface-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-accent text-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[8px] font-bold text-surface-400 uppercase tracking-widest mb-0.5">Mortar Joint (m)</label>
              <input
                type="number"
                step="0.001"
                value={trace.mortar_joint ?? 0.01}
                onChange={e => handleParamChange('mortar_joint', parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-50 border border-surface-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-accent text-primary"
              />
            </div>
            <div>
              <label className="block text-[8px] font-bold text-surface-400 uppercase tracking-widest mb-0.5">Sand Ratio (1:X)</label>
              <input
                type="number"
                step="0.5"
                value={trace.sand_ratio ?? 5}
                onChange={e => handleParamChange('sand_ratio', parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-50 border border-surface-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-accent text-primary"
              />
            </div>
            <div>
              <label className="block text-[8px] font-bold text-surface-400 uppercase tracking-widest mb-0.5">Waste Factor (%)</label>
              <input
                type="number"
                step="1"
                value={trace.waste_factor ?? 5}
                onChange={e => handleParamChange('waste_factor', parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-50 border border-surface-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-accent text-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-[8px] font-bold text-surface-400 uppercase tracking-widest mb-1">Billing Unit</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleParamChange('billing_unit', 'vol')}
                className={`py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all ${
                  (trace.billing_unit || 'vol') === 'vol' ? 'bg-primary text-background' : 'bg-surface-50 border-surface-200 text-foreground'
                }`}
              >
                Cubic Volume (m³)
              </button>
              <button
                type="button"
                onClick={() => handleParamChange('billing_unit', 'pcs')}
                className={`py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all ${
                  trace.billing_unit === 'pcs' ? 'bg-primary text-background' : 'bg-surface-50 border-surface-200 text-foreground'
                }`}
              >
                Brick Count (pcs)
              </button>
            </div>
          </div>
        </div>
      )}

      {matType === 'tile' && (
        <div className="bg-surface-card/60 backdrop-blur-md p-3.5 rounded-xl border border-surface-200 shadow-2xs space-y-3">
          <div className="border-b border-surface-200 pb-1.5">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-primary">Tile Flooring Parameters</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[8px] font-bold text-surface-400 uppercase tracking-widest mb-0.5">Tile Length (m)</label>
              <input
                type="number"
                step="0.01"
                value={trace.tile_length ?? 0.3}
                onChange={e => handleParamChange('tile_length', parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-50 border border-surface-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-accent text-primary"
              />
            </div>
            <div>
              <label className="block text-[8px] font-bold text-surface-400 uppercase tracking-widest mb-0.5">Tile Width (m)</label>
              <input
                type="number"
                step="0.01"
                value={trace.tile_width ?? 0.3}
                onChange={e => handleParamChange('tile_width', parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-50 border border-surface-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-accent text-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[8px] font-bold text-surface-400 uppercase tracking-widest mb-0.5">Grout Width (m)</label>
              <input
                type="number"
                step="0.001"
                value={trace.grout_width ?? 0.003}
                onChange={e => handleParamChange('grout_width', parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-50 border border-surface-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-accent text-primary"
              />
            </div>
            <div>
              <label className="block text-[8px] font-bold text-surface-400 uppercase tracking-widest mb-0.5">Grout Depth (m)</label>
              <input
                type="number"
                step="0.001"
                value={trace.grout_depth ?? 0.006}
                onChange={e => handleParamChange('grout_depth', parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-50 border border-surface-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-accent text-primary"
              />
            </div>
            <div>
              <label className="block text-[8px] font-bold text-surface-400 uppercase tracking-widest mb-0.5">Waste Factor (%)</label>
              <input
                type="number"
                step="1"
                value={trace.waste_factor ?? 10}
                onChange={e => handleParamChange('waste_factor', parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-50 border border-surface-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-accent text-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-[8px] font-bold text-surface-400 uppercase tracking-widest mb-1">Billing Unit</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleParamChange('billing_unit', 'area')}
                className={`py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all ${
                  (trace.billing_unit || 'area') === 'area' ? 'bg-primary text-background' : 'bg-surface-50 border-surface-200 text-foreground'
                }`}
              >
                Flooring Area (sqft)
              </button>
              <button
                type="button"
                onClick={() => handleParamChange('billing_unit', 'pcs')}
                className={`py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all ${
                  trace.billing_unit === 'pcs' ? 'bg-primary text-background' : 'bg-surface-50 border-surface-200 text-foreground'
                }`}
              >
                Tile Count (pcs)
              </button>
            </div>
          </div>
        </div>
      )}

      {matType === 'concrete' && (
        <div className="bg-surface-card/60 backdrop-blur-md p-3.5 rounded-xl border border-surface-200 shadow-2xs space-y-3">
          <div className="border-b border-surface-200 pb-1.5">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-primary">Concrete Slab Parameters</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[8px] font-bold text-surface-400 uppercase tracking-widest mb-0.5">Slab Thickness (m)</label>
              <input
                type="number"
                step="0.01"
                value={trace.slab_thickness ?? 0.15}
                onChange={e => handleParamChange('slab_thickness', parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-50 border border-surface-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-accent text-primary"
              />
            </div>
            <div>
              <label className="block text-[8px] font-bold text-surface-400 uppercase tracking-widest mb-0.5">Waste Factor (%)</label>
              <input
                type="number"
                step="1"
                value={trace.waste_factor ?? 5}
                onChange={e => handleParamChange('waste_factor', parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-50 border border-surface-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-accent text-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[8px] font-bold text-surface-400 uppercase tracking-widest mb-0.5">Sand Ratio (1:X)</label>
              <input
                type="number"
                step="0.5"
                value={trace.sand_ratio ?? 2}
                onChange={e => handleParamChange('sand_ratio', parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-50 border border-surface-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-accent text-primary"
              />
            </div>
            <div>
              <label className="block text-[8px] font-bold text-surface-400 uppercase tracking-widest mb-0.5">Aggregate Ratio (1:X:Y)</label>
              <input
                type="number"
                step="0.5"
                value={trace.aggregate_ratio ?? 4}
                onChange={e => handleParamChange('aggregate_ratio', parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-50 border border-surface-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-accent text-primary"
              />
            </div>
          </div>
        </div>
      )}

      {/* Breakdown Report Output */}
      {breakdown && Object.keys(breakdown).length > 0 && (
        <div className="bg-surface-card p-3.5 rounded-xl border border-surface-200 shadow-2xs space-y-2">
          <div className="border-b border-surface-200 pb-1 flex items-center justify-between">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              📊 Material Takeoff Breakdown
            </h4>
          </div>

          <div className="space-y-1.5 text-xs text-foreground font-mono">
            {matType === 'brick' && (
              <>
                <div className="flex justify-between border-b border-surface-100 py-1">
                  <span className="text-text-secondary text-[10px] font-sans">Wall volume:</span>
                  <span className="font-bold">{breakdown.wall_volume} m³</span>
                </div>
                <div className="flex justify-between border-b border-surface-100 py-1 text-accent font-black">
                  <span className="text-accent text-[10px] font-sans">Bricks needed:</span>
                  <span>{breakdown.bricks_count?.toLocaleString()} pcs</span>
                </div>
                <div className="flex justify-between border-b border-surface-100 py-1">
                  <span className="text-text-secondary text-[10px] font-sans">Mortar volume:</span>
                  <span>{breakdown.mortar_volume} m³</span>
                </div>
                <div className="flex justify-between border-b border-surface-100 py-1">
                  <span className="text-text-secondary text-[10px] font-sans">Cement bags (50kg):</span>
                  <span className="font-bold text-primary">{breakdown.cement_bags} bags</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-text-secondary text-[10px] font-sans">Sand volume:</span>
                  <span className="font-bold">{breakdown.sand_volume} m³</span>
                </div>
              </>
            )}

            {matType === 'tile' && (
              <>
                <div className="flex justify-between border-b border-surface-100 py-1">
                  <span className="text-text-secondary text-[10px] font-sans">Surface area:</span>
                  <span className="font-bold">{breakdown.surface_area} sqm</span>
                </div>
                <div className="flex justify-between border-b border-surface-100 py-1 text-accent font-black">
                  <span className="text-accent text-[10px] font-sans">Tiles needed:</span>
                  <span>{breakdown.tiles_count?.toLocaleString()} pcs</span>
                </div>
                <div className="flex justify-between border-b border-surface-100 py-1">
                  <span className="text-text-secondary text-[10px] font-sans">Tile Grout Weight:</span>
                  <span className="font-bold">{breakdown.grout_weight_kg} kg</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-text-secondary text-[10px] font-sans">Adhesive dry weight:</span>
                  <span className="font-bold">{breakdown.adhesive_weight_kg} kg</span>
                </div>
              </>
            )}

            {matType === 'concrete' && (
              <>
                <div className="flex justify-between border-b border-surface-100 py-1">
                  <span className="text-text-secondary text-[10px] font-sans">Surface area:</span>
                  <span className="font-bold">{breakdown.surface_area} sqm</span>
                </div>
                <div className="flex justify-between border-b border-surface-100 py-1 text-accent font-black">
                  <span className="text-accent text-[10px] font-sans">Concrete Wet volume:</span>
                  <span className="font-bold">{breakdown.concrete_volume} m³</span>
                </div>
                <div className="flex justify-between border-b border-surface-100 py-1">
                  <span className="text-text-secondary text-[10px] font-sans">Cement bags (50kg):</span>
                  <span className="font-bold text-primary">{breakdown.cement_bags} bags</span>
                </div>
                <div className="flex justify-between border-b border-surface-100 py-1">
                  <span className="text-text-secondary text-[10px] font-sans">Sand volume:</span>
                  <span className="font-bold">{breakdown.sand_volume} m³</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-text-secondary text-[10px] font-sans">Aggregate volume:</span>
                  <span className="font-bold">{breakdown.aggregate_volume} m³</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function EstimationView({ projectUid }: EstimationViewProps) {
  const { project, isLoading, fetchProject } = useProjectStore();
  const { setItems, setLastSavedItems, setFloorPlanId, syncStatus, selectedItemId, items, updateItem } = useEstimationStore();
  const selectedItem = items.find(item => item.id === selectedItemId);
  
  // Hook up Auto-Save
  useEstimationAutoSave();

  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [rightPanelWidth, setRightPanelWidth] = useState(330);
  const [isResizing, setIsResizing] = useState(false);

  
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  
  const [estimations, setEstimations] = useState<unknown[]>([]);
  const [estimationSummary, setEstimationSummary] = useState<EstimationSummaryType | null>(null);

  const [rightPanelSubTab, setRightPanelSubTab] = useState<"grid" | "summary" | "takeoff">("grid");

  // Auto-switch tabs when selectedItemId changes
  useEffect(() => {
    if (selectedItemId) {
      setRightPanelSubTab("takeoff");
      setRightPanelOpen(true);
    } else {
      setRightPanelSubTab("grid");
    }
  }, [selectedItemId]);

  useEffect(() => {
    fetchProject(projectUid);
    projectsApi.getEstimationSummary(projectUid).then(setEstimationSummary).catch(console.error);
  }, [projectUid, fetchProject]);

  useEffect(() => {
    if (selectedAssetId) {
      setFloorPlanId(selectedAssetId);
      projectsApi.getEstimations(selectedAssetId).then(data => {
        const mappedItems = data.map((be: { id: number; item_code: string; description: string; trace_data?: { type?: string; points?: { x: number; y: number }[]; color?: string; multiplier?: string; unit_cost?: number }; unit: string; gross_qty: number; net_qty: number }) => ({
          id: crypto.randomUUID(), // New frontend UUID
          backendId: be.id, // Keep track of DB ID
          item_code: be.item_code,
          description: be.description,
          type: (be.trace_data?.type === 'polygon' ? 'area' : be.trace_data?.type === 'line' ? 'length' : be.trace_data?.type === 'point' ? 'count' : be.trace_data?.type || 'area') as TakeoffType,
          points: be.trace_data?.points || [],
          color: be.trace_data?.color || '#D4AF37',
          unit: be.unit || 'sqft',
          gross_qty: Number(be.gross_qty) || 0,
          multiplier: be.trace_data?.multiplier || "1",
          net_qty: Number(be.net_qty) || 0,
          unit_cost: Number(be.trace_data?.unit_cost || 0),
          total_cost: Number(be.net_qty || 0) * Number(be.trace_data?.unit_cost || 0)
        }));
        setItems(mappedItems);
        setLastSavedItems(mappedItems); // Initialize baseline for auto-save
        setEstimations(data);
      }).catch(console.error);
    } else {
      setFloorPlanId(null);
      setItems([]);
      setLastSavedItems([]);
      setEstimations([]);
    }
  }, [selectedAssetId, setFloorPlanId, setItems, setLastSavedItems]);

  const floorPlans = project?.assets?.filter(a => a.category === "2d_plan") || [];
  const selectedAsset = floorPlans.find(a => a.id === selectedAssetId);

  // Auto-select first floor plan if none selected
  useEffect(() => {
    if (floorPlans.length > 0 && !selectedAssetId) {
      setSelectedAssetId(floorPlans[0].id);
    }
  }, [floorPlans, selectedAssetId]);

  if (isLoading || !project) return <div className="flex h-full items-center justify-center"><Spinner size="lg" label="Loading Estimation Workspace..." /></div>;

  return (
    <div className="flex h-full w-full overflow-hidden bg-surface-50 animate-fade-in relative">
      
      {/* Central Canvas Area (Takes full left width) */}
      <div className="flex-1 h-full relative flex flex-col bg-[url('/grid-pattern.svg')] bg-[length:32px_32px] dark:bg-[url('/grid-pattern-dark.svg')] z-0 overflow-hidden min-w-0">
        
        {/* Top Header Bar */}
        <div className="h-11 bg-surface-50/80 backdrop-blur-2xl border-b border-surface-200 flex items-center px-3 sm:px-4 justify-between shrink-0 shadow-xs relative z-10 gap-2">
          
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-6 h-6 bg-accent/10 rounded-md flex items-center justify-center text-accent text-xs shadow-inner shrink-0">
              📐
            </div>
            
            {/* 2D Floor Plan Header Dropdown */}
            <div className="relative flex items-center min-w-0">
              <select
                value={selectedAssetId || ""}
                onChange={(e) => setSelectedAssetId(Number(e.target.value) || null)}
                className="appearance-none bg-surface-100 hover:bg-surface-200 border border-surface-200 rounded-lg pl-2.5 pr-7 py-1 text-xs font-black text-primary outline-none focus:border-accent cursor-pointer truncate max-w-[180px] sm:max-w-[280px] transition-colors"
              >
                {floorPlans.length === 0 ? (
                  <option value="" disabled>No 2D Plans Uploaded</option>
                ) : (
                  floorPlans.map(asset => (
                    <option key={asset.id} value={asset.id}>
                      {asset.title} ({(asset.size / 1024).toFixed(1)} KB)
                    </option>
                  ))
                )}
              </select>
              <div className="pointer-events-none absolute right-2 text-surface-400 text-[9px]">▼</div>
            </div>

            {/* Auto-save Status Indicator */}
            <div className="flex items-center gap-1.5 ml-1 sm:ml-2 bg-surface-100/50 px-2 py-0.5 rounded-full border border-surface-200 shrink-0">
              {syncStatus === 'saving' && <><Spinner size="sm" /> <span className="text-[9px] font-bold text-surface-400 uppercase tracking-wider">Saving...</span></>}
              {syncStatus === 'saved' && <><span className="text-emerald-500 text-xs">✓</span> <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Saved</span></>}
              {syncStatus === 'error' && <><span className="text-red-500 text-xs">⚠️</span> <span className="text-[9px] font-bold text-red-600 uppercase tracking-wider">Error</span></>}
              {syncStatus === 'idle' && <span className="text-[9px] font-bold text-surface-400 uppercase tracking-wider flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> Synced</span>}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setRightPanelOpen(prev => !prev)}
              className="flex items-center gap-1 px-2.5 py-1 bg-accent text-background font-bold text-[10px] uppercase tracking-wider rounded-lg shadow-xs"
            >
              📊 Takeoff Summary
            </button>
          </div>
        </div>
        
        {/* Canvas Body */}
        {selectedAsset ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            key={selectedAsset.id}
            className="flex-1 relative overflow-hidden flex flex-col p-2 sm:p-3 bg-surface-50/50 backdrop-blur-[2px]"
          >
            {selectedAsset.file ? (
              <TakeoffCanvas imageUrl={selectedAsset.file} />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-surface-100 text-center p-8 rounded-xl border border-dashed border-surface-200">
                 <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">Unsupported format for visual takeoff</p>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 relative z-10 min-h-[300px]">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-20 h-20 bg-surface-50/80 backdrop-blur-xl rounded-2xl flex items-center justify-center text-4xl mb-4 shadow-xl border border-surface-200"
            >
              📐
            </motion.div>
            <h2 className="text-xl sm:text-2xl font-black text-primary tracking-tight mb-2">Estimation Workspace</h2>
            <p className="text-[11px] font-bold text-surface-400 uppercase tracking-wider max-w-sm leading-relaxed mb-4">
              Select a 2D floor plan from the header dropdown to begin taking off quantities, measuring areas, and calculating costs.
            </p>
          </div>
        )}
      </div>

      {/* Collapsed Right Toggle (Desktop) */}
      <AnimatePresence>
        {!rightPanelOpen && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onClick={() => setRightPanelOpen(true)}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-30 w-8 h-20 bg-surface-100/80 backdrop-blur-md border border-r-0 border-surface-200 rounded-l-xl items-center justify-center text-surface-400 hover:text-accent transition-all shadow-md group"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform"><path d="M15 18l-6-6 6-6"/></svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Right Panel: Estimation Table / Summary (Mobile Overlay / Desktop Inline) */}
      <AnimatePresence>
        {rightPanelOpen && (
          <>
            {/* Mobile Backdrop Overlay */}
            <div 
              onClick={() => setRightPanelOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-xs"
            />
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: typeof window !== "undefined" && window.innerWidth < 768 ? "90%" : rightPanelWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={isResizing ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
              className={`fixed md:relative inset-y-0 right-0 z-50 md:z-20 h-full bg-surface-100/95 backdrop-blur-3xl border-l border-surface-200 shadow-xl flex flex-col shrink-0 min-w-0 max-w-[90vw] md:max-w-[400px] ${isResizing ? 'select-none pointer-events-none' : ''}`}
            >
              {/* Resize Handle (Desktop Only) */}
              <div 
                className="hidden md:block absolute left-0 top-0 bottom-0 w-2 -ml-1 cursor-col-resize hover:bg-accent/40 z-50 transition-colors pointer-events-auto"
                onPointerDown={(e) => {
                  e.preventDefault();
                  setIsResizing(true);
                  const startX = e.clientX;
                  const startWidth = rightPanelWidth;
                  const handleMove = (moveEvent: PointerEvent) => {
                    const delta = startX - moveEvent.clientX;
                    setRightPanelWidth(Math.max(260, Math.min(420, startWidth + delta)));
                  };

                  const handleUp = () => {
                    setIsResizing(false);
                    window.removeEventListener("pointermove", handleMove);
                    window.removeEventListener("pointerup", handleUp);
                  };
                  window.addEventListener("pointermove", handleMove);
                  window.addEventListener("pointerup", handleUp);
                }}
              />
              
              {/* Right Panel Header & Subtabs */}
              <div className="h-11 px-3 flex items-center justify-between border-b border-surface-200 bg-surface-50/90 backdrop-blur-md shrink-0 gap-2">
                <div className="flex items-center gap-1 p-0.5 bg-surface-200/60 rounded-lg shrink-0">
                  <button
                    onClick={() => setRightPanelSubTab("grid")}
                    className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-1 ${
                      rightPanelSubTab === "grid"
                        ? "bg-surface-card text-foreground border border-surface-200 shadow-2xs"
                        : "text-text-secondary hover:text-foreground"
                    }`}
                  >
                    <LayoutGrid className="w-3 h-3 text-accent" />
                    Grid
                  </button>
                  <button
                    onClick={() => setRightPanelSubTab("takeoff")}
                    className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-1 ${
                      rightPanelSubTab === "takeoff"
                        ? "bg-surface-card text-foreground border border-surface-200 shadow-2xs"
                        : "text-text-secondary hover:text-foreground"
                    }`}
                  >
                    <Layers className="w-3 h-3 text-accent" />
                    Takeoff
                  </button>
                  <button
                    onClick={() => setRightPanelSubTab("summary")}
                    className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-1 ${
                      rightPanelSubTab === "summary"
                        ? "bg-surface-card text-foreground border border-surface-200 shadow-2xs"
                        : "text-text-secondary hover:text-foreground"
                    }`}
                  >
                    <PieChart className="w-3 h-3 text-accent" />
                    Summary
                  </button>
                </div>

                <button onClick={() => setRightPanelOpen(false)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-surface-200 text-surface-400 hover:text-accent transition-all shrink-0 cursor-pointer">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
              
              {/* Right Panel Main Content */}
              <div className="flex-1 overflow-y-auto p-3 bg-gradient-to-b from-transparent to-surface-50/40 no-scrollbar">
                {rightPanelSubTab === "grid" ? (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="h-full flex flex-col">
                    <div className="flex justify-between items-center mb-3 bg-surface-card p-3 rounded-xl border border-surface-200 shadow-2xs">
                      <div>
                        <p className="text-[8px] font-black text-accent uppercase tracking-wider mb-0.5">Plan Takeoff Context</p>
                        <h3 className="text-xs font-black text-foreground tracking-tight truncate max-w-[170px]">{selectedAsset?.title || "Active Plan"}</h3>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black text-text-secondary uppercase tracking-wider mb-0.5">Recorded Lines</p>
                        <span className="text-xs font-black text-foreground bg-surface-100 px-2 py-0.5 rounded-md border border-surface-200">{estimations.length}</span>
                      </div>
                    </div>

                    <div className="flex-1 h-0 overflow-hidden relative rounded-xl border border-surface-200 shadow-2xs">
                      <EstimationGrid />
                    </div>
                  </motion.div>
                ) : rightPanelSubTab === "takeoff" ? (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                    <TakeoffCalculator item={selectedItem} updateItem={updateItem} />
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-3">
                    {/* Executive Grand Total Banner */}
                    <div className="p-4 bg-gradient-to-br from-accent/15 via-surface-card to-surface-card rounded-2xl border border-accent/30 shadow-md relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl pointer-events-none" />
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-black text-accent uppercase tracking-wider bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">
                          Aggregated Estimate
                        </span>
                        <Calculator className="w-4 h-4 text-accent" />
                      </div>
                      
                      <div className="text-2xl sm:text-3xl font-mono font-black text-foreground tracking-tight drop-shadow-2xs">
                        ₹{(estimationSummary?.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <p className="text-[9px] font-semibold text-text-secondary mt-1.5 leading-relaxed">
                        Calculated across all 2D floor plans, material takeoffs, and BOQ items.
                      </p>
                    </div>

                    {/* Category Breakdowns */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1 border-b border-surface-200 pb-1.5">
                         <h4 className="text-[9px] font-black uppercase tracking-wider text-text-secondary">Master Category Totals</h4>
                         <span className="text-[8px] font-black uppercase tracking-wider text-accent font-mono bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20">
                           {estimationSummary?.items?.length || 0} Categories
                         </span>
                      </div>

                      {estimationSummary?.items?.length ? (
                        estimationSummary.items.map((item: { description: string; item_code: string; total_qty: number; unit: string; total_cost: number }, i: number) => {
                          const grandTotal = estimationSummary?.grand_total || 1;
                          const pct = Math.min(100, Math.round(((item.total_cost || 0) / grandTotal) * 100));
                          return (
                            <div key={i} className="p-3 bg-surface-card rounded-xl border border-surface-200/80 hover:border-accent/40 transition-all shadow-2xs space-y-2">
                              <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0 pr-2">
                                  <p className="text-xs font-bold text-foreground truncate">{item.description}</p>
                                  <p className="text-[8px] font-black uppercase tracking-wider text-text-secondary mt-0.5 bg-surface-100 border border-surface-200 w-fit px-1.5 py-0.5 rounded font-mono">
                                    {item.item_code}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs font-black text-foreground font-mono">
                                    {item.total_qty} <span className="text-[9px] uppercase tracking-wider text-text-secondary font-bold">{item.unit}</span>
                                  </p>
                                  <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                                    ₹{(item.total_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </p>
                                </div>
                              </div>

                              {/* Visual Progress Bar */}
                              <div className="w-full bg-surface-100 rounded-full h-1.5 overflow-hidden flex">
                                <div className="bg-gradient-to-r from-accent to-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center p-6 bg-surface-50/50 rounded-xl border border-dashed border-surface-200">
                          <FileSpreadsheet className="w-6 h-6 text-surface-400 mx-auto mb-2 opacity-50" />
                          <p className="text-xs font-bold text-text-secondary leading-relaxed">No estimation summary data calculated yet.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="p-3 border-t border-surface-200 bg-surface-50/90 backdrop-blur-xl shrink-0">
                <button 
                  onClick={() => projectsApi.exportProjectData(project.uid, 'estimations')}
                  className="w-full h-9 bg-gradient-to-r from-accent to-accent-hover text-background font-black text-[9px] uppercase tracking-wider rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Full Estimation Sheet (CSV)
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
