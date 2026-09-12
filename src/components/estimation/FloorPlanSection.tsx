"use client";

import React, { useState } from 'react';
import { SimpleTakeoffCanvas } from './SimpleTakeoffCanvas';
import { MeasuredShape } from './SimpleSvgLayer';
import { BOQItemsTable } from './BOQItemsTable';
import { BOQItemRow } from '@/domains/infralens-boq/types';
import { RECIPES_MAP, DEFAULT_EXAMPLE_SLUGS } from '@/domains/infralens-boq/recipes';
import { ChevronDown, ChevronUp, Layers, MapPin, Ruler, Spline, Square, Info } from 'lucide-react';
import { CalibrationUnit, metersToUnit } from '@/lib/estimation/units';

export interface FloorPlanData {
  id: number;
  title: string;
  file: string;
  size: number;
}

interface FloorPlanSectionProps {
  plan: FloorPlanData;
  selectedCity: string;
  boqItems: BOQItemRow[];
  shapes: MeasuredShape[];
  scale: number;
  isCalibrated: boolean;
  unit?: CalibrationUnit;
  onUpdateBoqItems: (items: BOQItemRow[]) => void;
  onUpdateShapes: (shapes: MeasuredShape[]) => void;
  onUpdateScale: (scale: number, unit?: CalibrationUnit) => void;
  onUpdateUnit: (unit: CalibrationUnit) => void;
  customMaterialRates?: Record<string, number>;
  customLabourRates?: Record<string, number>;
}

export const FloorPlanSection: React.FC<FloorPlanSectionProps> = ({
  plan,
  selectedCity,
  boqItems,
  shapes,
  scale,
  isCalibrated,
  unit = 'm',
  onUpdateBoqItems,
  onUpdateShapes,
  onUpdateScale,
  onUpdateUnit,
  customMaterialRates,
  customLabourRates
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Handle measurement completion from canvas - INDEPENDENT TOOL
  const handleAddShape = (shape: MeasuredShape) => {
    onUpdateShapes([...shapes, shape]);
    // The measurement tool is strictly independent: NO automatic BOQ line item injection
  };

  const handleDeleteShape = (shapeId: string) => {
    onUpdateShapes(shapes.filter(s => s.id !== shapeId));
    // Do not touch manual BOQ items
  };

  const handleUpdateShape = (shapeId: string, updates: Partial<MeasuredShape>) => {
    onUpdateShapes(shapes.map(s => s.id === shapeId ? { ...s, ...updates } : s));
  };

  const handleClearShapes = () => {
    onUpdateShapes([]);
    // Do not touch manual BOQ items
  };

  const handleAddItem = () => {
    const defaultRecipe = RECIPES_MAP.get('m20-concrete') || {
      slug: 'm20-concrete',
      name: 'M20 Concrete',
      group: 'Concrete',
      unit: 'cum'
    };

    const newRow: BOQItemRow = {
      id: crypto.randomUUID(),
      slug: defaultRecipe.slug,
      name: defaultRecipe.name,
      group: defaultRecipe.group,
      qty: 10,
      unit: defaultRecipe.unit as any,
      sourceType: 'manual'
    };

    onUpdateBoqItems([...boqItems, newRow]);
  };

  const handleUpdateItem = (id: string, updates: Partial<BOQItemRow>) => {
    onUpdateBoqItems(boqItems.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleDeleteItem = (id: string) => {
    onUpdateBoqItems(boqItems.filter(item => item.id !== id));
  };

  const handleResetToExample = () => {
    const rows: BOQItemRow[] = DEFAULT_EXAMPLE_SLUGS.map(ex => {
      const rec = RECIPES_MAP.get(ex.slug);
      return {
        id: crypto.randomUUID(),
        slug: ex.slug,
        name: rec?.name || ex.slug,
        group: rec?.group || "General",
        qty: ex.qty,
        unit: rec?.unit || "cum",
        sourceType: 'manual'
      };
    });
    onUpdateBoqItems(rows);
  };

  const handleClearAll = () => {
    onUpdateBoqItems([]);
  };

  return (
    <div className="w-full bg-surface-card rounded-3xl border border-surface-200 p-4 sm:p-5 shadow-sm space-y-4">
      {/* Plan Header */}
      <div className="flex items-center justify-between border-b border-surface-200 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-foreground tracking-tight">
              {plan.title || "Floor Plan"}
            </h3>
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mt-0.5">
              {(plan.size / 1024).toFixed(1)} KB • {shapes.length} measured {shapes.length === 1 ? 'element' : 'elements'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(prev => !prev)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-200 text-xs font-bold text-text-secondary hover:text-foreground hover:bg-surface-100 transition-colors"
        >
          <span>{isCollapsed ? 'Expand Plan' : 'Collapse'}</span>
          {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Plan Body */}
      {!isCollapsed && (
        <div className="space-y-4">
          {/* 1. Floor Plan Canvas */}
          <SimpleTakeoffCanvas
            imageUrl={plan.file}
            planTitle={plan.title}
            shapes={shapes}
            scale={scale}
            isCalibrated={isCalibrated}
            displayUnit={unit}
            onUnitChange={onUpdateUnit}
            onAddShape={handleAddShape}
            onDeleteShape={handleDeleteShape}
            onUpdateShape={handleUpdateShape}
            onClearShapes={handleClearShapes}
            onCalibrate={onUpdateScale}
          />

          {/* Independent Takeoff Measurements Reference Bar */}
          {(() => {
            const isImperial = unit === 'ft' || unit === 'in' || unit === 'yd';
            const shapeScale = scale > 0 ? scale : 0.025;
            const computedLength = shapes
              .filter(s => s.type === 'length')
              .reduce((sum, s) => {
                let px = 0;
                for (let i = 1; i < s.points.length; i++) {
                  const dx = s.points[i].x - s.points[i - 1].x;
                  const dy = s.points[i].y - s.points[i - 1].y;
                  px += Math.sqrt(dx * dx + dy * dy);
                }
                return sum + metersToUnit(px * shapeScale, unit);
              }, 0);

            const computedArea = shapes
              .filter(s => s.type === 'area')
              .reduce((sum, s) => {
                let areaVal = 0;
                for (let i = 0; i < s.points.length; i++) {
                  const j = (i + 1) % s.points.length;
                  areaVal += s.points[i].x * s.points[j].y;
                  areaVal -= s.points[j].x * s.points[i].y;
                }
                const sqm = Math.abs(areaVal / 2) * (shapeScale * shapeScale);
                return sum + (isImperial ? sqm * 10.76391 : sqm);
              }, 0);

            const areaUnitLabel = isImperial ? 'sqft' : 'sqm';

            return (
              <div className="bg-surface-50 border border-surface-200 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                    <Ruler className="w-4 h-4 text-accent" />
                    Takeoff Reference:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300 font-mono font-bold border border-blue-500/20 flex items-center gap-1.5">
                      <Spline className="w-3.5 h-3.5" />
                      Total Length: {computedLength.toFixed(2)} {unit}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono font-bold border border-emerald-500/20 flex items-center gap-1.5">
                      <Square className="w-3.5 h-3.5" />
                      Total Area: {computedArea.toFixed(2)} {areaUnitLabel}
                    </span>
                    <span className="text-[11px] text-text-secondary font-medium">
                      ({shapes.length} {shapes.length === 1 ? 'shape' : 'shapes'} measured)
                    </span>
                  </div>
                </div>

                {/* Quick Unit Switcher buttons */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-surface-200/60 p-0.5 rounded-lg border border-surface-200 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => onUpdateUnit('m')}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        unit === 'm'
                          ? 'bg-surface-card text-foreground shadow-xs'
                          : 'text-text-secondary hover:text-foreground'
                      }`}
                    >
                      m / sqm
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateUnit('ft')}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        unit === 'ft'
                          ? 'bg-surface-card text-foreground shadow-xs'
                          : 'text-text-secondary hover:text-foreground'
                      }`}
                    >
                      ft / sqft
                    </button>
                  </div>

                  <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-text-secondary">
                    <Info className="w-3.5 h-3.5 text-surface-400 shrink-0" />
                    <span>Independent tool. Enter BOQ items below.</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 2. Middle Section: BOQ Items of Work Table Directly Below This Plan */}
          <BOQItemsTable
            items={boqItems}
            selectedCity={selectedCity}
            onUpdateItem={handleUpdateItem}
            onAddItem={handleAddItem}
            onDeleteItem={handleDeleteItem}
            onResetToExample={handleResetToExample}
            onClearAll={handleClearAll}
            customMaterialRates={customMaterialRates}
            customLabourRates={customLabourRates}
          />
        </div>
      )}
    </div>
  );
};
