"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTurnkeyStore, TurnkeyRoom, Point } from "@/store/turnkey-store";
import { useEstimationStore } from "@/store/estimation-store";
import { TakeoffCanvas } from "@/components/estimation/TakeoffCanvas";
import { calcRoomMultiTradeBOQ, RoomAssemblyType, RoomAssemblyToggles, DEFAULT_ROOM_TOGGLES, FinishQuality } from "@/domains/boq/assemblies";
import { mergeShellAndRooms } from "@/domains/boq/turnkey-merger";
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  X, 
  Layers, 
  Home, 
  Bath, 
  Utensils, 
  Bed, 
  Coffee, 
  ShieldCheck, 
  SlidersHorizontal 
} from "lucide-react";

// ─── Room Type Presets ────────────────────────────────────────────────────────

const ROOM_PRESETS: { 
  id: RoomAssemblyType; 
  label: string; 
  icon: string; 
  defaultName: string;
  desc: string;
}[] = [
  { id: "living_bedroom", label: "Living / Dining", defaultName: "Living Room", icon: "🪑", desc: "Vitrified tiles, skirting, false ceiling & emulsion paint" },
  { id: "living_bedroom", label: "Master Bedroom",  defaultName: "Master Bedroom", icon: "🛏️", desc: "Vitrified tiles, skirting, false ceiling & emulsion paint" },
  { id: "living_bedroom", label: "Bedroom 2",       defaultName: "Bedroom 2", icon: "🛏️", desc: "Standard vitrified flooring & ceiling finishes" },
  { id: "toilet_bath",    label: "Toilet / Bath",   defaultName: "Attached Toilet", icon: "🚿", desc: "Anti-skid flooring & 2.1m glazed wall dado" },
  { id: "kitchen",        label: "Kitchen",         defaultName: "Kitchen", icon: "🍳", desc: "Anti-skid tiles, 0.6m counter dado & false ceiling" },
  { id: "balcony",        label: "Balcony / Deck",  defaultName: "Balcony", icon: "🌿", desc: "Rustic floor tiles & waterproofing PCC bed" },
  { id: "utility",        label: "Utility / Wash",  defaultName: "Utility Room", icon: "🧺", desc: "Anti-skid floor tiles & washing dado tiles" },
];

export function Stage3RoomAssembler() {
  const { 
    imageUrl, 
    pixelToMeterScale, 
    rooms, 
    footprintAreaM2,
    boundingLengthM,
    boundingWidthM,
    shellConfig,
    shellBOQ, 
    addRoom, 
    deleteRoom, 
    setRoomsDone, 
    setFinalBOQ,
    goNext 
  } = useTurnkeyStore();

  const { items, activeTool, setActiveTool } = useEstimationStore();

  // Modal State for Newly Traced Room
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [pendingPoints, setPendingPoints] = useState<Point[]>([]);
  const [pendingAreaM2, setPendingAreaM2] = useState(0);
  const [pendingPerimeterM, setPendingPerimeterM] = useState(0);

  // Form inside modal
  const [selectedType, setSelectedType] = useState<RoomAssemblyType>("living_bedroom");
  const [roomName, setRoomName] = useState("Living Room");
  const [roomHeightM, setRoomHeightM] = useState(shellConfig.floorHeightM || 3.0);
  const [finishQuality, setFinishQuality] = useState<FinishQuality>("standard");
  const [toggles, setToggles] = useState<RoomAssemblyToggles>(DEFAULT_ROOM_TOGGLES.living_bedroom);

  // Track item count to detect new polygon completion
  const [processedItemCount, setProcessedItemCount] = useState(items.length);

  // Auto-activate polygon tool when Stage 3 mounts
  useEffect(() => {
    setActiveTool("polygon");
  }, [setActiveTool]);

  // Watch for new polygon items drawn on the canvas
  useEffect(() => {
    if (items.length > processedItemCount) {
      const latest = items[items.length - 1];
      if ((latest.type === 'area' || (latest as any).tool_type === 'polygon') && latest.points && latest.points.length >= 3) {
        const pts = latest.points;

        // Compute Area
        let areaPx = 0;
        for (let i = 0; i < pts.length; i++) {
          const j = (i + 1) % pts.length;
          areaPx += pts[i].x * pts[j].y;
          areaPx -= pts[j].x * pts[i].y;
        }
        areaPx = Math.abs(areaPx) / 2;
        const areaM2 = parseFloat((areaPx * Math.pow(pixelToMeterScale, 2)).toFixed(2));

        // Compute Perimeter
        let perimPx = 0;
        for (let i = 0; i < pts.length; i++) {
          const j = (i + 1) % pts.length;
          const dx = pts[j].x - pts[i].x;
          const dy = pts[j].y - pts[i].y;
          perimPx += Math.sqrt(dx * dx + dy * dy);
        }
        const perimeterM = parseFloat((perimPx * pixelToMeterScale).toFixed(2));

        if (areaM2 > 0) {
          setPendingPoints(pts);
          setPendingAreaM2(areaM2);
          setPendingPerimeterM(perimeterM);
          
          // Auto-suggest name based on room count
          const nextIndex = rooms.length + 1;
          const defaultPreset = ROOM_PRESETS[Math.min(nextIndex - 1, ROOM_PRESETS.length - 1)];
          setSelectedType(defaultPreset.id);
          setRoomName(`${defaultPreset.defaultName} ${rooms.length > 0 ? nextIndex : ''}`.trim());
          setToggles(DEFAULT_ROOM_TOGGLES[defaultPreset.id]);
          setRoomHeightM(defaultPreset.id === 'toilet_bath' ? 2.7 : (shellConfig.floorHeightM || 3.0));
          
          setPendingModalOpen(true);
        }
      }
      setProcessedItemCount(items.length);
    }
  }, [items, processedItemCount, pixelToMeterScale, rooms.length, shellConfig.floorHeightM]);

  // Select Preset Handler
  const handleSelectPreset = (preset: typeof ROOM_PRESETS[0]) => {
    setSelectedType(preset.id);
    setRoomName(preset.defaultName);
    setToggles(DEFAULT_ROOM_TOGGLES[preset.id]);
    if (preset.id === 'toilet_bath') {
      setRoomHeightM(2.7);
    } else {
      setRoomHeightM(shellConfig.floorHeightM || 3.0);
    }
  };

  // Confirm Room Addition
  const handleConfirmRoom = () => {
    if (pendingAreaM2 <= 0) return;

    const lineItems = calcRoomMultiTradeBOQ(
      pendingAreaM2,
      pendingPerimeterM,
      selectedType,
      toggles,
      finishQuality,
      roomHeightM,
      roomName
    );

    const newRoom: TurnkeyRoom = {
      id: `room-${Date.now()}`,
      name: roomName,
      roomType: selectedType,
      points: pendingPoints,
      areaM2: pendingAreaM2,
      perimeterM: pendingPerimeterM,
      heightM: roomHeightM,
      finishQuality,
      toggles,
      boqItems: lineItems,
      color: '', // auto-assigned in store
    };

    addRoom(newRoom);
    setPendingModalOpen(false);
  };

  // Quick Preset Add Helper (if user wants to add standard rooms without manual drawing)
  const handleAddQuickRoom = (preset: typeof ROOM_PRESETS[0], areaSqFt: number = 150) => {
    const areaM2 = parseFloat((areaSqFt * 0.0929).toFixed(2));
    const side = Math.sqrt(areaM2);
    const perimeterM = parseFloat((side * 4).toFixed(2));

    const lineItems = calcRoomMultiTradeBOQ(
      areaM2,
      perimeterM,
      preset.id,
      DEFAULT_ROOM_TOGGLES[preset.id],
      'standard',
      3.0,
      preset.defaultName
    );

    const newRoom: TurnkeyRoom = {
      id: `room-${Date.now()}`,
      name: preset.defaultName,
      roomType: preset.id,
      points: [],
      areaM2,
      perimeterM,
      finishQuality: 'standard',
      toggles: DEFAULT_ROOM_TOGGLES[preset.id],
      boqItems: lineItems,
      color: '',
    };

    addRoom(newRoom);
  };

  // Final Merge & Navigation
  const handleCompleteTurnkey = () => {
    if (!shellBOQ) return;
    const totalBuaM2 = (footprintAreaM2 || 108.0) * (shellConfig.numFloors || 2);
    const merged = mergeShellAndRooms(shellBOQ, rooms, totalBuaM2);
    setFinalBOQ(merged);
    setRoomsDone(true);
    goNext();
  };

  // Calculations for sidebar stats
  const totalTracedAreaM2 = rooms.reduce((sum, r) => sum + r.areaM2, 0);
  const totalTracedSqFt   = Math.round(totalTracedAreaM2 * 10.7639);
  const totalRoomCost     = Math.round(rooms.reduce((sum, r) => sum + r.boqItems.reduce((s, i) => s + i.amount, 0), 0));

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-surface-50/50 dark:bg-surface-900/30 overflow-hidden relative">
      
      {/* ── Left/Main Canvas Area ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 relative border-r border-surface-200 dark:border-white/10">
        
        {/* Top Floating Instruction Banner */}
        <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between gap-3 shrink-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0">
              3
            </div>
            <p className="text-xs font-semibold text-foreground">
              <span className="font-black text-emerald-600 dark:text-emerald-400">Step 3:</span> Trace individual rooms (Bedrooms, Bathrooms, Kitchen) to auto-assign tiles, dado & false ceilings.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-surface-500 hidden sm:inline">
              {rooms.length} rooms traced ({totalTracedSqFt} sq.ft)
            </span>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative min-h-0">
          <TakeoffCanvas 
            imageUrl={imageUrl || ""} 
            allowedTools={['select', 'polygon']}
            hideMaterials={true}
            hideThickness={false}
          />
        </div>
      </div>

      {/* ── Right Sidebar: Room Registry & Live Multi-Trade Items ──────────── */}
      <div className="w-full md:w-96 bg-surface-card text-foreground border-t md:border-t-0 md:border-l border-surface-200 dark:border-white/10 flex flex-col justify-between shrink-0 overflow-hidden p-4 space-y-4">
        
        {/* Header & Stats */}
        <div className="space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider mb-1">
                <Home size={12} /> Room Finishes Registry
              </div>
              <h2 className="text-base font-black text-foreground tracking-tight">
                Traced Spaces ({rooms.length})
              </h2>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-surface-400 uppercase font-bold block">Finishes Total</span>
              <span className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400">
                ₹ {totalRoomCost.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Room Cards List */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
          {rooms.length === 0 ? (
            <div className="p-6 border-2 border-dashed border-surface-200 dark:border-white/10 rounded-2xl text-center space-y-3">
              <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Sparkles size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black text-foreground">No Rooms Traced Yet</h4>
                <p className="text-[11px] text-surface-400 max-w-[200px] mx-auto mt-0.5">
                  Draw a polygon around any room on the plan, or use quick presets below.
                </p>
              </div>

              {/* Quick Preset Buttons */}
              <div className="pt-2 border-t border-surface-100 dark:border-white/5 grid grid-cols-2 gap-1.5 text-left">
                {ROOM_PRESETS.slice(0, 4).map((p) => (
                  <button
                    key={p.defaultName}
                    onClick={() => handleAddQuickRoom(p, p.id === 'toilet_bath' ? 45 : 150)}
                    className="p-2 bg-surface-50 dark:bg-surface-800/40 hover:bg-surface-100 rounded-xl border border-surface-200 dark:border-white/10 text-[11px] font-bold text-foreground flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <span>{p.icon}</span>
                    <span className="truncate">+ {p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            rooms.map((room) => {
              const roomSubtotal = room.boqItems.reduce((s, i) => s + i.amount, 0);
              return (
                <div 
                  key={room.id}
                  className="p-3 rounded-2xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200/80 dark:border-white/10 hover:border-emerald-500/40 transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div 
                        className="w-3 h-3 rounded-full shrink-0 shadow-xs" 
                        style={{ backgroundColor: room.color || '#10b981' }} 
                      />
                      <span className="text-xs font-black text-foreground truncate">
                        {room.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono font-black text-foreground">
                        ₹ {Math.round(roomSubtotal).toLocaleString('en-IN')}
                      </span>
                      <button
                        onClick={() => deleteRoom(room.id)}
                        className="text-surface-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                        title="Delete room"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-surface-400 font-mono pt-1.5 border-t border-surface-200/60 dark:border-white/5">
                    <span>{Math.round(room.areaM2 * 10.7639)} sq.ft ({room.areaM2} m²)</span>
                    <span>{room.boqItems.length} Trade Items</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Action Button */}
        <div className="pt-3 border-t border-surface-200 dark:border-white/10 shrink-0 space-y-2">
          <button
            onClick={handleCompleteTurnkey}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 hover:scale-[1.02] transition-all cursor-pointer"
          >
            <span>Complete Turnkey Estimate</span>
            <ArrowRight size={14} />
          </button>
          <p className="text-[10px] text-surface-400 text-center">
            Merges structural shell with {rooms.length} itemized room finishes
          </p>
        </div>

      </div>

      {/* ── 📐 POPUP MODAL: Room Type & Trade Toggles ──────────────────────── */}
      {pendingModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface-card border border-surface-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                  New Room Detected
                </span>
                <h3 className="text-base font-black text-foreground">
                  Configure Room Assemblies
                </h3>
              </div>
              <button 
                onClick={() => setPendingModalOpen(false)}
                className="p-1.5 text-surface-400 hover:text-foreground rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 no-scrollbar">
              
              {/* Geometry Metrics Card */}
              <div className="p-3 bg-surface-50 dark:bg-surface-800/50 rounded-2xl border border-surface-200 dark:border-white/5 flex items-center justify-around text-center">
                <div>
                  <span className="text-[10px] text-surface-400 uppercase font-bold block">Floor Area</span>
                  <span className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400">
                    {Math.round(pendingAreaM2 * 10.7639)} sq.ft
                  </span>
                  <span className="text-[10px] text-surface-400 block font-mono">({pendingAreaM2} m²)</span>
                </div>
                <div className="h-8 w-px bg-surface-200 dark:bg-white/10" />
                <div>
                  <span className="text-[10px] text-surface-400 uppercase font-bold block">Perimeter</span>
                  <span className="text-sm font-mono font-black text-foreground">
                    {pendingPerimeterM} m
                  </span>
                  <span className="text-[10px] text-surface-400 block font-mono">({Math.round(pendingPerimeterM * 3.28084)} ft)</span>
                </div>
              </div>

              {/* 1. Room Name Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-surface-500">
                  Room Label
                </label>
                <input 
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs font-bold text-foreground outline-none focus:border-emerald-500"
                  placeholder="e.g. Master Bedroom, Attached Toilet"
                />
              </div>

              {/* 2. Room Clear Height */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-surface-500">
                    Room Ceiling / Wall Height
                  </label>
                  <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                    {roomHeightM}m ({(roomHeightM * 3.28084).toFixed(1)} ft)
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { val: 2.7, label: "2.7m", desc: "9 ft (Bath)" },
                    { val: 3.0, label: "3.0m", desc: "10 ft (Std)" },
                    { val: 3.3, label: "3.3m", desc: "11 ft" },
                    { val: 3.6, label: "3.6m", desc: "12 ft (High)" },
                  ].map((h) => (
                    <button
                      key={h.val}
                      type="button"
                      onClick={() => setRoomHeightM(h.val)}
                      className={`p-1.5 text-center rounded-xl border transition-all cursor-pointer flex flex-col items-center ${
                        roomHeightM === h.val
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-black shadow-xs'
                          : 'bg-surface-50 dark:bg-surface-800/40 border-surface-200 dark:border-white/5 text-foreground hover:border-surface-300'
                      }`}
                    >
                      <span className="text-xs font-bold">{h.label}</span>
                      <span className="text-[9px] opacity-70">{h.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Room Type Selector (Cards) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-surface-500">
                  Select Room Archetype
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ROOM_PRESETS.map((preset) => {
                    const isSelected = selectedType === preset.id && roomName.toLowerCase().includes(preset.label.toLowerCase().split('/')[0].trim());
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-black shadow-xs'
                            : 'bg-surface-50 dark:bg-surface-800/40 border-surface-200 dark:border-white/5 text-foreground hover:border-surface-300'
                        }`}
                      >
                        <span className="text-lg shrink-0">{preset.icon}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{preset.label}</div>
                          <div className="text-[10px] text-surface-400 line-clamp-1">{preset.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Trade Checkboxes (Auto-toggled based on room type) */}
              <div className="space-y-2 pt-2 border-t border-surface-100 dark:border-white/5">
                <label className="text-[11px] font-black uppercase tracking-wider text-surface-500">
                  Active Multi-Trade Assemblies
                </label>
                <div className="space-y-1.5">
                  {[
                    { key: 'flooring', label: selectedType === 'toilet_bath' ? 'Anti-Skid Ceramic Floor Tiles (300×300mm)' : 'Vitrified Floor Tiles (600×600mm)' },
                    { key: 'skirting', label: 'Matching Tile Skirting (100mm height, door deducted)' },
                    { key: 'dadoTiles', label: selectedType === 'toilet_bath' ? 'Glazed Wall Dado Tiles (up to 2.1m height)' : 'Kitchen Counter Wall Dado (0.6m height)' },
                    { key: 'falseCeiling', label: '12.5mm Gypsum False Ceiling on GI suspension' },
                    { key: 'paint', label: 'Acrylic Washable Emulsion Ceiling Paint (2-coat)' },
                    { key: 'pccBed', label: 'PCC 1:2:4 Sub-Base Levelling Bed (50mm)' },
                  ].map((t) => (
                    <label 
                      key={t.key}
                      className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-50 dark:bg-surface-800/30 border border-surface-200/60 dark:border-white/5 text-xs font-bold text-foreground cursor-pointer hover:bg-surface-100"
                    >
                      <input 
                        type="checkbox"
                        checked={Boolean(toggles[t.key as keyof RoomAssemblyToggles])}
                        onChange={(e) => setToggles({ ...toggles, [t.key]: e.target.checked })}
                        className="accent-emerald-600 rounded cursor-pointer"
                      />
                      <span>{t.label}</span>
                    </label>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-surface-50 dark:bg-surface-900/50 border-t border-surface-200 dark:border-white/10 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-surface-500 hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRoom}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/25 cursor-pointer transition-all"
              >
                <CheckCircle2 size={14} />
                <span>Save Room & Generate BOQ</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
