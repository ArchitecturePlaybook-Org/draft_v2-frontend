import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEstimationStore, MasterCatalogItem } from '@/store/estimation-store';
import { MousePointer2, Move, Ruler, Square, MapPin, Plus, X } from 'lucide-react';
import { projectsApi } from '@/domains/projects/api';
import { Spinner } from '@/components/ui/Spinner';

export const Toolbar = () => {
  const { activeTool, setActiveTool, activeMaterial, setActiveMaterial } = useEstimationStore();
  const [catalog, setCatalog] = useState<MasterCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Modal State
  const [newItem, setNewItem] = useState({
    item_code: '', description: '', unit: 'sqft', unit_cost: 0, multiplier: 1, color: '#38bdf8'
  });

  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
  const [isDraggingModal, setIsDraggingModal] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const data = await projectsApi.getMasterCatalog();
      setCatalog(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const added = await projectsApi.createMasterCatalogItem(newItem);
      await loadCatalog();
      setActiveMaterial(added);
      setShowAddModal(false);
      setModalPos({ x: 0, y: 0 });
    } catch (e) {
      alert("Failed to add template.");
    }
  };

  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'line', icon: Ruler, label: 'Length' },
    { id: 'polygon', icon: Square, label: 'Area' },
    { id: 'point', icon: MapPin, label: 'Count' },
    { id: 'calibrate', icon: Move, label: 'Calibrate' },
  ] as const;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-white/90 dark:bg-surface-100/90 backdrop-blur-md p-1.5 rounded-2xl border border-surface-200 shadow-xl flex items-center gap-1">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
            activeTool === tool.id 
              ? 'bg-accent/10 text-accent font-bold' 
              : 'text-surface-600 hover:bg-surface-50 hover:text-primary font-medium'
          }`}
          title={tool.label}
        >
          <tool.icon size={16} className={activeTool === tool.id ? 'stroke-[2.5px]' : ''} />
          <span className="text-xs">{tool.label}</span>
        </button>
      ))}

      <div className="w-px h-6 bg-surface-200 mx-1"></div>

      <div className="relative flex items-center px-2">
        <select 
          className="appearance-none bg-surface-50 border border-surface-200 rounded-lg px-3 py-1.5 text-xs font-bold text-primary outline-none focus:border-accent min-w-[200px]"
          value={activeMaterial?.id || ''}
          onChange={(e) => {
            if (e.target.value === 'ADD_NEW') {
              setShowAddModal(true);
              return;
            }
            if (!e.target.value) {
              setActiveMaterial(null);
            } else {
              const selected = catalog.find(item => item.id.toString() === e.target.value);
              setActiveMaterial(selected || null);
            }
          }}
        >
          <option value="">Generic (No Template)</option>
          {loading ? (
             <option disabled>Loading...</option>
          ) : (
             <optgroup label="Master Catalog">
               {catalog.map(item => (
                 <option key={item.id} value={item.id}>{item.item_code} - {item.description}</option>
               ))}
             </optgroup>
          )}
          <optgroup label="Actions">
             <option value="ADD_NEW">+ Add Custom Material</option>
          </optgroup>
        </select>
        {activeMaterial && (
          <div className="absolute right-6 w-3 h-3 rounded-full border border-surface-200" style={{ backgroundColor: activeMaterial.color }}></div>
        )}
      </div>

      {showAddModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed z-[9999] pointer-events-none"
          style={{ top: '50%', left: '50%', transform: `translate(calc(-50% + ${modalPos.x}px), calc(-50% + ${modalPos.y}px))` }}
        >
          <form 
            onSubmit={handleAddSubmit} 
            className="bg-background rounded-2xl shadow-2xl border border-surface-200 w-96 overflow-hidden pointer-events-auto flex flex-col"
            onPointerDown={(e) => {
              setIsDraggingModal(true);
              setDragStart({ x: e.clientX - modalPos.x, y: e.clientY - modalPos.y });
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (isDraggingModal) {
                setModalPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
              }
            }}
            onPointerUp={(e) => {
              setIsDraggingModal(false);
              e.currentTarget.releasePointerCapture(e.pointerId);
            }}
            style={{ cursor: isDraggingModal ? 'grabbing' : 'grab' }}
          >
            <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
              <h2 className="text-sm font-black text-primary tracking-tight">Add Custom Material</h2>
              <button type="button" onPointerDown={e => e.stopPropagation()} onClick={() => { setShowAddModal(false); setModalPos({x: 0, y: 0}); }} className="text-surface-400 hover:text-primary cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4" onPointerDown={e => e.stopPropagation()}>
              <div>
                <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-1">Item Code</label>
                <input required type="text" value={newItem.item_code} onChange={e => setNewItem({...newItem, item_code: e.target.value})} className="w-full bg-surface-50 text-sm px-3 py-2 border border-surface-200 rounded-lg focus:border-accent outline-none text-primary cursor-text" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-1">Description</label>
                <input required type="text" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} className="w-full bg-surface-50 text-sm px-3 py-2 border border-surface-200 rounded-lg focus:border-accent outline-none text-primary cursor-text" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-1">Unit</label>
                  <input required type="text" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} className="w-full bg-surface-50 text-sm px-3 py-2 border border-surface-200 rounded-lg focus:border-accent outline-none text-primary cursor-text" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-1">Color</label>
                  <input required type="color" value={newItem.color} onChange={e => setNewItem({...newItem, color: e.target.value})} className="w-full bg-surface-50 h-[38px] p-1 border border-surface-200 rounded-lg cursor-pointer" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-1">Unit Cost ($)</label>
                  <input required type="number" step="0.01" value={newItem.unit_cost} onChange={e => setNewItem({...newItem, unit_cost: parseFloat(e.target.value)})} className="w-full bg-surface-50 text-sm px-3 py-2 border border-surface-200 rounded-lg focus:border-accent outline-none font-mono text-primary cursor-text" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-1">Waste Multiplier</label>
                  <input required type="number" step="0.01" value={newItem.multiplier} onChange={e => setNewItem({...newItem, multiplier: parseFloat(e.target.value)})} className="w-full bg-surface-50 text-sm px-3 py-2 border border-surface-200 rounded-lg focus:border-accent outline-none font-mono text-primary cursor-text" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-surface-100 bg-surface-50 flex justify-end" onPointerDown={e => e.stopPropagation()}>
              <button type="submit" className="px-6 py-2 bg-accent text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-accent-light transition-colors cursor-pointer">
                Save Material
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
};
