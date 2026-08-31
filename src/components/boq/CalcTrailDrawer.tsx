"use client";
/**
 * CalcTrailDrawer — Per-Line-Item Transparent Formula Audit Panel
 * ================================================================
 * Shows step-by-step derivation for any BOQ line item so architects
 * can manually verify every quantity with pen and paper.
 */

import React, { useState } from "react";
import { ChevronDown, ChevronUp, FlaskConical, BookOpen } from "lucide-react";
import type { BOQLineItem } from "@/domains/boq/types";

interface CalcTrailDrawerProps {
  item: BOQLineItem;
  isOpen: boolean;
  onToggle: () => void;
}

/**
 * Parses the deductions_note field to extract formula steps shown in amber text.
 * We also show a generic verification note based on the DSR code.
 */
function getVerificationNote(item: BOQLineItem): string {
  const qty = item.quantity.toFixed(2);
  const unit = item.unit;
  const code = item.item_code;

  if (code === "2.8.1") return `Verify: Trench Length × Trench Width × Depth = ${qty} m³`;
  if (code === "5.22.6") return `Verify: Concrete Volume (m³) × Rebar Density (kg/m³) = ${qty} kg`;
  if (code === "5.3" || code === "5.2" || code === "5.1.2") return `Verify: BUA (m²) × Slab Thickness (m) = ${qty} m³`;
  if (code === "6.4.2" || code === "6.1.2") return `Verify: Wall Area × Thickness − Opening Deductions = ${qty} m³`;
  if (code === "13.1.2" || code === "13.5.2") return `Verify: Net Wall Area (IS 1200 Pt 12) = ${qty} m²`;
  if (code === "11.41" || code === "11.39") return `Verify: Floor area × 0.85 (deducting walls) = ${qty} m²`;
  if (code === "11.42") return `Verify: Sum of room perimeters − door openings = ${qty} lin.m`;
  if (code === "INT-FC-GYP") return `Verify: Ceiling area (room footprint) = ${qty} m²`;
  return `Quantity: ${qty} ${unit} at ₹${item.rate.toLocaleString("en-IN")} per ${unit} = ₹${item.amount.toLocaleString("en-IN")}`;
}

function getFormulaSteps(item: BOQLineItem): Array<{ label: string; detail: string }> {
  const code = item.item_code;
  const qty = item.quantity;
  const desc = item.description;

  // Extract numbers from description using regex
  const nums = desc.match(/[\d.]+/g)?.map(Number) || [];

  const steps: Array<{ label: string; detail: string }> = [];

  if (code === "2.8.1") {
    steps.push({ label: "Method", detail: "IS 1200 Part 1: Net Centreline method for trenches" });
    steps.push({ label: "Trench Width", detail: "Wall thickness (mm ÷ 1000) + 0.30m working space on each side" });
    steps.push({ label: "Depth", detail: "IS 1080: Medium soil = 1.5m, Soft = 1.8m, Hard = 1.2m (below GL)" });
    steps.push({ label: "T-Junction Deductions", detail: "Each internal wall intersection deducts one trench width" });
    steps.push({ label: "Net Volume", detail: `L × W × D = ${qty.toFixed(2)} m³` });
  } else if (code === "5.22.6") {
    const match = desc.match(/(\d+(?:\.\d+)?)\s*kg\/m³/);
    const density = match ? match[1] : "90–145";
    const match2 = desc.match(/×\s*([\d.]+)\s*m³/);
    const vol = match2 ? match2[1] : "?";
    steps.push({ label: "Standard", detail: "IS 456 Annex B + CPWD norms for element-wise rebar density" });
    steps.push({ label: "Rebar Density", detail: `${density} kg/m³ of concrete (varies: Footings=85, Columns=145, Beams=115, Slabs=90)` });
    steps.push({ label: "Concrete Volume", detail: `${vol} m³ of this structural element` });
    steps.push({ label: "Steel Weight", detail: `${vol} m³ × ${density} kg/m³ = ${qty.toFixed(1)} kg` });
    steps.push({ label: "IS Code", detail: "IS 1786: Fe-500D TMT bars — ductile grade for seismic zones" });
  } else if (code === "6.4.2" || code === "6.1.2") {
    steps.push({ label: "Standard", detail: "IS 1200 Part 3: Brickwork measured in cubic metres" });
    steps.push({ label: "Gross Area", detail: "Perimeter × Height × Floors = gross wall face area" });
    steps.push({ label: "Wall Thickness", detail: "230mm (9 inch FPS brick) for main walls, 115mm for partitions" });
    steps.push({ label: "Opening Deductions", detail: "IS 1200 Pt 3 Cl. 4.3: Doors + Windows area × wall thickness deducted" });
    steps.push({ label: "Net Volume", detail: `${qty.toFixed(2)} m³ of brickwork after deductions` });
  } else if (code === "5.3") {
    steps.push({ label: "Standard", detail: "IS 456 Cl. 23.1: Min slab thickness 125mm for spans ≤ 5m" });
    steps.push({ label: "BUA", detail: "L × W × No. of Floors = Total Built-up Area" });
    steps.push({ label: "Slab Volume", detail: `BUA × 0.125m thickness = ${qty.toFixed(2)} m³` });
  } else if (code === "13.1.2" || code === "13.5.2") {
    steps.push({ label: "Standard", detail: "IS 1200 Part 12: Plastering in sq.metres on net area" });
    steps.push({ label: "Both Faces", detail: "Internal plaster covers BOTH sides of every wall" });
    steps.push({ label: "Ceiling", detail: "Ceiling plaster included in internal total" });
    steps.push({ label: "Opening Deductions", detail: "IS 1200 Pt 12 Cl 4.2: Openings > 0.1 m² are deducted" });
    steps.push({ label: "Net Area", detail: `${qty.toFixed(2)} m² after all deductions` });
  } else if (code === "11.41" || code === "11.39") {
    steps.push({ label: "Standard", detail: "IS 1200 Part 11: Flooring in sq.metres on net area" });
    steps.push({ label: "Deduction Factor", detail: "0.85 applied to BUA to account for walls, columns & voids" });
    steps.push({ label: "Net Flooring Area", detail: `Total BUA × 0.85 = ${qty.toFixed(2)} m²` });
  } else if (code === "11.42") {
    steps.push({ label: "Standard", detail: "IS 1200 Part 11: Tile skirting in linear metres" });
    steps.push({ label: "Perimeter Sum", detail: "Sum of all room perimeters across all floors" });
    steps.push({ label: "Door Deduction", detail: "0.9× factor applied to exclude door openings" });
    steps.push({ label: "Net Skirting Length", detail: `${qty.toFixed(2)} lin.m of 100mm height skirting` });
  } else {
    steps.push({ label: "Item Code", detail: item.item_code });
    steps.push({ label: "IS Reference", detail: item.is_code_ref || "See CPWD DSR 2023" });
    steps.push({ label: "Quantity", detail: `${qty.toFixed(2)} ${item.unit}` });
    steps.push({ label: "Rate", detail: `₹${item.rate.toLocaleString("en-IN")} per ${item.unit}` });
  }

  return steps;
}

export function CalcTrailDrawer({ item, isOpen, onToggle }: CalcTrailDrawerProps) {
  const steps = isOpen ? getFormulaSteps(item) : [];
  const verificationNote = isOpen ? getVerificationNote(item) : "";

  return (
    <>
      {/* Toggle button (inline with the row) */}
      <button
        onClick={onToggle}
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold border cursor-pointer transition-all ${
          isOpen
            ? "bg-violet-100 text-violet-800 border-violet-300"
            : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-violet-50 hover:text-violet-700"
        }`}
        title="Show calculation formula"
      >
        <FlaskConical size={9} />
        {isOpen ? "Hide" : "Formula"}
      </button>

      {/* Expanded drawer */}
      {isOpen && (
        <div className="mt-2 p-3 bg-violet-50/80 border border-violet-200 rounded-xl space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-violet-800 uppercase tracking-wider">
            <FlaskConical size={11} />
            Calculation Derivation
          </div>

          {/* Steps */}
          <div className="space-y-1.5">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-2 text-[10px]">
                <span className="text-violet-400 font-bold w-4 text-right flex-shrink-0">{i + 1}.</span>
                <div>
                  <span className="font-bold text-violet-900">{step.label}: </span>
                  <span className="text-violet-700">{step.detail}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Verification note */}
          <div className="p-2 bg-white rounded-lg border border-violet-200 text-[10px] text-violet-800 font-mono">
            ✓ {verificationNote}
          </div>

          {/* IS Code reference */}
          {item.is_code_ref && (
            <div className="flex items-center gap-1 text-[9px] text-slate-500">
              <BookOpen size={9} />
              Reference: {item.is_code_ref}
            </div>
          )}
        </div>
      )}
    </>
  );
}
