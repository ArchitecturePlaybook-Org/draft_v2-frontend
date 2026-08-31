"use client";
/**
 * RoomComposerPanel — Card-Based Room Entry (Replaces Sliders)
 * ============================================================
 * Architect adds room cards. Each card has:
 *   - Room type (preset emoji + name)
 *   - Width × Length in ft (familiar unit for Indian architects)
 *   - Automatic assembly toggles (toilet = dado, bedroom = false ceiling, etc.)
 * Live totals: carpet area, flooring area, wall area, skirting length.
 */

import React, { useState, useCallback } from "react";
import { Plus, X, Settings2, ChevronDown, ChevronUp } from "lucide-react";

export type RoomTypeKey = "living" | "master_bed" | "bed" | "toilet" | "kitchen" | "balcony" | "dining" | "utility" | "store";

export interface RoomCard {
  id: string;
  type: RoomTypeKey;
  name: string;
  widthFt: number;
  lengthFt: number;
  height: number; // metres
  falseCeiling: boolean;
  dadoTiles: boolean;
  flooring: boolean;
  paint: boolean;
}

const ROOM_PRESETS: Record<RoomTypeKey, { label: string; icon: string; w: number; l: number; falseCeiling: boolean; dadoTiles: boolean; flooring: boolean; paint: boolean }> = {
  living:     { label: "Living Room",    icon: "🪑", w: 14, l: 18, falseCeiling: true,  dadoTiles: false, flooring: true, paint: true },
  dining:     { label: "Dining Room",    icon: "🍽️", w: 11, l: 13, falseCeiling: true,  dadoTiles: false, flooring: true, paint: true },
  master_bed: { label: "Master Bedroom", icon: "🛏️", w: 12, l: 14, falseCeiling: true,  dadoTiles: false, flooring: true, paint: true },
  bed:        { label: "Bedroom",        icon: "🛏️", w: 10, l: 12, falseCeiling: false, dadoTiles: false, flooring: true, paint: true },
  toilet:     { label: "Toilet / Bath",  icon: "🚿", w: 5,  l: 7,  falseCeiling: false, dadoTiles: true,  flooring: true, paint: false },
  kitchen:    { label: "Kitchen",        icon: "🍳", w: 9,  l: 11, falseCeiling: true,  dadoTiles: true,  flooring: true, paint: true },
  balcony:    { label: "Balcony",        icon: "🌿", w: 5,  l: 9,  falseCeiling: false, dadoTiles: false, flooring: true, paint: false },
  utility:    { label: "Utility Room",   icon: "🧺", w: 5,  l: 7,  falseCeiling: false, dadoTiles: true,  flooring: true, paint: true },
  store:      { label: "Store Room",     icon: "📦", w: 6,  l: 8,  falseCeiling: false, dadoTiles: false, flooring: true, paint: false },
};

function ft2m(ft: number) { return ft * 0.3048; }
function m2ft(m: number) { return m / 0.3048; }

interface RoomComposerPanelProps {
  rooms: RoomCard[];
  onRoomsChange: (rooms: RoomCard[]) => void;
  numFloors: number;
  onNumFloorsChange: (n: number) => void;
  activeScopes: Record<string, boolean>;
  onToggleScope: (key: string) => void;
}

export function RoomComposerPanel({
  rooms, onRoomsChange, numFloors, onNumFloorsChange, activeScopes, onToggleScope,
}: RoomComposerPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const addRoom = useCallback((type: RoomTypeKey) => {
    const preset = ROOM_PRESETS[type];
    const newRoom: RoomCard = {
      id: crypto.randomUUID(),
      type,
      name: preset.label,
      widthFt: preset.w,
      lengthFt: preset.l,
      height: 3.0,
      falseCeiling: preset.falseCeiling,
      dadoTiles: preset.dadoTiles,
      flooring: preset.flooring,
      paint: preset.paint,
    };
    onRoomsChange([...rooms, newRoom]);
    setShowAddMenu(false);
    setExpandedId(newRoom.id);
  }, [rooms, onRoomsChange]);

  const removeRoom = useCallback((id: string) => {
    onRoomsChange(rooms.filter((r) => r.id !== id));
  }, [rooms, onRoomsChange]);

  const updateRoom = useCallback((id: string, patch: Partial<RoomCard>) => {
    onRoomsChange(rooms.map((r) => r.id === id ? { ...r, ...patch } : r));
  }, [rooms, onRoomsChange]);

  // Derived metrics
  const totalCarpetSqFt = rooms.reduce((s, r) => s + r.widthFt * r.lengthFt, 0);
  const totalCarpetSqM = rooms.reduce((s, r) => s + ft2m(r.widthFt) * ft2m(r.lengthFt), 0);
  const totalPerimeterM = rooms.reduce((s, r) => s + 2 * (ft2m(r.widthFt) + ft2m(r.lengthFt)), 0);

  return (
    <div className="space-y-4">
      {/* Header metrics */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Carpet Area", value: `${totalCarpetSqFt.toFixed(0)} sq.ft`, sub: `${totalCarpetSqM.toFixed(1)} m²` },
          { label: "Rooms", value: `${rooms.length}`, sub: `${numFloors} floor${numFloors > 1 ? "s" : ""}` },
          { label: "Wall Perimeter", value: `${totalPerimeterM.toFixed(1)} m`, sub: `All rooms combined` },
        ].map((m) => (
          <div key={m.label} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <div className="text-[10px] text-slate-400 font-bold uppercase truncate">{m.label}</div>
            <div className="text-sm font-black text-slate-900 mt-0.5">{m.value}</div>
            <div className="text-[9px] text-slate-400">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Floor selector */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700">Number of Floors</label>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { val: 1, label: "Ground" },
            { val: 2, label: "G+1" },
            { val: 3, label: "G+2" },
            { val: 4, label: "G+3" },
          ].map((f) => (
            <button
              key={f.val}
              onClick={() => onNumFloorsChange(f.val)}
              className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                numFloors === f.val
                  ? "bg-emerald-800 text-white border-emerald-900 shadow-sm"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-400">Rooms are replicated across floors for structure calculation.</p>
      </div>

      {/* Room cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">Room Layout</span>
          <span className="text-[10px] text-slate-400">{rooms.length} room{rooms.length !== 1 ? "s" : ""}</span>
        </div>

        {rooms.length === 0 && (
          <div className="py-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
            <div className="text-2xl mb-2">🏠</div>
            <div className="text-xs font-bold">No rooms added yet</div>
            <div className="text-[10px] mt-1">Click "+ Add Room" below to start</div>
          </div>
        )}

        {rooms.map((room) => {
          const preset = ROOM_PRESETS[room.type];
          const isExpanded = expandedId === room.id;
          const areaSqFt = room.widthFt * room.lengthFt;

          return (
            <div key={room.id} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
              {/* Card Header */}
              <div className="flex items-center justify-between p-3">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : room.id)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer"
                >
                  <span className="text-lg">{preset.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black text-slate-800 truncate">{room.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {room.widthFt}&apos;×{room.lengthFt}&apos; · {areaSqFt} sq.ft
                      {room.falseCeiling ? " · FC" : ""}
                      {room.dadoTiles ? " · Dado" : ""}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={12} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={12} className="text-slate-400 flex-shrink-0" />}
                </button>
                <button
                  onClick={() => removeRoom(room.id)}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer ml-1"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Expanded Controls */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-slate-200 space-y-3">
                  {/* Name */}
                  <input
                    className="w-full text-xs font-bold border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-400"
                    value={room.name}
                    onChange={(e) => updateRoom(room.id, { name: e.target.value })}
                    placeholder="Room name"
                  />

                  {/* Dimensions */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 mb-1">Width (ft)</div>
                      <input
                        type="number"
                        className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-400"
                        value={room.widthFt}
                        min={4} max={60} step={0.5}
                        onChange={(e) => updateRoom(room.id, { widthFt: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 mb-1">Length (ft)</div>
                      <input
                        type="number"
                        className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-400"
                        value={room.lengthFt}
                        min={4} max={60} step={0.5}
                        onChange={(e) => updateRoom(room.id, { lengthFt: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  {/* Area feedback */}
                  <div className="text-[10px] text-emerald-700 font-bold bg-emerald-50 rounded-lg px-2 py-1">
                    {areaSqFt} sq.ft = {(ft2m(room.widthFt) * ft2m(room.lengthFt)).toFixed(1)} m²
                  </div>

                  {/* Finish toggles */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Finishes & Trades</div>
                    {(["flooring", "falseCeiling", "dadoTiles", "paint"] as const).map((key) => {
                      const labels: Record<string, string> = {
                        flooring: "🪵 Vitrified Flooring",
                        falseCeiling: "✨ False Ceiling (Gypsum)",
                        dadoTiles: "🚿 Dado / Wall Tiles",
                        paint: "🎨 Ceiling Paint",
                      };
                      return (
                        <label key={key} className="flex items-center justify-between text-[11px] py-1 cursor-pointer">
                          <span className="text-slate-700 font-medium">{labels[key]}</span>
                          <input
                            type="checkbox"
                            checked={Boolean(room[key])}
                            onChange={() => updateRoom(room.id, { [key]: !room[key] })}
                            className="w-3.5 h-3.5 accent-emerald-700 rounded cursor-pointer"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Room Menu */}
      <div className="relative">
        <button
          onClick={() => setShowAddMenu((o) => !o)}
          className="w-full py-2.5 rounded-xl bg-white border-2 border-dashed border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Plus size={14} />
          Add Room
        </button>
        {showAddMenu && (
          <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 grid grid-cols-3 gap-1">
            {(Object.keys(ROOM_PRESETS) as RoomTypeKey[]).map((type) => {
              const p = ROOM_PRESETS[type];
              return (
                <button
                  key={type}
                  onClick={() => addRoom(type)}
                  className="flex flex-col items-center gap-0.5 p-2 rounded-lg hover:bg-emerald-50 text-[10px] font-bold text-slate-700 cursor-pointer transition-colors border border-transparent hover:border-emerald-200"
                >
                  <span className="text-lg">{p.icon}</span>
                  <span className="text-center leading-tight">{p.label.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Stage Opt-Out Toggles */}
      <div className="space-y-2 pt-1 border-t border-slate-100">
        <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
          <span>Included Construction Trades</span>
          <span className="text-[10px] text-slate-400">1-Click Opt-Out</span>
        </div>
        <div className="space-y-1.5">
          {[
            { key: "foundation", label: "⛏️ Foundation & Substructure", sub: "Excavation, PCC & Footings" },
            { key: "superstructure", label: "🧱 Superstructure & RCC Frame", sub: "Columns, Beams & Brickwork" },
            { key: "finishes", label: "🪵 Flooring, Plaster & Painting", sub: "Tiles, Putty & Emulsion" },
            { key: "openings", label: "🚪 Doors, Windows & Grills", sub: "Shutters, Frames & Hardware" },
            { key: "mep", label: "⚡ Plumbing & Sanitation", sub: "Fixtures & Traps" },
          ].map((scope) => (
            <label
              key={scope.key}
              className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-xs cursor-pointer transition-all"
            >
              <div className="min-w-0 pr-2">
                <div className="font-bold text-slate-800">{scope.label}</div>
                <div className="text-[10px] text-slate-400 truncate">{scope.sub}</div>
              </div>
              <input
                type="checkbox"
                checked={Boolean((activeScopes as any)[scope.key])}
                onChange={() => onToggleScope(scope.key)}
                className="w-4 h-4 accent-emerald-800 rounded cursor-pointer"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Converts a list of RoomCards to the module params format that calculateModuleBOQ expects.
 * Sums all room areas, perimeters and passes them as g1-residential-house params.
 */
export function roomCardsToModuleParams(
  rooms: RoomCard[],
  numFloors: number
): Record<string, any> {
  if (rooms.length === 0) return { length_m: 12, width_m: 9, num_floors: numFloors };

  const totalCarpetM2 = rooms.reduce((s, r) => s + ft2m(r.widthFt) * ft2m(r.lengthFt), 0);
  const totalPerimM = rooms.reduce((s, r) => s + 2 * (ft2m(r.widthFt) + ft2m(r.lengthFt)), 0);
  const bathroomCount = rooms.filter((r) => r.type === "toilet").length;
  const avgWidth = Math.sqrt(totalCarpetM2 * 0.60);
  const avgLength = Math.sqrt(totalCarpetM2 * 1.40);

  return {
    length_m: parseFloat(avgLength.toFixed(1)),
    width_m: parseFloat(avgWidth.toFixed(1)),
    num_floors: numFloors,
    height_m: 3.0,
    soil_type: "medium",
    masonry_type: "brick",
    outer_door_count: 2,
    inner_door_count: Math.max(2, rooms.length),
    window_count: Math.max(4, rooms.filter((r) => r.type !== "toilet" && r.type !== "store").length * 2),
    bathroom_count: Math.max(1, bathroomCount),
    // Custom metric for room-based accuracy
    _carpet_area_m2: totalCarpetM2,
    _total_perimeter_m: totalPerimM,
    _room_count: rooms.length,
  };
}
