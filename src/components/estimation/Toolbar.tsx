import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useEstimationStore, MasterCatalogItem } from '@/store/estimation-store';
import { MousePointer2, Move, Ruler, Square, MapPin, X, Sliders } from 'lucide-react';
import { projectsApi } from '@/domains/projects/api';

export const Toolbar = () => {
  const { 
    activeTool, 
    setActiveTool, 
    activeMaterial, 
    setActiveMaterial, 
    globalLineWidth, 
    setGlobalLineWidth
  } = useEstimationStore();

  const [catalog, setCatalog] = useState<MasterCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Modern Thickness Popover State
  const [isThicknessOpen, setIsThicknessOpen] = useState(false);
  const [thicknessPos, setThicknessPos] = useState({ top: 0, left: 0 });
  const thicknessRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  
  // Modal State
  const [newItem, setNewItem] = useState({
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

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        thicknessRef.current && !thicknessRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setIsThicknessOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleThicknessPopover = () => {
    if (!isThicknessOpen && thicknessRef.current) {
      const rect = thicknessRef.current.getBoundingClientRect();
      setThicknessPos({
        top: rect.bottom + 8,
        left: Math.max(16, rect.left)
      });
    }
    setIsThicknessOpen(prev => !prev);
  };

  const getItemMType = (item: MasterCatalogItem) => {
    try {
      const json = JSON.parse(item.description);
      if (json && json.measurement_type) return json.measurement_type;
    } catch (e) {}
    
    const text = ((item.item_code || '') + ' ' + (item.description || '') + ' ' + (item.unit || '')).toLowerCase();
    
    if (text.includes('brk') || text.includes('brick') || text.includes('wall') || text.includes('pipe') || text.includes('wire') || text.includes('length') || text.includes('line') || text.includes('beam') || text.includes('footing')) {
      return 'length';
    }
    if (text.includes('tile') || text.includes('slab') || text.includes('floor') || text.includes('marble') || text.includes('paint') || text.includes('area') || text.includes('roof') || text.includes('sqft') || text.includes('sqm')) {
      return 'area';
    }
    if (text.includes('chair') || text.includes('door') || text.includes('window') || text.includes('item') || text.includes('count') || text.includes('each') || text.includes('pcs') || text.includes('ea')) {
      return 'count';
    }

    const u = item.unit?.toLowerCase() || '';
    if (u.includes('sq') || u.includes('m2')) return 'area';
    if (u.includes('ea') || u.includes('pcs')) return 'count';
    return 'length';
  };

  const getItemDesc = (item: MasterCatalogItem) => {
    try {
      const json = JSON.parse(item.description);
      if (json && json.text_description) return json.text_description;
    } catch (e) {}
    return item.description;
  };

  // Auto-sync activeMaterial when switching tools
  useEffect(() => {
    if (catalog.length === 0) return;
    
    const targetType = activeTool === 'line' ? 'length'
                     : activeTool === 'polygon' ? 'area'
                     : activeTool === 'point' ? 'count'
                     : null;

    if (!targetType) return;

    if (activeMaterial && getItemMType(activeMaterial) !== targetType) {
      const firstMatch = catalog.find(i => getItemMType(i) === targetType);
      setActiveMaterial(firstMatch || null);
    }
  }, [activeTool, catalog, activeMaterial, setActiveMaterial]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const finalDescription = JSON.stringify({
        text_description: newItem.description,
        measurement_type: newItem.measurement_type,
        material_type: newItem.material_type,
        parameters: {
          wall_height: newItem.wall_height,
          wall_thickness: newItem.wall_thickness,
          brick_length: newItem.brick_length,
          brick_width: newItem.brick_width,
          brick_height: newItem.brick_height,
          tile_length: newItem.tile_length,
          tile_width: newItem.tile_width,
          grout_width: newItem.grout_width,
          grout_depth: newItem.grout_depth,
          adhesive_thickness: newItem.adhesive_thickness,
          slab_thickness: newItem.slab_thickness
        }
      });
      
      const added = await projectsApi.createMasterCatalogItem({
        item_code: newItem.item_code,
        description: finalDescription,
        unit: newItem.unit,
        unit_cost: newItem.unit_cost,
        multiplier: newItem.multiplier,
        color: newItem.color
      });
      await loadCatalog();
      setActiveMaterial(added);
      setShowAddModal(false);
      setModalPos({ x: 0, y: 0 });
    } catch (e) {
      alert("Failed to add template.");
    }
  };

  const tools = [
    { id: 'select', label: 'Select Tool', icon: MousePointer2 },
    { id: 'calibrate', label: 'Calibrate Scale', icon: Move },
    { id: 'line', label: 'Line (Length)', icon: Ruler },
    { id: 'polygon', label: 'Area (Polygon)', icon: Square },
    { id: 'point', label: 'Count (Point)', icon: MapPin },
  ] as const;

  return (
    <div className="w-full max-w-full overflow-x-auto no-scrollbar bg-surface-card border-2 border-surface-300 dark:border-surface-200 shadow-2xl rounded-2xl p-1.5 mb-2 z-20 pointer-events-auto shrink-0 relative text-foreground">
      
      <div className="flex items-center gap-1.5 min-w-max">
        
        {/* 🎨 ICON-ONLY TOOL BUTTONS WITH INSTANT CUSTOM TOOLTIPS */}
        <div className="flex items-center gap-1 shrink-0">
          {tools.map((tool) => (
            <div key={tool.id} className="relative group">
              <button
                type="button"
                title={tool.label}
                onClick={() => setActiveTool(tool.id)}
                className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all cursor-pointer ${
                  activeTool === tool.id 
                    ? 'bg-accent text-background font-bold shadow-md shadow-accent/20 scale-105' 
                    : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-200/60 hover:text-foreground font-medium'
                }`}
              >
                <tool.icon size={18} className={activeTool === tool.id ? 'stroke-[2.5px]' : ''} />
              </button>

              {/* Instant, Premium Floating Tooltip Above Button */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 px-2.5 py-1 bg-surface-900 dark:bg-surface-100 text-white dark:text-surface-900 text-[10px] font-black uppercase tracking-wider rounded-lg shadow-xl border border-white/10 dark:border-surface-200 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-75 ease-out z-50 whitespace-nowrap scale-95 group-hover:scale-100">
                {tool.label}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-surface-900 dark:bg-surface-100 rotate-45 border-r border-b border-white/10 dark:border-surface-200" />
              </div>
            </div>
          ))}
        </div>

        <div className="w-px h-6 bg-surface-200 mx-1 shrink-0"></div>

        {/* 🎛️ MODERN LINE THICKNESS POPOVER SELECTOR */}
        <div className="relative shrink-0 group" ref={thicknessRef}>
          <button
            type="button"
            title="Adjust Line Thickness"
            onClick={toggleThicknessPopover}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface-50 dark:bg-surface-100/40 border border-surface-200 hover:border-accent rounded-xl text-xs font-bold text-foreground transition-all cursor-pointer shadow-2xs"
          >
            <Sliders size={15} className="text-surface-400 group-hover:text-accent transition-colors" />
            <span className="text-[11px] font-mono font-black">{globalLineWidth || 2}px</span>
            <div 
              className="w-5 rounded-full bg-accent transition-all"
              style={{ height: `${Math.max(2, Math.min(10, globalLineWidth || 2))}px` }}
            ></div>
          </button>

          {/* Instant Tooltip for Thickness */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 px-2.5 py-1 bg-surface-900 dark:bg-surface-100 text-white dark:text-surface-900 text-[10px] font-black uppercase tracking-wider rounded-lg shadow-xl border border-white/10 dark:border-surface-200 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-75 ease-out z-50 whitespace-nowrap scale-95 group-hover:scale-100">
            Line Thickness
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-surface-900 dark:bg-surface-100 rotate-45 border-r border-b border-white/10 dark:border-surface-200" />
          </div>
        </div>

        <div className="w-px h-6 bg-surface-200 mx-1 shrink-0"></div>

        {/* 🧱 ORIGINAL NATIVE MATERIAL SELECT MENU (CLEAN & SIMPLE) */}
        <div className="relative flex items-center px-2 shrink-0">
          <select 
            className="appearance-none bg-surface-50 dark:bg-surface-100/40 border border-surface-200 rounded-xl px-3 py-1.5 pr-8 text-xs font-bold text-foreground outline-none focus:border-accent min-w-[200px] sm:min-w-[240px] max-w-[300px] cursor-pointer truncate shadow-2xs"
            value={activeMaterial?.id || ''}
            onChange={(e) => {
              if (e.target.value === 'ADD_NEW') {
                const currentMType = activeTool === 'line' ? 'length' : activeTool === 'polygon' ? 'area' : activeTool === 'point' ? 'count' : 'length';
                const defaultUnit = currentMType === 'area' ? 'sqft' : currentMType === 'count' ? 'ea' : 'ft';
                const defaultPreset = currentMType === 'count' ? 'count' : 'generic';
                setNewItem({
                  ...newItem,
                  measurement_type: currentMType,
                  unit: defaultUnit,
                  material_type: defaultPreset
                });
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
            <option value="" className="bg-surface-card dark:bg-surface-100 text-foreground">Generic (No Template)</option>
            {loading ? (
               <option disabled className="bg-surface-card dark:bg-surface-100 text-foreground">Loading...</option>
            ) : (() => {
              const targetType = activeTool === 'line' ? 'length'
                               : activeTool === 'polygon' ? 'area'
                               : activeTool === 'point' ? 'count'
                               : null;

              // Strictly filter by target measurement type if a tool is active
              if (targetType) {
                const matching = catalog.filter(i => getItemMType(i) === targetType);
                const labelText = targetType === 'length' ? '📏 Length Materials'
                                : targetType === 'area' ? '🔲 Area Materials'
                                : '📍 Count Items';

                return (
                  <optgroup label={labelText} className="bg-surface-card dark:bg-surface-100 text-foreground">
                    {matching.length > 0 ? (
                      matching.map(item => (
                        <option key={item.id} value={item.id} className="bg-surface-card dark:bg-surface-100 text-foreground">{item.item_code} - {getItemDesc(item)}</option>
                      ))
                    ) : (
                      <option disabled className="bg-surface-card dark:bg-surface-100 text-foreground">No {targetType} materials found</option>
                    )}
                  </optgroup>
                );
              }

              // Default grouped by measurement type
              const lengthGroup = catalog.filter(i => getItemMType(i) === 'length');
              const areaGroup = catalog.filter(i => getItemMType(i) === 'area');
              const countGroup = catalog.filter(i => getItemMType(i) === 'count');

              return (
                <>
                  {lengthGroup.length > 0 && (
                    <optgroup label="📏 Length Materials" className="bg-surface-card dark:bg-surface-100 text-foreground">
                      {lengthGroup.map(item => (
                        <option key={item.id} value={item.id} className="bg-surface-card dark:bg-surface-100 text-foreground">{item.item_code} - {getItemDesc(item)}</option>
                      ))}
                    </optgroup>
                  )}
                  {areaGroup.length > 0 && (
                    <optgroup label="🔲 Area Materials" className="bg-surface-card dark:bg-surface-100 text-foreground">
                      {areaGroup.map(item => (
                        <option key={item.id} value={item.id} className="bg-surface-card dark:bg-surface-100 text-foreground">{item.item_code} - {getItemDesc(item)}</option>
                      ))}
                    </optgroup>
                  )}
                  {countGroup.length > 0 && (
                    <optgroup label="📍 Count Items" className="bg-surface-card dark:bg-surface-100 text-foreground">
                      {countGroup.map(item => (
                        <option key={item.id} value={item.id} className="bg-surface-card dark:bg-surface-100 text-foreground">{item.item_code} - {getItemDesc(item)}</option>
                      ))}
                    </optgroup>
                  )}
                </>
              );
            })()}
            <optgroup label="Actions" className="bg-surface-card dark:bg-surface-100 text-foreground">
               <option value="ADD_NEW" className="bg-surface-card dark:bg-surface-100 text-foreground">+ Add Custom Material</option>
            </optgroup>
          </select>
          {activeMaterial && (
            <div className="absolute right-6 w-3 h-3 rounded-full border border-surface-200 shadow-2xs" style={{ backgroundColor: activeMaterial.color }}></div>
          )}
        </div>
      </div>

      {/* 🎛️ Floating Thickness Popover Portaled to document.body */}
      {isThicknessOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={popoverRef}
          className="fixed z-[9999] w-64 p-3 bg-surface-card text-foreground rounded-2xl border-2 border-surface-300 dark:border-surface-200 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
          style={{ top: `${thicknessPos.top}px`, left: `${thicknessPos.left}px` }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-surface-400">Line Thickness</span>
            <span className="text-xs font-mono font-bold text-accent">{globalLineWidth || 2} px</span>
          </div>

          {/* Live Stroke Preview Box */}
          <div className="h-10 bg-surface-50 dark:bg-surface-200/50 rounded-xl border border-surface-200 flex items-center justify-center p-2">
            <div 
              className="w-full bg-accent rounded-full transition-all"
              style={{ height: `${globalLineWidth || 2}px` }}
            ></div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="grid grid-cols-5 gap-1">
            {[1, 2, 4, 8, 12].map(size => (
              <button
                key={size}
                type="button"
                onClick={() => setGlobalLineWidth(size)}
                className={`py-1 text-[10px] font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                  globalLineWidth === size 
                    ? 'bg-accent border-accent text-background font-black shadow-xs' 
                    : 'bg-surface-50 dark:bg-surface-200/60 border-surface-200 text-foreground hover:bg-surface-100'
                }`}
              >
                {size}px
              </button>
            ))}
          </div>

          {/* Custom Range Slider */}
          <input 
            type="range"
            min="1"
            max="20"
            value={globalLineWidth || 2}
            onChange={(e) => setGlobalLineWidth(Number(e.target.value))}
            className="w-full accent-accent cursor-pointer"
          />
        </div>,
        document.body
      )}

      {/* Custom Material Popup Modal Portaled to document.body */}
      {showAddModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed z-[9999] pointer-events-none"
          style={{ top: '50%', left: '50%', transform: `translate(calc(-50% + ${modalPos.x}px), calc(-50% + ${modalPos.y}px))` }}
        >
          <form 
            onSubmit={handleAddSubmit} 
            className="bg-surface-card text-foreground rounded-2xl shadow-2xl border border-surface-200 w-96 overflow-hidden pointer-events-auto flex flex-col"
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
            <div className="px-6 py-4 border-b border-surface-200 flex items-center justify-between">
              <h2 className="text-sm font-black text-foreground tracking-tight">Add Custom Material</h2>
              <button type="button" onPointerDown={e => e.stopPropagation()} onClick={() => { setShowAddModal(false); setModalPos({x: 0, y: 0}); }} className="text-surface-400 hover:text-foreground cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar" onPointerDown={e => e.stopPropagation()}>
              <div>
                <label className="block text-[10px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-1">Item Code</label>
                <input required type="text" value={newItem.item_code} onChange={e => setNewItem({...newItem, item_code: e.target.value})} className="w-full bg-surface-50 dark:bg-surface-100/40 text-sm px-3 py-2 border border-surface-200 rounded-lg focus:border-accent outline-none text-foreground cursor-text" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-1">Description</label>
                <input required type="text" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} className="w-full bg-surface-50 dark:bg-surface-100/40 text-sm px-3 py-2 border border-surface-200 rounded-lg focus:border-accent outline-none text-foreground cursor-text" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-1">Unit</label>
                  <input required type="text" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} className="w-full bg-surface-50 dark:bg-surface-100/40 text-sm px-3 py-2 border border-surface-200 rounded-lg focus:border-accent outline-none text-foreground cursor-text" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-1">Color</label>
                  <input required type="color" value={newItem.color} onChange={e => setNewItem({...newItem, color: e.target.value})} className="w-full bg-surface-50 dark:bg-surface-100/40 h-[38px] p-1 border border-surface-200 rounded-lg cursor-pointer" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-1">Unit Cost (₹)</label>
                  <input required type="number" step="0.01" value={newItem.unit_cost} onChange={e => setNewItem({...newItem, unit_cost: parseFloat(e.target.value)})} className="w-full bg-surface-50 dark:bg-surface-100/40 text-sm px-3 py-2 border border-surface-200 rounded-lg focus:border-accent outline-none font-mono text-foreground cursor-text" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-1">Waste Multiplier</label>
                  <input required type="number" step="0.01" value={newItem.multiplier} onChange={e => setNewItem({...newItem, multiplier: parseFloat(e.target.value)})} className="w-full bg-surface-50 dark:bg-surface-100/40 text-sm px-3 py-2 border border-surface-200 rounded-lg focus:border-accent outline-none font-mono text-foreground cursor-text" />
                </div>
              </div>

              <div className="border-t border-surface-200 pt-3 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-1">Measurement Type</label>
                  <select
                    value={newItem.measurement_type}
                    onChange={e => {
                      const type = e.target.value;
                      let unit = 'ft';
                      let preset = 'generic';
                      if (type === 'area') {
                        unit = 'sqft';
                      } else if (type === 'count') {
                        unit = 'ea';
                        preset = 'count';
                      }
                      setNewItem({
                        ...newItem,
                        measurement_type: type,
                        unit: unit,
                        material_type: preset
                      });
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
                    value={newItem.material_type}
                    onChange={e => setNewItem({...newItem, material_type: e.target.value})}
                    className="w-full bg-surface-50 dark:bg-surface-100/40 text-xs px-2.5 py-2 border border-surface-200 rounded-lg outline-none focus:border-accent font-bold text-foreground cursor-pointer"
                  >
                    {newItem.measurement_type === 'length' && (
                      <>
                        <option value="generic" className="bg-surface-card dark:bg-surface-100 text-foreground">Generic Line</option>
                        <option value="brick" className="bg-surface-card dark:bg-surface-100 text-foreground">🧱 Brick Wall</option>
                      </>
                    )}
                    {newItem.measurement_type === 'area' && (
                      <>
                        <option value="generic" className="bg-surface-card dark:bg-surface-100 text-foreground">Generic Area</option>
                        <option value="tile" className="bg-surface-card dark:bg-surface-100 text-foreground">🧱 Tile Floor</option>
                        <option value="concrete" className="bg-surface-card dark:bg-surface-100 text-foreground">🪨 Concrete Slab</option>
                      </>
                    )}
                    {newItem.measurement_type === 'count' && (
                      <option value="count" className="bg-surface-card dark:bg-surface-100 text-foreground">Count Item</option>
                    )}
                  </select>
                </div>
              </div>

              {newItem.material_type === 'brick' && (
                <div className="space-y-3 bg-surface-50/60 dark:bg-surface-100/30 p-3 rounded-xl border border-surface-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[8px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-0.5">Wall Height (m)</label>
                      <input type="number" step="0.05" value={newItem.wall_height} onChange={e => setNewItem({...newItem, wall_height: parseFloat(e.target.value) || 0})} className="w-full bg-surface-card border border-surface-200 rounded px-2.5 py-1 text-xs outline-none focus:border-accent text-foreground cursor-text" />
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-0.5">Wall Thickness (m)</label>
                      <input type="number" step="0.01" value={newItem.wall_thickness} onChange={e => setNewItem({...newItem, wall_thickness: parseFloat(e.target.value) || 0})} className="w-full bg-surface-card border border-surface-200 rounded px-2.5 py-1 text-xs outline-none focus:border-accent text-foreground cursor-text" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[8px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-0.5">Brick L (m)</label>
                      <input type="number" step="0.001" value={newItem.brick_length} onChange={e => setNewItem({...newItem, brick_length: parseFloat(e.target.value) || 0})} className="w-full bg-surface-card border border-surface-200 rounded px-1.5 py-1 text-xs outline-none focus:border-accent text-foreground cursor-text" />
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-0.5">Brick W (m)</label>
                      <input type="number" step="0.001" value={newItem.brick_width} onChange={e => setNewItem({...newItem, brick_width: parseFloat(e.target.value) || 0})} className="w-full bg-surface-card border border-surface-200 rounded px-1.5 py-1 text-xs outline-none focus:border-accent text-foreground cursor-text" />
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold text-surface-400 uppercase tracking-widest mb-0.5">Brick H (m)</label>
                      <input type="number" step="0.001" value={newItem.brick_height} onChange={e => setNewItem({...newItem, brick_height: parseFloat(e.target.value) || 0})} className="w-full bg-surface-card border border-surface-200 rounded px-1.5 py-1 text-xs outline-none focus:border-accent text-foreground cursor-text" />
                    </div>
                  </div>
                </div>
              )}

              {newItem.material_type === 'tile' && (
                <div className="space-y-3 bg-surface-50/60 dark:bg-surface-100/30 p-3 rounded-xl border border-surface-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[8px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-0.5">Tile Length (m)</label>
                      <input type="number" step="0.01" value={newItem.tile_length} onChange={e => setNewItem({...newItem, tile_length: parseFloat(e.target.value) || 0})} className="w-full bg-surface-card border border-surface-200 rounded px-2.5 py-1 text-xs outline-none focus:border-accent text-foreground cursor-text" />
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-0.5">Tile Width (m)</label>
                      <input type="number" step="0.01" value={newItem.tile_width} onChange={e => setNewItem({...newItem, tile_width: parseFloat(e.target.value) || 0})} className="w-full bg-surface-card border border-surface-200 rounded px-2.5 py-1 text-xs outline-none focus:border-accent text-foreground cursor-text" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[8px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-0.5">Grout W (m)</label>
                      <input type="number" step="0.001" value={newItem.grout_width} onChange={e => setNewItem({...newItem, grout_width: parseFloat(e.target.value) || 0})} className="w-full bg-surface-card border border-surface-200 rounded px-1.5 py-1 text-xs outline-none focus:border-accent text-foreground cursor-text" />
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-0.5">Grout D (m)</label>
                      <input type="number" step="0.001" value={newItem.grout_depth} onChange={e => setNewItem({...newItem, grout_depth: parseFloat(e.target.value) || 0})} className="w-full bg-surface-card border border-surface-200 rounded px-1.5 py-1 text-xs outline-none focus:border-accent text-foreground cursor-text" />
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-0.5">Adhesive Thk (m)</label>
                      <input type="number" step="0.001" value={newItem.adhesive_thickness} onChange={e => setNewItem({...newItem, adhesive_thickness: parseFloat(e.target.value) || 0})} className="w-full bg-surface-card border border-surface-200 rounded px-1.5 py-1 text-xs outline-none focus:border-accent text-foreground cursor-text" />
                    </div>
                  </div>
                </div>
              )}

              {newItem.material_type === 'concrete' && (
                <div className="bg-surface-50/60 dark:bg-surface-100/30 p-3 rounded-xl border border-surface-200">
                  <label className="block text-[8px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-0.5">Slab Thickness (m)</label>
                  <input type="number" step="0.01" value={newItem.slab_thickness} onChange={e => setNewItem({...newItem, slab_thickness: parseFloat(e.target.value) || 0})} className="w-full bg-surface-card border border-surface-200 rounded px-2.5 py-1 text-xs outline-none focus:border-accent text-foreground cursor-text" />
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-surface-200 bg-surface-50/60 dark:bg-surface-100/30 flex justify-end" onPointerDown={e => e.stopPropagation()}>
              <button type="submit" className="px-6 py-2 bg-accent text-background font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20 cursor-pointer">
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
