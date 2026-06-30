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
    unit: '',
    unit_cost: 0,
    multiplier: 1,
    color: '#D4AF37'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        item_code: initialData.item_code || '',
        description: initialData.description || '',
        unit: initialData.unit || '',
        unit_cost: Number(initialData.unit_cost) || 0,
        multiplier: Number(initialData.multiplier) || 1,
        color: initialData.color || '#D4AF37'
      });
    } else {
      setFormData({
        item_code: '',
        description: '',
        unit: '',
        unit_cost: 0,
        multiplier: 1,
        color: '#D4AF37'
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await onSubmit(formData);
      onClose();
    } catch (err) {
      alert("Error saving material");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-surface-200">
          <h2 className="text-xl font-black text-primary tracking-tight">
            {initialData ? 'Edit Material' : 'Add Material'}
          </h2>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-surface-500 uppercase tracking-widest mb-1">Item Code *</label>
            <input 
              type="text"
              required
              value={formData.item_code}
              onChange={(e) => setFormData({...formData, item_code: e.target.value})}
              className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              placeholder="e.g. 09-2900"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-surface-500 uppercase tracking-widest mb-1">Description</label>
            <input 
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              placeholder="e.g. Gypsum Board"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-surface-500 uppercase tracking-widest mb-1">Unit</label>
              <input 
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
                className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder="e.g. sqft"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-surface-500 uppercase tracking-widest mb-1">Unit Cost</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-surface-400">$</span>
                <input 
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData({...formData, unit_cost: parseFloat(e.target.value) || 0})}
                  className="w-full pl-7 pr-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-surface-500 uppercase tracking-widest mb-1">Waste Multiplier</label>
              <input 
                type="number"
                step="0.01"
                min="1"
                value={formData.multiplier}
                onChange={(e) => setFormData({...formData, multiplier: parseFloat(e.target.value) || 1})}
                className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-surface-500 uppercase tracking-widest mb-1">Color</label>
              <div className="flex gap-2 items-center">
                <input 
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                  className="h-9 w-9 rounded cursor-pointer border border-surface-200"
                />
                <input 
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                  className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm focus:outline-none focus:border-accent uppercase"
                  placeholder="#000000"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3 justify-end border-t border-surface-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-surface-600 hover:text-surface-900 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-accent text-background text-sm font-bold uppercase tracking-widest rounded-xl hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20 disabled:opacity-50"
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
