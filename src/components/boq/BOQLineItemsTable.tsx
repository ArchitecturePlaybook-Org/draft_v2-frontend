"use client";
import React, { useState } from "react";
import { BOQLineItem, BOQResult, STAGE_LABELS } from "@/domains/boq/types";
import { groupByStage } from "@/domains/boq/engine";

const STAGE_ICONS: Record<string, string> = {
  earthwork: "⛏️",
  substructure: "🏗️",
  superstructure: "🧱",
  rcc: "🔩",
  plaster: "🪣",
  flooring: "🪵",
  doors_windows: "🚪",
  painting: "🖌️",
  mep: "⚡",
  external: "🌳",
};

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);
}

function formatQty(val: number, unit: string): string {
  return `${val.toLocaleString("en-IN", { maximumFractionDigits: 2 })} ${unit}`;
}

interface Props {
  result: BOQResult | null;
  loading?: boolean;
}

export default function BOQLineItemsTable({ result, loading }: Props) {
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set(Object.keys(STAGE_LABELS)));
  const [showDeductions, setShowDeductions] = useState(false);

  if (loading) {
    return (
      <div className="boq-table-skeleton">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="boq-skeleton-row" style={{ animationDelay: `${i * 0.05}s` }} />
        ))}
      </div>
    );
  }

  if (!result) {
    return (
      <div className="boq-table-empty">
        <div className="boq-empty-icon">📊</div>
        <div>Enter building dimensions to generate your BOQ</div>
      </div>
    );
  }

  const grouped = groupByStage(result.line_items);

  const toggleStage = (stage: string) => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stage)) next.delete(stage);
      else next.add(stage);
      return next;
    });
  };

  return (
    <div className="boq-table-wrap">
      <style>{`
        .boq-table-wrap { font-size: 12px; }
        .boq-table-toolbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 12px; border-bottom: 1px solid var(--border, #2a3045);
          margin-bottom: 8px;
        }
        .boq-table-toolbar-title { font-size: 11px; font-weight: 700; color: var(--text-1, #e4e8f0); text-transform: uppercase; letter-spacing: 0.06em; }
        .boq-deduct-toggle { font-size: 10px; color: var(--text-3, #6b7280); background: none; border: 1px solid var(--border, #2a3045); border-radius: 4px; padding: 3px 8px; cursor: pointer; transition: all 0.15s; }
        .boq-deduct-toggle:hover { color: var(--accent, #6c8fff); border-color: var(--accent, #6c8fff); }

        /* Stage group */
        .boq-stage-group { margin-bottom: 4px; border: 1px solid var(--border, #2a3045); border-radius: 8px; overflow: hidden; }
        .boq-stage-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 9px 12px; cursor: pointer; user-select: none;
          background: var(--surface-2, #1a1f2e); transition: background 0.15s;
        }
        .boq-stage-header:hover { background: var(--surface-3, #222840); }
        .boq-stage-header-left { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: var(--text-1, #e4e8f0); }
        .boq-stage-header-right { display: flex; align-items: center; gap: 12px; }
        .boq-stage-subtotal { font-size: 12px; font-weight: 700; color: var(--accent, #6c8fff); font-family: 'JetBrains Mono', monospace; }
        .boq-stage-chevron { font-size: 10px; color: var(--text-3, #6b7280); transition: transform 0.2s; }
        .boq-stage-chevron.open { transform: rotate(90deg); }

        /* Table */
        .boq-table { width: 100%; border-collapse: collapse; }
        .boq-table th {
          padding: 7px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.06em; color: var(--text-3, #6b7280);
          background: var(--surface-3, #0f1421); text-align: left;
          border-bottom: 1px solid var(--border, #2a3045);
        }
        .boq-table th:last-child { text-align: right; }
        .boq-table td {
          padding: 8px 10px; font-size: 12px; color: var(--text-2, #c4c9d4);
          border-bottom: 1px solid rgba(42,48,69,0.5); vertical-align: top;
        }
        .boq-table tr:last-child td { border-bottom: none; }
        .boq-table tr:hover td { background: rgba(108,143,255,0.04); }
        .boq-item-code { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--accent, #6c8fff); font-weight: 600; }
        .boq-item-desc { color: var(--text-1, #e4e8f0); line-height: 1.4; }
        .boq-item-is { font-size: 9px; color: #4ade80; font-family: 'JetBrains Mono', monospace; margin-top: 2px; }
        .boq-item-deduct { font-size: 9px; color: #fbbf24; margin-top: 3px; font-style: italic; line-height: 1.3; }
        .boq-num { font-family: 'JetBrains Mono', monospace; text-align: right; color: var(--text-2, #c4c9d4); }
        .boq-amount { font-family: 'JetBrains Mono', monospace; text-align: right; font-weight: 700; color: var(--text-1, #e4e8f0); }

        /* Assumptions */
        .boq-assumptions { margin-top: 16px; background: var(--surface-2, #1a1f2e); border: 1px solid var(--border, #2a3045); border-radius: 8px; padding: 12px 14px; }
        .boq-assumptions-title { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text-3, #6b7280); letter-spacing: 0.06em; margin-bottom: 8px; }
        .boq-assumption-item { font-size: 11px; color: var(--text-3, #6b7280); margin-bottom: 4px; display: flex; gap: 6px; }
        .boq-assumption-item::before { content: "·"; color: var(--accent, #6c8fff); flex-shrink: 0; }

        .boq-table-skeleton { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
        .boq-skeleton-row { height: 36px; border-radius: 6px; background: linear-gradient(90deg, #1a1f2e 25%, #222840 50%, #1a1f2e 75%); background-size: 200% 100%; animation: boq-shimmer 1.2s infinite; }
        @keyframes boq-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .boq-table-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 20px; color: var(--text-3, #6b7280); font-size: 13px; }
        .boq-empty-icon { font-size: 36px; }
      `}</style>

      <div className="boq-table-toolbar">
        <span className="boq-table-toolbar-title">
          {result.line_items.length} items · {result.built_up_area} m² BUA
        </span>
        <button
          className="boq-deduct-toggle"
          onClick={() => setShowDeductions(!showDeductions)}
        >
          {showDeductions ? "Hide" : "Show"} IS 1200 deduction notes
        </button>
      </div>

      {Object.entries(grouped).map(([stage, items]) => {
        const subtotal = items.reduce((s, i) => s + i.amount, 0);
        const isOpen = expandedStages.has(stage);
        return (
          <div key={stage} className="boq-stage-group">
            <div className="boq-stage-header" onClick={() => toggleStage(stage)}>
              <div className="boq-stage-header-left">
                <span>{STAGE_ICONS[stage] ?? "📋"}</span>
                <span>{STAGE_LABELS[stage] ?? stage}</span>
                <span style={{ fontSize: "10px", color: "var(--text-3)", fontWeight: 400 }}>({items.length} items)</span>
              </div>
              <div className="boq-stage-header-right">
                <span className="boq-stage-subtotal">{formatCurrency(subtotal)}</span>
                <span className={`boq-stage-chevron ${isOpen ? "open" : ""}`}>▶</span>
              </div>
            </div>

            {isOpen && (
              <table className="boq-table">
                <thead>
                  <tr>
                    <th style={{ width: "70px" }}>Item Code</th>
                    <th>Description</th>
                    <th style={{ width: "50px" }}>Unit</th>
                    <th style={{ width: "80px", textAlign: "right" }}>Quantity</th>
                    <th style={{ width: "80px", textAlign: "right" }}>Rate ₹</th>
                    <th style={{ width: "100px" }}>Amount ₹</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: BOQLineItem, idx: number) => (
                    <tr key={idx}>
                      <td>
                        <div className="boq-item-code">{item.item_code}</div>
                      </td>
                      <td>
                        <div className="boq-item-desc">{item.description}</div>
                        {item.is_code_ref && (
                          <div className="boq-item-is">📋 {item.is_code_ref}</div>
                        )}
                        {showDeductions && item.deductions_note && (
                          <div className="boq-item-deduct">⚖️ {item.deductions_note}</div>
                        )}
                      </td>
                      <td className="boq-num">{item.unit}</td>
                      <td className="boq-num">{item.quantity.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                      <td className="boq-num">{item.rate.toLocaleString("en-IN")}</td>
                      <td className="boq-amount">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}

      <div className="boq-assumptions">
        <div className="boq-assumptions-title">📋 IS 1200 Assumptions & Notes</div>
        {result.assumptions.map((note, i) => (
          <div key={i} className="boq-assumption-item">{note}</div>
        ))}
      </div>
    </div>
  );
}
