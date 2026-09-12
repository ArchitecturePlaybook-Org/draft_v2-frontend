"use client";

import React, { useState, useEffect } from 'react';
import { X, Plus, Sparkles, Trash2, Layers, Calculator, HelpCircle } from 'lucide-react';
import { CustomWorkItem, useCustomItemsStore } from '@/domains/infralens-boq/custom-items';
import { RECIPES } from '@/domains/infralens-boq/recipes';
import { MATERIAL_META } from '@/domains/infralens-boq/prices';
import { MaterialRequirement, LabourRequirement } from '@/domains/infralens-boq/types';

interface CustomItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem?: CustomWorkItem | null;
  defaultSection?: string;
  onItemSaved?: (item: CustomWorkItem) => void;
}

const COMMON_UNITS = [
  { value: "sqm", label: "Square Metre (sqm / m²)" },
  { value: "cum", label: "Cubic Metre (cum / m³)" },
  { value: "m", label: "Running Metre (m)" },
  { value: "piece", label: "Piece / Each (pc)" },
  { value: "point", label: "Point (pt - Electrical / Plumbing)" },
  { value: "tonne", label: "Metric Tonne (t)" },
  { value: "set", label: "Set / Assembly" },
  { value: "nos", label: "Numbers (Nos.)" },
  { value: "kg", label: "Kilogram (kg)" }
];

export const CustomItemModal: React.FC<CustomItemModalProps> = ({
  isOpen,
  onClose,
  editingItem,
  defaultSection,
  onItemSaved
}) => {
  const { customSections, addCustomItem, updateCustomItem, addCustomSection } = useCustomItemsStore();

  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
  const [unit, setUnit] = useState('sqm');
  const [description, setDescription] = useState('');
  const [pricingMode, setPricingMode] = useState<'direct' | 'analysis'>('direct');
  const [baseRate, setBaseRate] = useState<number | ''>('');
  
  // For analysis mode
  const [materials, setMaterials] = useState<MaterialRequirement[]>([]);
  const [labour, setLabour] = useState<LabourRequirement[]>([]);

  // New section inline toggle
  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [error, setError] = useState('');

  // All sections: standard CPWD groups + custom sections
  const standardGroups = Array.from(new Set(RECIPES.map(r => r.group)));
  const allSections = Array.from(new Set([...customSections, ...standardGroups]));

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setGroup(editingItem.group);
      setUnit(editingItem.unit);
      setDescription(editingItem.description || '');
      setPricingMode(editingItem.pricingMode || 'direct');
      setBaseRate(editingItem.baseRate !== undefined ? editingItem.baseRate : '');
      setMaterials(editingItem.materials ? [...editingItem.materials] : []);
      setLabour(editingItem.labour ? [...editingItem.labour] : []);
    } else {
      setName('');
      setGroup(defaultSection || customSections[0] || standardGroups[0] || 'General');
      setUnit('sqm');
      setDescription('');
      setPricingMode('direct');
      setBaseRate('');
      setMaterials([]);
      setLabour([]);
    }
    setError('');
    setIsCreatingSection(false);
  }, [editingItem, defaultSection, isOpen]);

  if (!isOpen) return null;

  // Material and Labour helpers
  const availableMaterials = Object.entries(MATERIAL_META).filter(([k]) => !k.startsWith('lab_'));
  const availableLabour = Object.entries(MATERIAL_META).filter(([k]) => k.startsWith('lab_'));

  const handleAddMaterial = () => {
    const firstKey = availableMaterials[0]?.[0] || 'opc43';
    setMaterials([...materials, { priceId: firstKey, qty: 1 }]);
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const handleAddLabour = () => {
    const firstKey = availableLabour[0]?.[0] || 'lab_mason_skilled';
    setLabour([...labour, { priceId: firstKey, qty: 0.5 }]);
  };

  const handleRemoveLabour = (index: number) => {
    setLabour(labour.filter((_, i) => i !== index));
  };

  const handleCreateSectionSubmit = () => {
    const trimmed = newSectionName.trim();
    if (!trimmed) return;
    addCustomSection(trimmed);
    setGroup(trimmed);
    setNewSectionName('');
    setIsCreatingSection(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Item name is required.');
      return;
    }

    if (!group) {
      setError('Please select a section / category.');
      return;
    }

    if (pricingMode === 'direct') {
      if (baseRate === '' || isNaN(Number(baseRate)) || Number(baseRate) < 0) {
        setError('Please enter a valid non-negative unit rate (₹).');
        return;
      }
    }

    if (editingItem) {
      updateCustomItem(editingItem.id, {
        name: trimmedName,
        group,
        unit,
        description: description.trim(),
        pricingMode,
        baseRate: pricingMode === 'direct' ? Number(baseRate) : undefined,
        materials: pricingMode === 'analysis' ? materials : [],
        labour: pricingMode === 'analysis' ? labour : []
      });
      if (onItemSaved) {
        onItemSaved({
          ...editingItem,
          name: trimmedName,
          group,
          unit,
          description: description.trim(),
          pricingMode,
          baseRate: pricingMode === 'direct' ? Number(baseRate) : undefined,
          materials: pricingMode === 'analysis' ? materials : [],
          labour: pricingMode === 'analysis' ? labour : []
        });
      }
    } else {
      const created = addCustomItem({
        name: trimmedName,
        group,
        unit,
        description: description.trim(),
        pricingMode,
        baseRate: pricingMode === 'direct' ? Number(baseRate) : undefined,
        materials: pricingMode === 'analysis' ? materials : [],
        labour: pricingMode === 'analysis' ? labour : []
      });
      if (onItemSaved) {
        onItemSaved(created);
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="w-full max-w-2xl bg-surface-card border border-surface-200 rounded-3xl p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-surface-200 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center text-accent">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-foreground">
                {editingItem ? 'Edit Custom Item of Work' : 'Add Custom Item of Work'}
              </h3>
              <p className="text-[11px] text-text-secondary">
                {editingItem ? 'Update specifications and pricing' : 'Create a custom specification for your BOQ library'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-secondary hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl">
              {error}
            </div>
          )}

          {/* Item Name */}
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-text-secondary">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Italian Botticino Marble Flooring 18mm"
              className="w-full bg-surface-50 border border-surface-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-foreground outline-none focus:border-accent"
            />
          </div>

          {/* Section & Unit Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Section / Category */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-text-secondary">
                  Section / Category <span className="text-red-500">*</span>
                </label>
                {!isCreatingSection && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingSection(true)}
                    className="text-[10px] font-black text-accent hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-2.5 h-2.5" /> New Section
                  </button>
                )}
              </div>

              {isCreatingSection ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    placeholder="New section name..."
                    className="flex-1 bg-surface-50 border border-accent rounded-xl px-2.5 py-2 text-xs font-bold text-foreground outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleCreateSectionSubmit}
                    className="px-2.5 py-2 bg-accent text-background rounded-xl text-xs font-black"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingSection(false)}
                    className="p-2 text-text-secondary hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <select
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  className="w-full bg-surface-50 border border-surface-200 rounded-xl px-3 py-2.5 text-xs font-bold text-foreground outline-none focus:border-accent cursor-pointer"
                >
                  {allSections.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Unit */}
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider text-text-secondary">
                Unit of Measurement <span className="text-red-500">*</span>
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-surface-50 border border-surface-200 rounded-xl px-3 py-2.5 text-xs font-bold text-foreground outline-none focus:border-accent cursor-pointer"
              >
                {COMMON_UNITS.map(u => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pricing Mode Toggle */}
          <div className="space-y-2 pt-1 border-t border-surface-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-text-secondary">
                Pricing Method
              </label>
              <span className="text-[10px] text-text-secondary">Choose how this item is estimated</span>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-surface-100 p-1 rounded-2xl border border-surface-200">
              <button
                type="button"
                onClick={() => setPricingMode('direct')}
                className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  pricingMode === 'direct'
                    ? 'bg-surface-card text-accent shadow-xs'
                    : 'text-text-secondary hover:text-foreground'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Direct Unit Rate (₹)</span>
              </button>
              <button
                type="button"
                onClick={() => setPricingMode('analysis')}
                className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  pricingMode === 'analysis'
                    ? 'bg-surface-card text-accent shadow-xs'
                    : 'text-text-secondary hover:text-foreground'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>CPWD Rate Analysis</span>
              </button>
            </div>
          </div>

          {/* Pricing Mode A: Direct Rate */}
          {pricingMode === 'direct' && (
            <div className="p-4 bg-surface-50/60 rounded-2xl border border-surface-200 space-y-2">
              <label className="text-xs font-black text-foreground flex items-center gap-1">
                Estimated Rate per {unit} (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary font-mono font-bold text-sm">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required={pricingMode === 'direct'}
                  value={baseRate}
                  onChange={(e) => setBaseRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="e.g. 3800"
                  className="w-full bg-surface-card border border-surface-200 rounded-xl pl-8 pr-4 py-2.5 text-sm font-mono font-bold text-foreground outline-none focus:border-accent"
                />
              </div>
              <p className="text-[11px] text-text-secondary">
                This fixed unit rate will automatically be multiplied by the quantity measured in the BOQ.
              </p>
            </div>
          )}

          {/* Pricing Mode B: CPWD Rate Analysis */}
          {pricingMode === 'analysis' && (
            <div className="space-y-3 p-4 bg-surface-50/60 rounded-2xl border border-surface-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-foreground">
                  Material Requirements (per 1 {unit})
                </span>
                <button
                  type="button"
                  onClick={handleAddMaterial}
                  className="text-[11px] font-black text-accent hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> Add Material
                </button>
              </div>

              {materials.length === 0 ? (
                <p className="text-[11px] text-text-secondary italic">
                  No materials specified yet. Click &quot;Add Material&quot; to specify required materials.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {materials.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-surface-card p-2 rounded-xl border border-surface-200">
                      <select
                        value={m.priceId}
                        onChange={(e) => {
                          const updated = [...materials];
                          updated[idx].priceId = e.target.value;
                          setMaterials(updated);
                        }}
                        className="flex-1 bg-surface-50 border border-surface-200 rounded-lg px-2 py-1 text-xs font-bold text-foreground outline-none"
                      >
                        {availableMaterials.map(([pid, meta]) => (
                          <option key={pid} value={pid}>
                            {meta.name} ({meta.unit})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={m.qty}
                        onChange={(e) => {
                          const updated = [...materials];
                          updated[idx].qty = parseFloat(e.target.value) || 0;
                          setMaterials(updated);
                        }}
                        placeholder="Qty"
                        className="w-20 bg-surface-50 border border-surface-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-right text-foreground outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveMaterial(idx)}
                        className="text-text-secondary hover:text-red-500 p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-surface-200 flex items-center justify-between">
                <span className="text-xs font-black text-foreground">
                  Labour Trade Requirements (man-days per 1 {unit})
                </span>
                <button
                  type="button"
                  onClick={handleAddLabour}
                  className="text-[11px] font-black text-accent hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> Add Trade
                </button>
              </div>

              {labour.length === 0 ? (
                <p className="text-[11px] text-text-secondary italic">
                  No labour trades specified yet. Click &quot;Add Trade&quot; to specify required man-days.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {labour.map((l, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-surface-card p-2 rounded-xl border border-surface-200">
                      <select
                        value={l.priceId}
                        onChange={(e) => {
                          const updated = [...labour];
                          updated[idx].priceId = e.target.value;
                          setLabour(updated);
                        }}
                        className="flex-1 bg-surface-50 border border-surface-200 rounded-lg px-2 py-1 text-xs font-bold text-foreground outline-none"
                      >
                        {availableLabour.map(([pid, meta]) => (
                          <option key={pid} value={pid}>
                            {meta.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={l.qty}
                        onChange={(e) => {
                          const updated = [...labour];
                          updated[idx].qty = parseFloat(e.target.value) || 0;
                          setLabour(updated);
                        }}
                        placeholder="Days"
                        className="w-20 bg-surface-50 border border-surface-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-right text-foreground outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveLabour(idx)}
                        className="text-text-secondary hover:text-red-500 p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div className="space-y-1 pt-1">
            <label className="text-xs font-black uppercase tracking-wider text-text-secondary">
              Description & Specifications (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 18mm thickness, mirror polished finish, laying with white cement adhesive..."
              className="w-full bg-surface-50 border border-surface-200 rounded-xl px-3.5 py-2 text-xs font-medium text-foreground outline-none focus:border-accent"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-text-secondary hover:text-foreground border border-surface-200 rounded-xl hover:bg-surface-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-accent to-accent-hover text-background text-xs font-black rounded-xl shadow-xs hover:opacity-95 transition-all cursor-pointer"
            >
              {editingItem ? 'Save Changes' : 'Add Item to Library'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
