"use client";
/**
 * MarketBenchmarkCard — Show where this estimate sits in the market
 * =================================================================
 * Uses hardcoded market range data (NBO/CREDAI norms) by typology and city.
 */

import React, { useState } from "react";
import { TrendingUp } from "lucide-react";

interface MarketBenchmarkCardProps {
  typologySlug: string;
  ratePerSqFt: number;
}

const CITY_OPTIONS = [
  { value: "delhi", label: "Delhi / NCR" },
  { value: "mumbai", label: "Mumbai" },
  { value: "bengaluru", label: "Bengaluru" },
  { value: "hyderabad", label: "Hyderabad" },
  { value: "pune", label: "Pune" },
  { value: "chennai", label: "Chennai" },
  { value: "ahmedabad", label: "Ahmedabad" },
  { value: "rural", label: "Rural / Tier-3" },
];

// Market ranges: [economy_low, economy_high, standard_low, standard_high, luxury_low, luxury_high]
// per sq.ft INR inclusive of contractor OH, excl. GST
const TYPOLOGY_RANGES: Record<string, [number, number, number, number, number, number]> = {
  "g1-residential-house":    [950, 1300, 1350, 1950, 2000, 3500],
  "multi-storey-rcc-frame":  [1100, 1500, 1550, 2200, 2250, 3800],
  "pmay-g-rural-house":      [600, 900, 900, 1200, 1200, 1700],
  "boundary-wall":           [500, 750, 750, 1100, 1100, 1800],
  "modular-kitchen":         [800, 1200, 1300, 2000, 2100, 4500],
  "septic-tank":             [300, 500, 500, 800, 800, 1400],
};

const CITY_MULTIPLIER: Record<string, number> = {
  delhi: 1.00,
  mumbai: 1.18,
  bengaluru: 1.12,
  hyderabad: 1.08,
  pune: 1.09,
  chennai: 1.06,
  ahmedabad: 0.93,
  rural: 0.80,
};

export function MarketBenchmarkCard({ typologySlug, ratePerSqFt }: MarketBenchmarkCardProps) {
  const [city, setCity] = useState("bengaluru");

  const baseRanges = TYPOLOGY_RANGES[typologySlug] || TYPOLOGY_RANGES["g1-residential-house"];
  const mult = CITY_MULTIPLIER[city] || 1.0;
  const [eLow, eHigh, sLow, sHigh, lLow, lHigh] = baseRanges.map((v) => Math.round(v * mult));

  if (ratePerSqFt <= 0) return null;

  // Determine segment
  let segment = "below-economy";
  let segmentColor = "text-slate-500";
  let segmentBg = "bg-slate-100";
  let barPosition = 0;
  let verdict = "";

  const fullRange = lHigh - eLow;

  if (ratePerSqFt < eLow) {
    segment = "Below Economy";
    segmentColor = "text-amber-700";
    segmentBg = "bg-amber-50";
    barPosition = 2;
    verdict = "⚠️ Estimate is unusually low. Verify quantities and soil conditions.";
  } else if (ratePerSqFt <= eHigh) {
    segment = "Economy Grade";
    segmentColor = "text-amber-800";
    segmentBg = "bg-amber-50";
    barPosition = Math.round(((ratePerSqFt - eLow) / (eHigh - eLow)) * 30 + 3);
    verdict = "🌿 Economy range — suitable for budget-constrained projects.";
  } else if (ratePerSqFt <= sHigh) {
    segment = "Standard Grade ✓";
    segmentColor = "text-emerald-800";
    segmentBg = "bg-emerald-50";
    barPosition = Math.round(((ratePerSqFt - sLow) / (sHigh - sLow)) * 34 + 33);
    const pct = Math.round(((ratePerSqFt - sLow) / (sHigh - sLow)) * 100);
    verdict = `✅ Well within standard market range (${pct}% through standard band).`;
  } else if (ratePerSqFt <= lHigh) {
    segment = "Premium / Luxury";
    segmentColor = "text-violet-800";
    segmentBg = "bg-violet-50";
    barPosition = Math.round(((ratePerSqFt - lLow) / (lHigh - lLow)) * 30 + 67);
    verdict = "💎 Premium range — luxury finishes and specifications expected.";
  } else {
    segment = "Ultra Premium";
    segmentColor = "text-rose-700";
    segmentBg = "bg-rose-50";
    barPosition = 97;
    verdict = "👑 Above standard luxury range — verify scope for ultra-premium specification.";
  }

  barPosition = Math.min(96, Math.max(2, barPosition));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-emerald-700" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            Market Rate Benchmark
          </span>
        </div>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 cursor-pointer"
        >
          {CITY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Your rate badge */}
      <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${segmentBg}`}>
        <div>
          <div className={`text-[10px] font-bold uppercase tracking-wider ${segmentColor}`}>
            Your Estimate
          </div>
          <div className={`text-xl font-black font-mono ${segmentColor}`}>
            ₹{ratePerSqFt.toLocaleString("en-IN")} / sq.ft
          </div>
        </div>
        <div className={`px-2.5 py-1 rounded-full text-[11px] font-black ${segmentBg} border ${
          segmentColor.includes("emerald") ? "border-emerald-300" :
          segmentColor.includes("violet") ? "border-violet-300" :
          segmentColor.includes("amber") ? "border-amber-300" : "border-rose-300"
        } ${segmentColor}`}>
          {segment}
        </div>
      </div>

      {/* Visual bar */}
      <div className="relative">
        <div className="flex w-full h-3 rounded-full overflow-hidden">
          <div className="flex-1 bg-amber-200" style={{ width: "33%" }} title={`Economy: ₹${eLow}–₹${eHigh}`} />
          <div className="flex-1 bg-emerald-300" style={{ width: "34%" }} title={`Standard: ₹${sLow}–₹${sHigh}`} />
          <div className="flex-1 bg-violet-300" style={{ width: "33%" }} title={`Luxury: ₹${lLow}–₹${lHigh}`} />
        </div>
        {/* Marker */}
        <div
          className="absolute top-0.5 -translate-x-1/2"
          style={{ left: `${barPosition}%` }}
        >
          <div className="w-2 h-2 rounded-full bg-slate-900 shadow-md border-2 border-white" />
          <div className="absolute left-1/2 -translate-x-1/2 mt-0.5 text-[9px] font-black text-slate-900 whitespace-nowrap">
            You
          </div>
        </div>
      </div>

      {/* Range labels */}
      <div className="flex justify-between text-[10px] font-bold text-slate-500 -mt-1">
        <span>🌿 Economy</span>
        <span>💎 Standard</span>
        <span>👑 Luxury</span>
      </div>

      {/* Range table */}
      <div className="grid grid-cols-3 gap-1.5 text-[10px]">
        {[
          { label: "🌿 Economy", low: eLow, high: eHigh, color: "bg-amber-50 border-amber-200 text-amber-800" },
          { label: "💎 Standard", low: sLow, high: sHigh, color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
          { label: "👑 Luxury", low: lLow, high: lHigh, color: "bg-violet-50 border-violet-200 text-violet-800" },
        ].map((tier) => (
          <div key={tier.label} className={`p-2 rounded-lg border ${tier.color}`}>
            <div className="font-black">{tier.label}</div>
            <div className="font-mono mt-0.5">₹{tier.low.toLocaleString("en-IN")}–₹{tier.high.toLocaleString("en-IN")}</div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-slate-400">{verdict}</p>
      <p className="text-[9px] text-slate-300">Source: NBO / CREDAI Annual Construction Cost Survey 2023–24. Rates excl. GST, in ₹/sq.ft.</p>
    </div>
  );
}
