"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { calculateBOQ } from "@/domains/boq/engine";
import { boqApi } from "@/domains/boq/api";
import { BOQParameters, BOQResult, DEFAULT_PARAMS, TYPOLOGY_OPTIONS } from "@/domains/boq/types";
import BOQParametricForm from "@/components/boq/BOQParametricForm";
import BOQLineItemsTable from "@/components/boq/BOQLineItemsTable";
import BOQSummaryCard from "@/components/boq/BOQSummaryCard";

export default function BOQBuilderPage() {
  const [params, setParams] = useState<BOQParameters>(DEFAULT_PARAMS);
  const [result, setResult] = useState<BOQResult | null>(null);
  const [exporting, setExporting] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recalculate instantly on every param change (client-side engine = 0ms)
  useEffect(() => {
    const res = calculateBOQ(params);
    setResult(res);
  }, [params]);

  const handleParamChange = useCallback((newParams: BOQParameters) => {
    setParams(newParams);
  }, []);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await boqApi.exportExcel(params);
    } catch (e) {
      console.error("Excel export failed:", e);
    } finally {
      setExporting(false);
    }
  };

  const handleSaveSession = async () => {
    try {
      await boqApi.saveSession({ ...params, name: `BOQ - ${new Date().toLocaleDateString("en-IN")}` });
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3000);
    } catch (e) {
      console.error("Save failed:", e);
    }
  };

  const typologyLabel = TYPOLOGY_OPTIONS.find((o) => o.value === params.typology)?.label ?? params.typology;

  return (
    <div className="boq-page">
      <style>{`
        .boq-page {
          min-height: 100vh;
          background: var(--bg, #0d1117);
          color: var(--text-1, #e4e8f0);
          font-family: 'Inter', system-ui, sans-serif;
        }

        /* Header */
        .boq-header {
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--border, #2a3045);
          background: var(--surface-1, #111827);
        }
        .boq-header-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .boq-header-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #6c8fff; margin-bottom: 4px; }
        .boq-header-title { font-size: 22px; font-weight: 900; color: #e4e8f0; letter-spacing: -0.02em; margin: 0; line-height: 1.2; }
        .boq-header-subtitle { font-size: 12px; color: #6b7280; margin-top: 4px; line-height: 1.5; max-width: 600px; }
        .boq-header-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
        .boq-badge {
          font-size: 10px; font-weight: 600; padding: 3px 9px; border-radius: 20px;
          display: inline-flex; align-items: center; gap: 4px;
        }
        .boq-badge-green { background: rgba(16,185,129,0.12); color: #34d399; border: 1px solid rgba(16,185,129,0.25); }
        .boq-badge-blue  { background: rgba(108,143,255,0.12); color: #818cf8; border: 1px solid rgba(108,143,255,0.25); }
        .boq-badge-amber { background: rgba(245,158,11,0.12); color: #fbbf24; border: 1px solid rgba(245,158,11,0.25); }

        /* Typology breadcrumb strip */
        .boq-typology-strip {
          padding: 8px 24px;
          background: rgba(108,143,255,0.05);
          border-bottom: 1px solid var(--border, #2a3045);
          font-size: 11px; color: var(--text-3, #6b7280);
          display: flex; align-items: center; gap: 6px;
        }
        .boq-typology-strip-current { color: var(--accent, #6c8fff); font-weight: 700; }

        /* 3-column layout */
        .boq-layout {
          display: grid;
          grid-template-columns: 320px 1fr 280px;
          gap: 0;
          height: calc(100vh - 130px);
          overflow: hidden;
        }
        .boq-panel {
          overflow-y: auto;
          border-right: 1px solid var(--border, #2a3045);
          padding: 0 0 40px;
        }
        .boq-panel:last-child { border-right: none; }
        .boq-panel-header {
          padding: 12px 16px 10px;
          border-bottom: 1px solid var(--border, #2a3045);
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.07em; color: var(--text-3, #6b7280);
          position: sticky; top: 0; background: var(--bg, #0d1117); z-index: 10;
          display: flex; align-items: center; gap: 6px;
        }
        .boq-panel-content { padding: 16px; }

        /* Toast */
        .boq-toast {
          position: fixed; bottom: 24px; right: 24px;
          background: #065f46; color: #a7f3d0;
          padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 600;
          display: flex; align-items: center; gap: 8px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
          animation: boq-toast-in 0.3s ease;
          z-index: 9999;
        }
        @keyframes boq-toast-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

        /* Responsive */
        @media (max-width: 900px) {
          .boq-layout { grid-template-columns: 1fr; height: auto; overflow: visible; }
          .boq-panel { border-right: none; border-bottom: 1px solid var(--border, #2a3045); height: auto; overflow: visible; }
        }
      `}</style>

      {/* Header */}
      <div className="boq-header">
        <div className="boq-header-top">
          <div>
            <div className="boq-header-eyebrow">🧮 BOQ Estimation Studio</div>
            <h1 className="boq-header-title">Parametric BOQ Builder</h1>
            <p className="boq-header-subtitle">
              IS 1200 compliant measurements · CPWD DSR 2023 rates · Internal partition walls included ·
              Instant reactive calculation · Formula-bound Excel export
            </p>
            <div className="boq-header-badges">
              <span className="boq-badge boq-badge-green">✓ IS 1200 Deductions</span>
              <span className="boq-badge boq-badge-blue">✓ CPWD DSR 2023</span>
              <span className="boq-badge boq-badge-amber">✓ Internal Wall Calc</span>
              <span className="boq-badge boq-badge-green">✓ Dual-Sheet Excel</span>
            </div>
          </div>
        </div>
      </div>

      {/* Typology strip */}
      <div className="boq-typology-strip">
        <span>Tools</span>
        <span>›</span>
        <span>BOQ Builder</span>
        <span>›</span>
        <span className="boq-typology-strip-current">{typologyLabel}</span>
        {result && (
          <>
            <span style={{ marginLeft: "auto", color: "#e4e8f0", fontWeight: 700 }}>
              Total: ₹{result.total_cost.toLocaleString("en-IN")}
            </span>
            <span style={{ color: "#6b7280" }}>·</span>
            <span>{result.built_up_area} m² BUA</span>
          </>
        )}
      </div>

      {/* 3-panel layout */}
      <div className="boq-layout">
        {/* Panel 1: Parameters */}
        <div className="boq-panel">
          <div className="boq-panel-header">
            <span>📐</span> Parameters
          </div>
          <div className="boq-panel-content">
            <BOQParametricForm params={params} onChange={handleParamChange} />
          </div>
        </div>

        {/* Panel 2: BOQ Line Items */}
        <div className="boq-panel">
          <div className="boq-panel-header">
            <span>📋</span> Bill of Quantities
            {result && (
              <span style={{ marginLeft: "auto", fontWeight: 400, fontSize: "10px", color: "#4ade80" }}>
                ● Live · {result.line_items.length} items
              </span>
            )}
          </div>
          <div className="boq-panel-content">
            <BOQLineItemsTable result={result} />
          </div>
        </div>

        {/* Panel 3: Summary & Actions */}
        <div className="boq-panel">
          <div className="boq-panel-header">
            <span>💰</span> Cost Summary
          </div>
          <div className="boq-panel-content">
            <BOQSummaryCard
              result={result}
              onExportExcel={handleExportExcel}
              onSaveSession={handleSaveSession}
              exporting={exporting}
            />
          </div>
        </div>
      </div>

      {/* Toast */}
      {savedToast && (
        <div className="boq-toast">
          ✅ BOQ session saved successfully!
        </div>
      )}
    </div>
  );
}
