"use client";
import React from "react";
import { BOQResult } from "@/domains/boq/types";

interface Props {
  result: BOQResult | null;
  onExportExcel?: () => void;
  onSaveSession?: () => void;
  exporting?: boolean;
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);
}

const STAGE_COLORS: Record<string, string> = {
  earthwork: "#f59e0b",
  substructure: "#3b82f6",
  superstructure: "#ef4444",
  rcc: "#8b5cf6",
  plaster: "#06b6d4",
  flooring: "#10b981",
  doors_windows: "#f97316",
  painting: "#ec4899",
  mep: "#84cc16",
  external: "#14b8a6",
};

export default function BOQSummaryCard({ result, onExportExcel, onSaveSession, exporting }: Props) {
  if (!result) {
    return (
      <div className="boq-summary-empty">
        <div style={{ fontSize: 32, marginBottom: 8 }}>🧮</div>
        <div style={{ fontSize: 13, color: "var(--text-3, #6b7280)", textAlign: "center", lineHeight: 1.5 }}>
          Adjust inputs to see your BOQ cost summary
        </div>
      </div>
    );
  }

  // Stage totals for mini-chart
  const stageTotals: { stage: string; amount: number }[] = [];
  result.line_items.forEach((item) => {
    const ex = stageTotals.find((s) => s.stage === item.stage);
    if (ex) ex.amount += item.amount;
    else stageTotals.push({ stage: item.stage, amount: item.amount });
  });
  stageTotals.sort((a, b) => b.amount - a.amount);

  const costPerSqft = result.built_up_area > 0
    ? Math.round(result.total_cost / (result.built_up_area * 10.764))
    : 0;

  return (
    <div className="boq-summary-card">
      <style>{`
        .boq-summary-card { display: flex; flex-direction: column; gap: 16px; }
        .boq-summary-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; }

        /* Total cost hero */
        .boq-total-hero { background: linear-gradient(135deg, #1a2a4a, #1a1f2e); border: 1px solid #2a4a8a; border-radius: 12px; padding: 20px; text-align: center; }
        .boq-total-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; margin-bottom: 6px; }
        .boq-total-amount { font-size: 28px; font-weight: 900; color: #60a5fa; font-family: 'JetBrains Mono', monospace; letter-spacing: -0.02em; }
        .boq-total-meta { display: flex; justify-content: center; gap: 16px; margin-top: 10px; }
        .boq-total-meta-item { font-size: 11px; color: #9ca3af; display: flex; align-items: center; gap: 4px; }
        .boq-total-meta-val { color: #e4e8f0; font-weight: 700; font-family: 'JetBrains Mono', monospace; }

        /* Stage breakdown */
        .boq-stage-breakdown { background: var(--surface-2, #1a1f2e); border: 1px solid var(--border, #2a3045); border-radius: 10px; padding: 14px; }
        .boq-breakdown-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 12px; }
        .boq-stage-bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .boq-stage-bar-label { font-size: 10px; color: var(--text-2, #c4c9d4); width: 110px; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .boq-stage-bar-track { flex: 1; height: 5px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden; }
        .boq-stage-bar-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
        .boq-stage-bar-amount { font-size: 10px; color: var(--text-3, #6b7280); width: 72px; text-align: right; font-family: 'JetBrains Mono', monospace; flex-shrink: 0; }

        /* Action buttons */
        .boq-action-group { display: flex; flex-direction: column; gap: 8px; }
        .boq-btn-excel {
          width: 100%; padding: 11px; border-radius: 8px;
          background: linear-gradient(135deg, #065f46, #059669);
          border: none; color: #fff; font-size: 13px; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: opacity 0.15s, transform 0.15s;
        }
        .boq-btn-excel:hover { opacity: 0.9; transform: translateY(-1px); }
        .boq-btn-excel:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .boq-btn-save {
          width: 100%; padding: 10px; border-radius: 8px;
          background: transparent; border: 1px solid var(--border, #2a3045);
          color: var(--text-2, #c4c9d4); font-size: 12px; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.15s;
        }
        .boq-btn-save:hover { border-color: var(--accent, #6c8fff); color: var(--accent, #6c8fff); }

        /* Rate card */
        .boq-rate-card { background: var(--surface-2, #1a1f2e); border: 1px solid var(--border, #2a3045); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; }
        .boq-rate-row { display: flex; justify-content: space-between; align-items: center; }
        .boq-rate-label { font-size: 11px; color: var(--text-3, #6b7280); }
        .boq-rate-val { font-size: 12px; font-weight: 700; color: var(--text-1, #e4e8f0); font-family: 'JetBrains Mono', monospace; }
        .boq-rate-badge { font-size: 9px; background: rgba(16,185,129,0.15); color: #34d399; padding: 2px 6px; border-radius: 4px; font-weight: 700; }
      `}</style>

      {/* Total hero */}
      <div className="boq-total-hero">
        <div className="boq-total-label">Total Estimated Cost (CPWD DSR 2023)</div>
        <div className="boq-total-amount">{formatCurrency(result.total_cost)}</div>
        <div className="boq-total-meta">
          <div className="boq-total-meta-item">
            BUA <span className="boq-total-meta-val">{result.built_up_area} m²</span>
          </div>
          <div className="boq-total-meta-item">
            Rate <span className="boq-total-meta-val">₹{costPerSqft.toLocaleString("en-IN")}/sqft</span>
          </div>
          <div className="boq-total-meta-item">
            Items <span className="boq-total-meta-val">{result.line_items.length}</span>
          </div>
        </div>
      </div>

      {/* Rate card */}
      <div className="boq-rate-card">
        <div className="boq-rate-row">
          <span className="boq-rate-label">Rate Source</span>
          <span className="boq-rate-badge">CPWD DSR 2023</span>
        </div>
        <div className="boq-rate-row">
          <span className="boq-rate-label">Measurement Standard</span>
          <span className="boq-rate-val" style={{ fontSize: "10px" }}>IS 1200 Pt1/2/3/11/12</span>
        </div>
        <div className="boq-rate-row">
          <span className="boq-rate-label">GST (add separately)</span>
          <span className="boq-rate-val">+12% on works</span>
        </div>
        <div className="boq-rate-row">
          <span className="boq-rate-label">With contractor margin</span>
          <span className="boq-rate-val">{formatCurrency(result.total_cost * 1.3)}</span>
        </div>
      </div>

      {/* Stage cost breakdown bars */}
      <div className="boq-stage-breakdown">
        <div className="boq-breakdown-title">📊 Cost by Stage</div>
        {stageTotals.map(({ stage, amount }) => {
          const pct = (amount / result.total_cost) * 100;
          const color = STAGE_COLORS[stage] ?? "#6c8fff";
          const label = stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          return (
            <div key={stage} className="boq-stage-bar-row">
              <div className="boq-stage-bar-label" title={label}>{label}</div>
              <div className="boq-stage-bar-track">
                <div
                  className="boq-stage-bar-fill"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
              <div className="boq-stage-bar-amount">
                ₹{(amount / 100000).toFixed(1)}L
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="boq-action-group">
        <button
          className="boq-btn-excel"
          onClick={onExportExcel}
          disabled={exporting}
        >
          {exporting ? "⏳ Generating..." : "⬇️ Download Excel (.xlsx)"}
          {!exporting && <span style={{ fontSize: 10, opacity: 0.8 }}>Formula-bound · Dual Sheet</span>}
        </button>
        <button className="boq-btn-save" onClick={onSaveSession}>
          💾 Save Session
        </button>
      </div>
    </div>
  );
}
