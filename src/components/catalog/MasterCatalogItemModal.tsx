import React, { useState, useEffect } from 'react';
import { MasterCatalogItem } from '@/store/estimation-store';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData: MasterCatalogItem | null;
}

export const MasterCatalogItemModal: React.FC<Props> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    item_code: '',
    description: '',
    unit: 'ft',
    unit_cost: 0,
    multiplier: 1,
    color: '#38bdf8',
    measurement_type: 'length',
    material_type: 'generic',
    wall_height: 3,
    wall_thickness: 0.23,
    brick_length: 0.19,
    brick_width: 0.09,
    brick_height: 0.09,
    tile_length: 0.3,
    tile_width: 0.3,
    grout_width: 0.003,
    grout_depth: 0.006,
    adhesive_thickness: 0.003,
    slab_thickness: 0.15
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      let descText = initialData.description || '';
      let mType = 'length';
      let matType = 'generic';
      let params: any = {};

      try {
        const json = JSON.parse(initialData.description);
        if (json && json.text_description) {
          descText = json.text_description;
          mType = json.measurement_type || 'length';
          matType = json.material_type || 'generic';
          params = json.parameters || {};
        }
      } catch (e) {}

      setFormData({
        item_code: initialData.item_code || '',
        description: descText,
        unit: initialData.unit || 'ft',
        unit_cost: Number(initialData.unit_cost) || 0,
        multiplier: Number(initialData.multiplier) || 1,
        color: initialData.color || '#38bdf8',
        measurement_type: mType,
        material_type: matType,
        wall_height: params.wall_height ?? 3,
        wall_thickness: params.wall_thickness ?? 0.23,
        brick_length: params.brick_length ?? 0.19,
        brick_width: params.brick_width ?? 0.09,
        brick_height: params.brick_height ?? 0.09,
        tile_length: params.tile_length ?? 0.3,
        tile_width: params.tile_width ?? 0.3,
        grout_width: params.grout_width ?? 0.003,
        grout_depth: params.grout_depth ?? 0.006,
        adhesive_thickness: params.adhesive_thickness ?? 0.003,
        slab_thickness: params.slab_thickness ?? 0.15
      });
    } else {
      setFormData({
        item_code: '',
        description: '',
        unit: 'ft',
        unit_cost: 0,
        multiplier: 1,
        color: '#38bdf8',
        measurement_type: 'length',
        material_type: 'generic',
        wall_height: 3,
        wall_thickness: 0.23,
        brick_length: 0.19,
        brick_width: 0.09,
        brick_height: 0.09,
        tile_length: 0.3,
        tile_width: 0.3,
        grout_width: 0.003,
        grout_depth: 0.006,
        adhesive_thickness: 0.003,
        slab_thickness: 0.15
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      const finalDescription = JSON.stringify({
        text_description: formData.description,
        measurement_type: formData.measurement_type,
        material_type: formData.material_type,
        parameters: {
          wall_height: formData.wall_height,
          wall_thickness: formData.wall_thickness,
          brick_length: formData.brick_length,
          brick_width: formData.brick_width,
          brick_height: formData.brick_height,
          tile_length: formData.tile_length,
          tile_width: formData.tile_width,
          grout_width: formData.grout_width,
          grout_depth: formData.grout_depth,
          adhesive_thickness: formData.adhesive_thickness,
          slab_thickness: formData.slab_thickness
        }
      });

      await onSubmit({
        item_code: formData.item_code,
        description: finalDescription,
        unit: formData.unit,
        unit_cost: formData.unit_cost,
        multiplier: formData.multiplier,
        color: formData.color
      });

      onClose();
    } catch (err) {
      alert("Error saving material");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-surface-card text-foreground border border-surface-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-surface-200 shrink-0">
          <h2 className="text-xl font-black text-foreground tracking-tight">
            {initialData ? 'Edit Material' : 'Add Material'}
          </h2>
          <button onClick={onClose} className="text-surface-400 hover:text-foreground transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto no-scrollbar flex-1">
          <div>
            <label className="block text-xs font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-1">Item Code *</label>
            <input 
              type="text"
              required
              value={formData.item_code}
              onChange={(e) => setFormData({...formData, item_code: e.target.value})}
              className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-100/40 border border-surface-200 rounded-lg text-sm focus:outline-none focus:border-accent text-foreground"
              placeholder="e.g. BRK-WALL-230"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-1">Description *</label>
            <input 
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-100/40 border border-surface-200 rounded-lg text-sm focus:outline-none focus:border-accent text-foreground"
              placeholder="e.g. Standard Brick Wall (230mm Outer)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-1">Unit</label>
              <input 
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
                className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-100/40 border border-surface-200 rounded-lg text-sm focus:outline-none focus:border-accent text-foreground"
                placeholder="e.g. m3"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-1">Unit Cost (₹)</label>
              <input 
                type="number"
                step="0.01"
                min="0"
                value={formData.unit_cost}
                onChange={(e) => setFormData({...formData, unit_cost: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-100/40 border border-surface-200 rounded-lg text-sm focus:outline-none focus:border-accent font-mono text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-1">Waste Multiplier</label>
              <input 
                type="number"
                step="0.01"
                min="1"
                value={formData.multiplier}
                onChange={(e) => setFormData({...formData, multiplier: parseFloat(e.target.value) || 1})}
                className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-100/40 border border-surface-200 rounded-lg text-sm focus:outline-none focus:border-accent font-mono text-foreground"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-1">Color</label>
              <div className="flex gap-2 items-center">
                <input 
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                  className="h-9 w-9 rounded cursor-pointer border border-surface-200 bg-transparent"
                />
                <input 
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                  className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-100/40 border border-surface-200 rounded-lg text-sm focus:outline-none focus:border-accent uppercase text-foreground"
                  placeholder="#000000"
                />
              </div>
            </div>
          </div>

          {/* Classification & Presets */}
          <div className="border-t border-surface-200 pt-3 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-1">Measurement Type</label>
              <select
                value={formData.measurement_type}
                onChange={e => {
                  const type = e.target.value;
                  let unit = 'ft';
                  let preset = 'generic';
                  if (type === 'area') unit = 'sqft';
                  else if (type === 'count') { unit = 'ea'; preset = 'count'; }
                  setFormData({ ...formData, measurement_type: type, unit, material_type: preset });
                }}
                className="w-full bg-surface-50 dark:bg-surface-100/40 text-xs px-2.5 py-2 border border-surface-200 rounded-lg outline-none focus:border-accent font-bold text-foreground cursor-pointer"
              >
                <option value="length" className="bg-surface-card dark:bg-surface-100 text-foreground">📏 Length</option>
                <option value="area" className="bg-surface-card dark:bg-surface-100 text-foreground">🔲 Area</option>
                <option value="count" className="bg-surface-card dark:bg-surface-100 text-foreground">📍 Count</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-1">Material Preset</label>
              <select
                value={formData.material_type}
                onChange={e => setFormData({...formData, material_type: e.target.value})}
                className="w-full bg-surface-50 dark:bg-surface-100/40 text-xs px-2.5 py-2 border border-surface-200 rounded-lg outline-none focus:border-accent font-bold text-foreground cursor-pointer"
              >
                {formData.measurement_type === 'length' && (
                  <>
                    <option value="generic" className="bg-surface-card dark:bg-surface-100 text-foreground">Generic Line</option>
                    <option value="brick" className="bg-surface-card dark:bg-surface-100 text-foreground">🧱 Brick Wall</option>
                  </>
                )}
                {formData.measurement_type === 'area' && (
                  <>
                    <option value="generic" className="bg-surface-card dark:bg-surface-100 text-foreground">Generic Area</option>
                    <option value="tile" className="bg-surface-card dark:bg-surface-100 text-foreground">🧱 Tile Floor</option>
                    <option value="concrete" className="bg-surface-card dark:bg-surface-100 text-foreground">🪨 Concrete Slab</option>
                  </>
                )}
                {formData.measurement_type === 'count' && (
                  <option value="count" className="bg-surface-card dark:bg-surface-100 text-foreground">Count Item</option>
                )}
              </select>
            </div>
          </div>

          {/* Dynamic Preset Inputs */}
          {formData.material_type === 'brick' && (
            <div className="space-y-3 bg-surface-50/60 dark:bg-surface-100/30 p-3 rounded-xl border border-surface-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[8px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-0.5">Wall Height (m)</label>
                  <input type="number" step="0.05" value={formData.wall_height} onChange={e => setFormData({...formData, wall_height: parseFloat(e.target.value) || 0})} className="w-full bg-surface-card border border-surface-200 rounded px-2.5 py-1 text-xs outline-none focus:border-accent text-foreground" />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-0.5">Wall Thickness (m)</label>
                  <input type="number" step="0.01" value={formData.wall_thickness} onChange={e => setFormData({...formData, wall_thickness: parseFloat(e.target.value) || 0})} className="w-full bg-surface-card border border-surface-200 rounded px-2.5 py-1 text-xs outline-none focus:border-accent text-foreground" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[8px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-0.5">Brick L (m)</label>
                  <input type="number" step="0.001" value={formData.brick_length} onChange={e => setFormData({...formData, brick_length: parseFloat(e.target.value) || 0})} className="w-full bg-surface-card border border-surface-200 rounded px-1.5 py-1 text-xs outline-none focus:border-accent text-foreground" />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-0.5">Brick W (m)</label>
                  <input type="number" step="0.001" value={formData.brick_width} onChange={e => setFormData({...formData, brick_width: parseFloat(e.target.value) || 0})} className="w-full bg-surface-card border border-surface-200 rounded px-1.5 py-1 text-xs outline-none focus:border-accent text-foreground" />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-0.5">Brick H (m)</label>
                  <input type="number" step="0.001" value={formData.brick_height} onChange={e => setFormData({...formData, brick_height: parseFloat(e.target.value) || 0})} className="w-full bg-surface-card border border-surface-200 rounded px-1.5 py-1 text-xs outline-none focus:border-accent text-foreground" />
                </div>
              </div>
            </div>
          )}

          {formData.material_type === 'tile' && (
            <div className="space-y-3 bg-surface-50/60 dark:bg-surface-100/30 p-3 rounded-xl border border-surface-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[8px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-0.5">Tile Length (m)</label>
                  <input type="number" step="0.01" value={formData.tile_length} onChange={e => setFormData({...formData, tile_length: parseFloat(e.target.value) || 0})} className="w-full bg-surface-card border border-surface-200 rounded px-2.5 py-1 text-xs outline-none focus:border-accent text-foreground" />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-0.5">Tile Width (m)</label>
                  <input type="number" step="0.01" value={formData.tile_width} onChange={e => setFormData({...formData, tile_width: parseFloat(e.target.value) || 0})} className="w-full bg-surface-card border border-surface-200 rounded px-2.5 py-1 text-xs outline-none focus:border-accent text-foreground" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[8px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-0.5">Grout W (m)</label>
                  <input type="number" step="0.001" value={formData.grout_width} onChange={e => setFormData({...formData, grout_width: parseFloat(e.target.value) || 0})} className="w-full bg-surface-card border border-surface-200 rounded px-1.5 py-1 text-xs outline-none focus:border-accent text-foreground" />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-0.5">Grout D (m)</label>
                  <input type="number" step="0.001" value={formData.grout_depth} onChange={e => setFormData({...formData, grout_depth: parseFloat(e.target.value) || 0})} className="w-full bg-surface-card border border-surface-200 rounded px-1.5 py-1 text-xs outline-none focus:border-accent text-foreground" />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-0.5">Adhesive Thk (m)</label>
                  <input type="number" step="0.001" value={formData.adhesive_thickness} onChange={e => setFormData({...formData, adhesive_thickness: parseFloat(e.target.value) || 0})} className="w-full bg-surface-card border border-surface-200 rounded px-1.5 py-1 text-xs outline-none focus:border-accent text-foreground" />
                </div>
              </div>
            </div>
          )}

          {formData.material_type === 'concrete' && (
            <div className="bg-surface-50/60 dark:bg-surface-100/30 p-3 rounded-xl border border-surface-200">
              <label className="block text-[8px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-0.5">Slab Thickness (m)</label>
              <input type="number" step="0.01" value={formData.slab_thickness} onChange={e => setFormData({...formData, slab_thickness: parseFloat(e.target.value) || 0})} className="w-full bg-surface-card border border-surface-200 rounded px-2.5 py-1 text-xs outline-none focus:border-accent text-foreground" />
            </div>
          )}

          <div className="pt-4 flex gap-3 justify-end border-t border-surface-200 mt-4 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-surface-500 hover:text-foreground transition-colors cursor-pointer"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-accent text-background text-sm font-bold uppercase tracking-widest rounded-xl hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20 disabled:opacity-50 cursor-pointer"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
