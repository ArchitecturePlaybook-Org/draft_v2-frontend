"use client";

import React, { useState } from "react";
import { X, Upload, AlertTriangle, CheckCircle, FileText, ArrowRight } from "lucide-react";
import { Interval } from "@/domains/infralens-boq/types";
import { MATERIAL_META, resolveCityPrices } from "@/domains/infralens-boq/prices";

interface ImportRatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  city: string;
  cityLabel: string;
  onApply: (rates: Record<string, Interval>) => void;
}

interface ParsedRow {
  code: string;
  name: string;
  unit: string;
  oldMin: number;
  oldMax: number;
  newMin: number;
  newMax: number;
  isValid: boolean;
  error?: string;
}

export const ImportRatesModal: React.FC<ImportRatesModalProps> = ({
  isOpen,
  onClose,
  city,
  cityLabel,
  onApply,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const currentCityPrices = resolveCityPrices(city);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        parseCSV(text);
      } catch (err: any) {
        setParseError("Failed to read CSV file: " + err.message);
      }
    };
    reader.readAsText(selected);
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setParseError("The CSV file must contain a header row and at least one data row.");
      setParsedRows([]);
      return;
    }

    // Split headers and clean quotes
    const headerParts = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, "").toLowerCase());
    
    // Find index of columns (flexible naming)
    const codeIdx = headerParts.findIndex((h) => h.includes("code") || h.includes("id"));
    const minIdx = headerParts.findIndex((h) => h.includes("min"));
    const maxIdx = headerParts.findIndex((h) => h.includes("max"));

    if (codeIdx === -1 || minIdx === -1 || maxIdx === -1) {
      setParseError("CSV must contain columns: 'code' (or 'id'), 'min_rate' (or 'min'), and 'max_rate' (or 'max').");
      setParsedRows([]);
      return;
    }

    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Regex to handle quoted commas
      const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(",");
      const parts = matches.map((p) => p.trim().replace(/^["']|["']$/g, ""));
      
      const code = parts[codeIdx]?.trim();
      if (!code) continue;

      const meta = MATERIAL_META[code];
      const oldRange = currentCityPrices[code] || [0, 0];
      const newMin = parseFloat(parts[minIdx]);
      const newMax = parseFloat(parts[maxIdx]);

      if (!meta) {
        rows.push({
          code,
          name: "Unknown Item Code",
          unit: "-",
          oldMin: oldRange[0],
          oldMax: oldRange[1],
          newMin,
          newMax,
          isValid: false,
          error: `Unrecognized code "${code}". Must match platform item master.`,
        });
        continue;
      }

      if (isNaN(newMin) || isNaN(newMax) || newMin < 0 || newMax < newMin) {
        rows.push({
          code,
          name: meta.name,
          unit: meta.unit,
          oldMin: oldRange[0],
          oldMax: oldRange[1],
          newMin,
          newMax,
          isValid: false,
          error: `Invalid rates: Min (${newMin}) must be <= Max (${newMax}) and non-negative.`,
        });
        continue;
      }

      rows.push({
        code,
        name: meta.name,
        unit: meta.unit,
        oldMin: oldRange[0],
        oldMax: oldRange[1],
        newMin: Math.round(newMin),
        newMax: Math.round(newMax),
        isValid: true,
      });
    }

    if (rows.length === 0) {
      setParseError("No valid rows found in CSV file.");
    }

    setParsedRows(rows);
  };

  const validRows = parsedRows.filter((r) => r.isValid);
  const changedRows = validRows.filter((r) => r.oldMin !== r.newMin || r.oldMax !== r.newMax);

  const handleApply = () => {
    if (changedRows.length === 0) return;
    setIsProcessing(true);

    const ratesToUpdate: Record<string, Interval> = {};
    for (const r of changedRows) {
      ratesToUpdate[r.code] = [r.newMin, r.newMax];
    }

    onApply(ratesToUpdate);
    setIsProcessing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Upload className="w-5 h-5 text-accent" />
              Import City Market Rates — {cityLabel}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload a modified CSV to update benchmark rates across materials and labour.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* File Upload Area */}
          <div className="border-2 border-dashed border-border hover:border-accent/50 rounded-xl p-6 text-center transition-colors bg-muted/10">
            <input
              type="file"
              id="csv-upload"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {file ? file.name : "Click to upload or drag & drop CSV file"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports standard CSV with headers: Code, Min Rate, Max Rate
                </p>
              </div>
            </label>
          </div>

          {/* Errors */}
          {parseError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-xs text-red-500">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Validation Summary */}
          {parsedRows.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/40 border border-border text-center">
                <div className="text-xs text-muted-foreground">Total Rows</div>
                <div className="text-lg font-bold text-foreground mt-0.5">{parsedRows.length}</div>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                <div className="text-xs text-emerald-600 dark:text-emerald-400">Rates to Update</div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {changedRows.length}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                <div className="text-xs text-amber-600 dark:text-amber-400">Invalid / Unchanged</div>
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                  {parsedRows.length - changedRows.length}
                </div>
              </div>
            </div>
          )}

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/60 text-muted-foreground font-semibold sticky top-0 border-b border-border">
                    <tr>
                      <th className="px-3 py-2">Item Name</th>
                      <th className="px-3 py-2">Current Range</th>
                      <th className="px-3 py-2">Imported Range</th>
                      <th className="px-3 py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parsedRows.map((r, idx) => {
                      const isDiff = r.isValid && (r.oldMin !== r.newMin || r.oldMax !== r.newMax);
                      return (
                        <tr
                          key={r.code + idx}
                          className={
                            !r.isValid
                              ? "bg-red-500/5 text-red-500"
                              : isDiff
                              ? "bg-emerald-500/5"
                              : "text-muted-foreground"
                          }
                        >
                          <td className="px-3 py-2 font-medium">
                            <div className="text-foreground">{r.name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{r.code}</div>
                          </td>
                          <td className="px-3 py-2">
                            ₹{r.oldMin.toLocaleString("en-IN")} – ₹{r.oldMax.toLocaleString("en-IN")}
                          </td>
                          <td className="px-3 py-2 font-medium">
                            {r.isValid ? (
                              <span className="flex items-center gap-1">
                                ₹{r.newMin.toLocaleString("en-IN")} – ₹{r.newMax.toLocaleString("en-IN")}
                              </span>
                            ) : (
                              <span className="text-red-500 text-[10px]">{r.error}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {!r.isValid ? (
                              <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 rounded text-[10px] font-semibold">
                                Error
                              </span>
                            ) : isDiff ? (
                              <span className="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-semibold">
                                Updated
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-[10px]">
                                Identical
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={changedRows.length === 0 || isProcessing}
            onClick={handleApply}
            className="px-5 py-2 text-sm font-semibold text-accent-foreground bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Apply {changedRows.length} Rate {changedRows.length === 1 ? "Update" : "Updates"}
          </button>
        </div>
      </div>
    </div>
  );
};
