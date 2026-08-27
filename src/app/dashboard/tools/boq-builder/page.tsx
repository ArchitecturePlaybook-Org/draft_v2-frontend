"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { calculateBOQ } from "@/domains/boq/engine";
import { boqApi } from "@/domains/boq/api";
import { BOQParameters, BOQResult, BOQTypologyDB, DEFAULT_PARAMS, TYPOLOGY_OPTIONS } from "@/domains/boq/types";
import BOQParametricForm from "@/components/boq/BOQParametricForm";
import BOQLineItemsTable from "@/components/boq/BOQLineItemsTable";
import BOQSummaryCard from "@/components/boq/BOQSummaryCard";
import BOQAutoPlanVisualizer from "@/components/boq/BOQAutoPlanVisualizer";
import Link from "next/link";
import { Shield } from "lucide-react";

export default function BOQBuilderPage() {
  const [params, setParams] = useState<BOQParameters>(DEFAULT_PARAMS);
  const [typologies, setTypologies] = useState<BOQTypologyDB[]>([]);
  const [result, setResult] = useState<BOQResult | null>(null);
  const [centerTab, setCenterTab] = useState<"both" | "plan" | "boq">("both");
  const [exporting, setExporting] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load active structure types dynamically from DB
  useEffect(() => {
    boqApi.getTypologies().then((data) => {
      if (data && data.length > 0) {
        setTypologies(data);
      }
    }).catch(() => {});
  }, []);

  // Recalculate using server-side database rules (with optimistic 0ms fallback)
  useEffect(() => {
    // 1. Optimistic immediate preview
    const immediateRes = calculateBOQ(params);
    setResult(immediateRes);

    // 2. Debounced DB-driven calculation from backend
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const dbResult = await boqApi.calculate(params);
        if (dbResult && dbResult.line_items) {
          setResult(dbResult);
        }
      } catch (err) {
        // Graceful fallback to client calculation
      }
    }, 150);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
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

  const currentTypology = typologies.find((o) => o.slug === params.typology);
  const typologyLabel = currentTypology?.name || TYPOLOGY_OPTIONS.find((o) => o.value === params.typology)?.label || params.typology;

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
        @media (max-width: 1080px) {
          .boq-layout { grid-template-columns: 1fr; height: auto; overflow: visible; }
          .boq-panel { border-right: none; border-bottom: 1px solid var(--border, #2a3045); height: auto; overflow: visible; }
        }
      `}</style>

      {/* Header */}
      <div className="boq-header">
        <div className="boq-header-top">
          <div>
            <div className="boq-header-eyebrow">🧮 BOQ Estimation Studio</div>
            <h1 className="boq-header-title">Parametric BOQ & 2D/3D Plan Builder</h1>
            <p className="boq-header-subtitle">
              Live Auto-Generated 2D Floor Plan, Elevation & Section · IS 1200 compliant measurements · CPWD DSR 2023 rates ·
              Database-driven calculation engine · Formula-bound Excel export
            </p>
            <div className="boq-header-badges">
              <span className="boq-badge boq-badge-green">📐 Auto-Generated Plan & Elevation</span>
              <span className="boq-badge boq-badge-blue">✓ CPWD DSR 2023 DB</span>
              <span className="boq-badge boq-badge-amber">✓ IS 1200 Deductions</span>
              <span className="boq-badge boq-badge-green">✓ Dual-Sheet Excel</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/admin/boq-rules"
              className="h-8.5 px-3.5 rounded-lg border border-accent/40 bg-accent/10 hover:bg-accent/20 text-accent text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Super Admin: Edit DB Rules & Rates</span>
            </Link>
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
            <span>📐</span> Parameters & Dimensions
          </div>
          <div className="boq-panel-content">
            <BOQParametricForm params={params} onChange={handleParamChange} typologies={typologies} />
          </div>
        </div>

        {/* Panel 2: Plan Visualizer & BOQ Line Items */}
        <div className="boq-panel">
          <div className="boq-panel-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>📐</span>
              <span>Architectural Views & BOQ</span>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-surface-200/50 p-0.5 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setCenterTab("both")}
                className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${centerTab === "both"
                    ? "bg-accent text-background shadow-xs"
                    : "text-text-3 hover:text-text-1"
                  }`}
              >
                All-In-One
              </button>
              <button
                type="button"
                onClick={() => setCenterTab("plan")}
                className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${centerTab === "plan"
                    ? "bg-accent text-background shadow-xs"
                    : "text-text-3 hover:text-text-1"
                  }`}
              >
                Plan & Elevation
              </button>
              <button
                type="button"
                onClick={() => setCenterTab("boq")}
                className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${centerTab === "boq"
                    ? "bg-accent text-background shadow-xs"
                    : "text-text-3 hover:text-text-1"
                  }`}
              >
                BOQ Table
              </button>
            </div>
          </div>

          <div className="boq-panel-content space-y-4">
            {/* Auto-Generated Plan, Elevation & Section Component */}
            {(centerTab === "both" || centerTab === "plan") && (
              <BOQAutoPlanVisualizer params={params} />
            )}

            {/* Detailed BOQ Line Items Table */}
            {(centerTab === "both" || centerTab === "boq") && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <span>📋</span>
                    <span>Bill of Quantities (CPWD DSR 2023 DB)</span>
                  </h4>
                  {result && (
                    <span className="text-[10px] font-bold text-emerald-400">
                      ● Live Reactive · {result.line_items.length} items
                    </span>
                  )}
                </div>
                <BOQLineItemsTable result={result} />
              </div>
            )}
          </div>
        </div>

        {/* Panel 3: Cost Summary & Export */}
        <div className="boq-panel">
          <div className="boq-panel-header">
            <span>📊</span> Cost Analysis & Export
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

      {/* Saved Toast */}
      {savedToast && (
        <div className="boq-toast">
          <span>✓</span>
          <span>BOQ calculation session saved to database.</span>
        </div>
      )}
    </div>
  );
}
