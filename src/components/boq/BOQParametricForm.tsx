"use client";
import React from "react";
import { BOQParameters, TYPOLOGY_OPTIONS, TYPOLOGY_PRESETS, DEFAULT_PARAMS } from "@/domains/boq/types";

interface Props {
  params: BOQParameters;
  onChange: (params: BOQParameters) => void;
}

function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="boq-field">
      <label className="boq-field-label">{label}</label>
      {hint && <span className="boq-field-hint">{hint}</span>}
      <div className="boq-field-control">{children}</div>
    </div>
  );
}

function NumInput({
  value, min, max, step = 0.1, onChange,
}: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      className="boq-num-input"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
    />
  );
}

function SliderInput({
  value, min, max, step = 0.5, unit, onChange,
}: { value: number; min: number; max: number; step?: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div className="boq-slider-wrap">
      <input
        type="range"
        className="boq-slider"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <span className="boq-slider-val">{value} {unit}</span>
    </div>
  );
}

export default function BOQParametricForm({ params, onChange }: Props) {
  const set = <K extends keyof BOQParameters>(key: K, val: BOQParameters[K]) =>
    onChange({ ...params, [key]: val });

  const handleTypologySelect = (val: BOQParameters["typology"]) => {
    const preset = TYPOLOGY_PRESETS[val] || DEFAULT_PARAMS;
    onChange({
      ...preset,
      typology: val,
    });
  };

  const isRoad = params.typology === "internal_road_bt" || params.typology === "internal_road_cc";
  const isWall = params.typology === "boundary_wall" || params.typology === "compound_wall" || params.typology === "retaining_wall";
  const isDrainOrTank = params.typology === "rcc_drain" || params.typology === "septic_tank";
  const isInterior = params.typology === "modular_kitchen" || params.typology === "bathroom_renovation" || params.typology === "false_ceiling" || params.typology === "vitrified_flooring";
  const isBuilding = !isRoad && !isWall && !isDrainOrTank && !isInterior;

  return (
    <div className="boq-form">
      <style>{`
        .boq-form { display: flex; flex-direction: column; gap: 24px; padding: 20px 0; }
        .boq-section { background: var(--surface-2, #1a1f2e); border: 1px solid var(--border, #2a3045); border-radius: 10px; padding: 16px; }
        .boq-section-title { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent, #6c8fff); margin: 0 0 14px; display: flex; align-items: center; gap: 6px; }
        .boq-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
        .boq-field:last-child { margin-bottom: 0; }
        .boq-field-label { font-size: 12px; font-weight: 600; color: var(--text-1, #e4e8f0); }
        .boq-field-hint { font-size: 10px; color: var(--text-3, #6b7280); font-style: italic; }
        .boq-field-control { display: flex; gap: 8px; align-items: center; }
        .boq-num-input {
          width: 100%; padding: 7px 10px; border-radius: 6px; border: 1px solid var(--border, #2a3045);
          background: var(--surface-3, #0f1421); color: var(--text-1, #e4e8f0);
          font-size: 13px; font-family: 'JetBrains Mono', monospace; outline: none;
          transition: border-color 0.15s;
        }
        .boq-num-input:focus { border-color: var(--accent, #6c8fff); }
        .boq-select {
          width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border, #2a3045);
          background: var(--surface-3, #0f1421); color: var(--text-1, #e4e8f0);
          font-size: 13px; cursor: pointer; outline: none; font-weight: 600;
        }
        .boq-slider-wrap { display: flex; flex-direction: column; gap: 4px; width: 100%; }
        .boq-slider { width: 100%; accent-color: var(--accent, #6c8fff); cursor: pointer; }
        .boq-slider-val { font-size: 12px; font-weight: 700; color: var(--accent, #6c8fff); font-family: 'JetBrains Mono', monospace; }
        .boq-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .boq-3col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        .boq-inner-wall-banner {
          background: linear-gradient(135deg, #1a2a1a, #1a2035);
          border: 1px solid #2e7d32; border-radius: 8px;
          padding: 12px 14px; margin-bottom: 14px;
          font-size: 11px; color: #81c784; line-height: 1.5;
        }
        .boq-inner-wall-banner strong { color: #a5d6a7; }
        .boq-reset-btn {
          font-size: 11px; color: var(--text-3, #6b7280); background: none; border: none;
          cursor: pointer; text-decoration: underline; padding: 0; align-self: flex-end;
        }
        .boq-reset-btn:hover { color: var(--text-1, #e4e8f0); }
        .boq-soil-group { display: flex; gap: 8px; }
        .boq-soil-btn {
          flex: 1; padding: 6px 0; border-radius: 6px; border: 1px solid var(--border, #2a3045);
          background: var(--surface-3, #0f1421); color: var(--text-2, #9ca3af);
          font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.15s; text-align: center;
        }
        .boq-soil-btn.active { border-color: var(--accent, #6c8fff); background: rgba(108,143,255,0.12); color: var(--accent, #6c8fff); }
      `}</style>

      {/* Typology Selection */}
      <div className="boq-section">
        <div className="boq-section-title">🏗️ Structure Typology Template</div>
        <Field label="Select Structure Type" hint="Auto-loads engineering parameters & DSR schedule">
          <select
            className="boq-select"
            value={params.typology}
            onChange={(e) => handleTypologySelect(e.target.value as BOQParameters["typology"])}
          >
            {TYPOLOGY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
        <button
          type="button"
          className="boq-reset-btn"
          onClick={() => handleTypologySelect(params.typology)}
        >
          Reset {TYPOLOGY_OPTIONS.find(t => t.value === params.typology)?.label.split(" (")[0]} to defaults
        </button>
      </div>

      {/* Dimensions & Envelope */}
      <div className="boq-section">
        <div className="boq-section-title">
          {isRoad ? "🛣️ Road Geometry" : isWall ? "🧱 Wall Geometry" : isDrainOrTank ? "💧 Drain / Tank Geometry" : isInterior ? "🛋️ Room Dimensions" : "📐 Outer Building Envelope"}
        </div>
        <div className="boq-2col">
          <Field label={isRoad || isWall || isDrainOrTank ? "Total Length (m)" : "Length (m)"}>
            <NumInput value={params.outer_length} min={1} max={5000} step={0.5} onChange={(v) => set("outer_length", v)} />
          </Field>
          <Field label={isRoad ? "Carriageway Width (m)" : isWall ? "Wall Thickness (m)" : isDrainOrTank ? "Width (m)" : "Width (m)"}>
            <NumInput value={params.outer_width} min={0.1} max={500} step={0.1} onChange={(v) => set("outer_width", v)} />
          </Field>
        </div>

        <div className="boq-2col">
          <Field label={isRoad ? "Layer Thickness (m)" : isWall ? "Wall Height (m)" : isDrainOrTank ? "Depth (m)" : "Floor-to-Floor Height (m)"}>
            <NumInput value={params.floor_height} min={0.1} max={20} step={0.1} onChange={(v) => set("floor_height", v)} />
          </Field>

          {isBuilding && (
            <Field label="Number of Floors">
              <NumInput value={params.num_floors} min={1} max={30} step={1} onChange={(v) => set("num_floors", Math.floor(v))} />
            </Field>
          )}
        </div>

        {isBuilding && (
          <>
            <Field label="Outer Wall Thickness (mm)" hint="230mm = 9-inch brick | 200mm = AAC block">
              <SliderInput value={params.outer_wall_thickness_mm} min={100} max={380} step={5} unit="mm" onChange={(v) => set("outer_wall_thickness_mm", v)} />
            </Field>
            <Field label="Plinth Height (m)" hint="Height from ground level to floor level">
              <SliderInput value={params.plinth_height} min={0.15} max={1.5} step={0.05} unit="m" onChange={(v) => set("plinth_height", v)} />
            </Field>
          </>
        )}
      </div>

      {/* Internal Partition Walls (Buildings only) */}
      {isBuilding && (
        <div className="boq-section">
          <div className="boq-section-title">🧱 Internal Partition Walls</div>
          <div className="boq-inner-wall-banner">
            <strong>⚠ Critical Input:</strong> Most BOQ tools omit internal partition walls — causing <strong>35–45% underestimation</strong> of brickwork and plaster. Enter the total running length of all internal walls on all floors.
          </div>
          <Field
            label="Internal Wall Running Length (m)"
            hint={`Auto-suggested: ${Math.round((2 * (params.outer_length + params.outer_width)) * 1.15)} m for this building`}
          >
            <SliderInput
              value={params.inner_wall_length}
              min={0}
              max={Math.round(params.outer_length * params.outer_width * 0.8)}
              step={0.5}
              unit="m"
              onChange={(v) => set("inner_wall_length", v)}
            />
          </Field>
          <Field label="Inner Wall Thickness (mm)" hint="115mm = 4.5-inch half-brick | 100mm = partition block">
            <div className="boq-3col">
              {[115, 100, 230].map((mm) => (
                <button
                  type="button"
                  key={mm}
                  className={`boq-soil-btn ${params.inner_wall_thickness_mm === mm ? "active" : ""}`}
                  onClick={() => set("inner_wall_thickness_mm", mm)}
                >
                  {mm}mm
                </button>
              ))}
            </div>
          </Field>
          <div className="boq-2col">
            <Field label="Inner Doors (count)">
              <NumInput value={params.inner_door_count} min={0} max={60} step={1} onChange={(v) => set("inner_door_count", Math.floor(v))} />
            </Field>
            <Field label="Inner Door Avg Size (m²)">
              <NumInput value={params.inner_door_size_m2} min={0.8} max={4} step={0.1} onChange={(v) => set("inner_door_size_m2", v)} />
            </Field>
          </div>
        </div>
      )}

      {/* External Openings (Buildings & Walls) */}
      {(isBuilding || isWall) && (
        <div className="boq-section">
          <div className="boq-section-title">🚪 Openings & Gates</div>
          <div className="boq-2col">
            <Field label={isWall ? "Gates (count)" : "Outer Doors (count)"}>
              <NumInput value={params.outer_door_count} min={0} max={20} step={1} onChange={(v) => set("outer_door_count", Math.floor(v))} />
            </Field>
            <Field label="Door / Gate Size (m²)">
              <NumInput value={params.outer_door_size_m2} min={0.8} max={15} step={0.1} onChange={(v) => set("outer_door_size_m2", v)} />
            </Field>
          </div>
          {isBuilding && (
            <div className="boq-2col">
              <Field label="Outer Windows (count)">
                <NumInput value={params.outer_window_count} min={0} max={60} step={1} onChange={(v) => set("outer_window_count", Math.floor(v))} />
              </Field>
              <Field label="Window Avg Size (m²)">
                <NumInput value={params.outer_window_size_m2} min={0.3} max={8} step={0.1} onChange={(v) => set("outer_window_size_m2", v)} />
              </Field>
            </div>
          )}
        </div>
      )}

      {/* Foundation & Soil (if excavation depth > 0) */}
      {params.excavation_depth > 0 && (
        <div className="boq-section">
          <div className="boq-section-title">⛏️ Substructure & Soil</div>
          <Field label="Soil Strata Condition">
            <div className="boq-soil-group">
              {(["soft", "medium", "hard"] as const).map((s) => (
                <button
                  type="button"
                  key={s}
                  className={`boq-soil-btn ${params.soil_type === s ? "active" : ""}`}
                  onClick={() => set("soil_type", s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Excavation Depth (m)" hint="Depth below ground level">
            <SliderInput value={params.excavation_depth} min={0.3} max={5.0} step={0.1} unit="m" onChange={(v) => set("excavation_depth", v)} />
          </Field>
        </div>
      )}
    </div>
  );
}
