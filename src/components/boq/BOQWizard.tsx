"use client";
/**
 * BOQWizard — 4-Step Universal Construction Estimator
 * ====================================================
 * Step 0: Which sector? (6 category cards)
 * Step 1: What exactly? (2–6 type cards per sector)
 * Step 2: How big? (sector-aware inputs)
 * Step 3: What quality? (sector-appropriate labels)
 */

import React, { useState } from "react";
import { ArrowLeft, ArrowRight, AlertTriangle, Zap } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SectorType =
  | "housing" | "commercial" | "institutional"
  | "industrial" | "interiors" | "infrastructure";

export type QualityType = "basic" | "good" | "premium";

// Unified size input modes
type SizeMode =
  | "sqft-floors"        // House, Office, Mall, School, Hospital …
  | "sqft-rooms"         // Hotel (area + no. of rooms)
  | "sqft-height"        // Warehouse (area + clear height in metres)
  | "linear-road"        // Road: length (m) × width (m)
  | "linear-wall"        // Boundary wall: perimeter (rft) × height (ft)
  | "linear-drain"       // Drain: length (m) × depth (m)
  | "running-feet"       // Modular kitchen counter length
  | "area-only"          // Painting / flooring (just area sqft)
  | "count-users"        // Septic tank: no. of users
  | "capacity-kl";       // Water tank: capacity in KL

export interface WizardResult {
  sector: SectorType;
  buildingType: string;      // engine slug
  buildingTypeLabel: string;
  buildingTypeEmoji: string;
  quality: QualityType;
  isPowerUser: boolean;
  // Standard
  areaSqFt: number;
  floors: number;
  // Hotel
  numRooms: number;
  // Linear (road / wall / drain)
  linearLength: number;
  linearWidth: number;
  linearHeight: number;
  linearDepth: number;
  // Special
  numUsers: number;      // septic
  capacityKL: number;    // water tank
  clearHeight: number;   // warehouse
  runningFeet: number;   // kitchen
}

// ─── Sector Data ─────────────────────────────────────────────────────────────

interface SectorDef {
  id: SectorType;
  emoji: string;
  title: string;
  subtitle: string;
  color: string;
  border: string;
  selectedBg: string;
}

const SECTORS: SectorDef[] = [
  { id: "housing",        emoji: "🏘️", title: "Housing",        subtitle: "Home, Villa, Apartment, Rural", color: "bg-emerald-50",  border: "border-emerald-400",  selectedBg: "bg-emerald-50"  },
  { id: "commercial",     emoji: "🏢", title: "Commercial",     subtitle: "Office, Mall, Hotel, Retail",   color: "bg-sky-50",      border: "border-sky-400",      selectedBg: "bg-sky-50"      },
  { id: "institutional",  emoji: "🏛️", title: "Institutional",  subtitle: "School, Hospital, Hall",       color: "bg-violet-50",   border: "border-violet-400",   selectedBg: "bg-violet-50"   },
  { id: "industrial",     emoji: "🏭", title: "Industrial",     subtitle: "Warehouse, Factory, Shed",      color: "bg-orange-50",   border: "border-orange-400",   selectedBg: "bg-orange-50"   },
  { id: "interiors",      emoji: "🛋️", title: "Interiors",      subtitle: "Kitchen, Bath, Flooring, Paint", color: "bg-amber-50",  border: "border-amber-400",    selectedBg: "bg-amber-50"    },
  { id: "infrastructure", emoji: "🛤️", title: "Infrastructure", subtitle: "Roads, Walls, Drains, Water",   color: "bg-slate-50",    border: "border-slate-400",    selectedBg: "bg-slate-100"   },
];

// ─── Building Types ───────────────────────────────────────────────────────────

interface BuildingTypeDef {
  slug: string;
  emoji: string;
  title: string;
  subtitle: string;
  sizeMode: SizeMode;
  isPowerUser?: boolean;
  isIndicative?: boolean;      // factory = PEB disclaimer
  indicativeNote?: string;
}

const BUILDING_TYPES: Record<SectorType, BuildingTypeDef[]> = {
  housing: [
    { slug: "g1-residential-house",    emoji: "🏡", title: "My House / Villa",       subtitle: "Independent residential bungalow (G to G+3)", sizeMode: "sqft-floors" },
    { slug: "multi-storey-rcc-frame",  emoji: "🏢", title: "Apartment Building",     subtitle: "Multi-storey RCC framed flat / group housing", sizeMode: "sqft-floors" },
    { slug: "pmay-g-rural-house",      emoji: "🏠", title: "Rural / PMAY-G House",   subtitle: "Simple rural or government-scheme home",       sizeMode: "sqft-floors" },
  ],
  commercial: [
    { slug: "commercial-office",  emoji: "💼", title: "IT / Corporate Office", subtitle: "Open-plan office with glass partitions & AC",   sizeMode: "sqft-floors", isPowerUser: true },
    { slug: "retail-showroom",    emoji: "🏪", title: "Retail Shop / Showroom", subtitle: "Ground-floor or multi-floor retail space",      sizeMode: "sqft-floors", isPowerUser: true },
    { slug: "shopping-mall",      emoji: "🛍️", title: "Shopping Mall / Multiplex", subtitle: "Atrium mall with food court & anchor stores", sizeMode: "sqft-floors", isPowerUser: true },
    { slug: "hotel-building",     emoji: "🏨", title: "Hotel / Guest House",    subtitle: "Rooms, lobby, restaurant & parking",           sizeMode: "sqft-rooms",  isPowerUser: true },
    { slug: "petrol-pump-civil-works", emoji: "⛽", title: "Petrol Pump",       subtitle: "Forecourt, canopy & retail outlet civil works", sizeMode: "sqft-floors", isPowerUser: true },
  ],
  institutional: [
    { slug: "school-classroom-block",  emoji: "🏫", title: "School / Classroom Block", subtitle: "4–8 classroom block with corridors",    sizeMode: "sqft-floors" },
    { slug: "hospital-phc-building",   emoji: "🏥", title: "Hospital / PHC / Clinic",  subtitle: "Primary health centre or clinic building", sizeMode: "sqft-floors" },
    { slug: "community-hall-bhawan",   emoji: "🏛️", title: "Community Hall / Bhawan", subtitle: "Gram panchayat hall or community centre",  sizeMode: "sqft-floors" },
    { slug: "anganwadi-centre",        emoji: "🧸", title: "Anganwadi / ICDS Centre",  subtitle: "Govt. childcare centre (40–50 m²)",       sizeMode: "sqft-floors" },
    { slug: "public-building",         emoji: "🏗️", title: "Public Building / Office", subtitle: "Government office or PHC-type structure", sizeMode: "sqft-floors" },
  ],
  industrial: [
    { slug: "industrial-warehouse-shed", emoji: "🏭", title: "Warehouse / Steel Shed",    subtitle: "Pre-engineered or RCC industrial storage shed", sizeMode: "sqft-height" },
    { slug: "factory-building",          emoji: "🔩", title: "Factory / Industrial Plant", subtitle: "RCC or PEB factory with crane provisions",       sizeMode: "sqft-height", isIndicative: true, indicativeNote: "PEB frame rates are from steel fabricators, not CPWD DSR. Treat as indicative — get a vendor quote for final pricing." },
  ],
  interiors: [
    { slug: "modular-kitchen",             emoji: "🍳", title: "Modular Kitchen",          subtitle: "L / U / straight layout with countertop & shutters", sizeMode: "running-feet" },
    { slug: "bathroom-renovation",         emoji: "🚿", title: "Bathroom Renovation",      subtitle: "Full strip & redo — tiles, fittings & waterproofing",  sizeMode: "sqft-floors" },
    { slug: "painting-full-home",          emoji: "🎨", title: "Full-Home Painting",       subtitle: "Interior + exterior walls — putty, primer & emulsion",  sizeMode: "area-only"   },
    { slug: "vitrified-tile-flooring",     emoji: "🪟", title: "Tile Flooring (Full Home)", subtitle: "Vitrified / ceramic tiles with adhesive & skirting",    sizeMode: "area-only"   },
    { slug: "upvc-aluminium-doors-windows",emoji: "🚪", title: "Doors & Windows Package",  subtitle: "UPVC / aluminium frames with glass & hardware",          sizeMode: "sqft-floors" },
  ],
  infrastructure: [
    { slug: "boundary-wall",      emoji: "🧱", title: "Boundary / Compound Wall", subtitle: "Brick masonry wall with RCC pillars & coping",          sizeMode: "linear-wall"  },
    { slug: "internal-road-bt",   emoji: "🛤️", title: "Road — Flexible (BT)",     subtitle: "Bituminous / asphalt road (PMGSY or urban)",            sizeMode: "linear-road"  },
    { slug: "internal-road-cc",   emoji: "🛣️", title: "Road — Rigid (CC)",        subtitle: "Cement concrete road — village or industrial",           sizeMode: "linear-road"  },
    { slug: "rcc-drain",          emoji: "🌊", title: "RCC Storm Drain",           subtitle: "Rectangular / trapezoidal stormwater drain",            sizeMode: "linear-drain" },
    { slug: "septic-tank",        emoji: "🪣", title: "Septic Tank",               subtitle: "2-chamber septic tank per IS 2470 (5–50 users)",        sizeMode: "count-users"  },
    { slug: "ohsr-water-tank",    emoji: "🚰", title: "Overhead Water Tank (OHSR)",subtitle: "RCC or steel elevated service reservoir",               sizeMode: "capacity-kl"  },
  ],
};

// ─── Quality Options ──────────────────────────────────────────────────────────

interface QualityDef {
  id: QualityType;
  emoji: string;
  title: string;
  description: string;
  badge: string;
  badgeClass: string;
}

const QUALITY_BY_SECTOR: Record<SectorType, QualityDef[]> = {
  housing: [
    { id: "basic",   emoji: "🪨", title: "Basic",   description: "Ceramic tiles, distemper paint",     badge: "₹800–1,200 / sq.ft",  badgeClass: "bg-amber-100 text-amber-900" },
    { id: "good",    emoji: "✨", title: "Good",    description: "Vitrified tiles, emulsion paint",    badge: "₹1,300–2,000 / sq.ft", badgeClass: "bg-emerald-100 text-emerald-900" },
    { id: "premium", emoji: "💎", title: "Premium", description: "Marble, false ceiling, granite top", badge: "₹2,000–3,500 / sq.ft", badgeClass: "bg-violet-100 text-violet-900" },
  ],
  commercial: [
    { id: "basic",   emoji: "🏗️", title: "Economy Fitout",   description: "Basic flooring, split AC, vinyl partitions",   badge: "₹2,200–3,000 / sq.ft", badgeClass: "bg-amber-100 text-amber-900" },
    { id: "good",    emoji: "🏢", title: "Standard Office",   description: "Carpet / tiles, false ceiling, glass partitions",badge: "₹3,000–4,500 / sq.ft", badgeClass: "bg-emerald-100 text-emerald-900" },
    { id: "premium", emoji: "🌟", title: "Premium / Grade-A", description: "Curtain wall façade, raised floor, central AC",  badge: "₹5,000–8,000 / sq.ft", badgeClass: "bg-violet-100 text-violet-900" },
  ],
  institutional: [
    { id: "basic",   emoji: "🏗️", title: "Functional",      description: "PWD standard finishes, basic fittings",      badge: "₹1,200–1,800 / sq.ft", badgeClass: "bg-amber-100 text-amber-900" },
    { id: "good",    emoji: "✅", title: "Standard",         description: "Good tiles, emulsion paint, quality fixtures", badge: "₹1,800–2,800 / sq.ft", badgeClass: "bg-emerald-100 text-emerald-900" },
    { id: "premium", emoji: "🏅", title: "Upgraded / Green", description: "IGBC-rated, energy-efficient, premium finish", badge: "₹3,000–5,000 / sq.ft", badgeClass: "bg-violet-100 text-violet-900" },
  ],
  industrial: [
    { id: "basic",   emoji: "🔩", title: "Basic Shed",        description: "PEB steel structure, plain concrete floor",  badge: "₹700–1,000 / sq.ft",  badgeClass: "bg-amber-100 text-amber-900" },
    { id: "good",    emoji: "🏭", title: "Standard Factory",  description: "RCC frame, hardener floor, crane provision", badge: "₹1,200–2,000 / sq.ft", badgeClass: "bg-emerald-100 text-emerald-900" },
    { id: "premium", emoji: "⚗️", title: "Clean Room / Pharma","description": "Epoxy flooring, positive pressure, HVAC",   badge: "₹3,500–6,000 / sq.ft", badgeClass: "bg-violet-100 text-violet-900" },
  ],
  interiors: [
    { id: "basic",   emoji: "🪨", title: "Economy",   description: "Basic materials, standard labour",   badge: "Budget",    badgeClass: "bg-amber-100 text-amber-900" },
    { id: "good",    emoji: "✨", title: "Standard",  description: "Good brands, experienced contractor", badge: "Mid-range", badgeClass: "bg-emerald-100 text-emerald-900" },
    { id: "premium", emoji: "💎", title: "Premium",   description: "Top brands, certified installer",     badge: "High-end",  badgeClass: "bg-violet-100 text-violet-900" },
  ],
  infrastructure: [
    { id: "basic",   emoji: "🛤️", title: "Standard",   description: "BIS / MoRTH / CPWD standard spec",     badge: "Govt. Schedule", badgeClass: "bg-amber-100 text-amber-900" },
    { id: "good",    emoji: "✅", title: "Upgraded",   description: "Enhanced thickness, better aggregates", badge: "+10–15%",         badgeClass: "bg-emerald-100 text-emerald-900" },
    { id: "premium", emoji: "🏅", title: "High-Spec",  description: "Heavy-duty / urban expressway spec",    badge: "+25–40%",         badgeClass: "bg-violet-100 text-violet-900" },
  ],
};

// ─── BHK presets ─────────────────────────────────────────────────────────────

const BHK_PRESETS = [
  { label: "1 BHK", sqft: 600  },
  { label: "2 BHK", sqft: 900  },
  { label: "3 BHK", sqft: 1300 },
  { label: "4 BHK", sqft: 1800 },
  { label: "5 BHK+",sqft: 2600 },
];

const FLOOR_OPTIONS = [
  { label: "Ground",  value: 1, desc: "Single floor" },
  { label: "G + 1",  value: 2, desc: "Two floors"   },
  { label: "G + 2",  value: 3, desc: "Three floors"  },
  { label: "G + 3",  value: 4, desc: "Four floors"   },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface BOQWizardProps {
  onComplete: (result: WizardResult) => void;
  initialSector?: SectorType;
}

export function BOQWizard({ onComplete, initialSector }: BOQWizardProps) {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(initialSector ? 1 : 0);
  const [animDir, setAnimDir] = useState<"fwd" | "back">("fwd");
  const [visible, setVisible] = useState(true);

  // Selections
  const [sector,        setSector       ] = useState<SectorType | null>(initialSector || null);
  const [buildingType,  setBuildingType ] = useState<BuildingTypeDef | null>(null);
  const [quality,       setQuality      ] = useState<QualityType | null>(null);

  // Size inputs
  const [areaSqFt,     setAreaSqFt    ] = useState(1200);
  const [areaInput,    setAreaInput   ] = useState("1,200");
  const [floors,       setFloors      ] = useState(2);
  const [numRooms,     setNumRooms    ] = useState(20);
  const [linearLength, setLinearLength] = useState(100);
  const [linearWidth,  setLinearWidth ] = useState(7);
  const [linearHeight, setLinearHeight] = useState(5);
  const [linearDepth,  setLinearDepth ] = useState(1.2);
  const [numUsers,     setNumUsers    ] = useState(10);
  const [capacityKL,   setCapacityKL  ] = useState(50);
  const [clearHeight,  setClearHeight ] = useState(6);
  const [runningFeet,  setRunningFeet ] = useState(12);

  const TOTAL_STEPS = 3; // steps 1-3 (step 0 is sector pick, not counted in progress)

  function animateTo(nextStep: 0 | 1 | 2 | 3, direction: "fwd" | "back") {
    setAnimDir(direction);
    setVisible(false);
    setTimeout(() => {
      setStep(nextStep);
      setVisible(true);
    }, 180);
  }

  function goBack() {
    if (step === 1) animateTo(0, "back");
    if (step === 2) animateTo(1, "back");
    if (step === 3) animateTo(2, "back");
  }

  function goNext() {
    if (step === 0 && sector) { animateTo(1, "fwd"); return; }
    if (step === 1 && buildingType) { animateTo(2, "fwd"); return; }
    if (step === 2) { animateTo(3, "fwd"); return; }
    if (step === 3 && quality && sector && buildingType) {
      onComplete({
        sector, quality,
        buildingType: buildingType.slug,
        buildingTypeLabel: buildingType.title,
        buildingTypeEmoji: buildingType.emoji,
        isPowerUser: !!buildingType.isPowerUser,
        areaSqFt, floors, numRooms,
        linearLength, linearWidth, linearHeight, linearDepth,
        numUsers, capacityKL, clearHeight, runningFeet,
      });
    }
  }

  const canProceed =
    (step === 0 && sector !== null) ||
    (step === 1 && buildingType !== null) ||
    (step === 2) ||
    (step === 3 && quality !== null);

  const sectorDef = SECTORS.find((s) => s.id === sector);
  const qualityOptions = sector ? QUALITY_BY_SECTOR[sector] : QUALITY_BY_SECTOR.housing;
  const buildingTypes = sector ? BUILDING_TYPES[sector] : [];

  function handleAreaInput(raw: string) {
    const digits = raw.replace(/[^0-9]/g, "");
    const num = parseInt(digits, 10) || 0;
    setAreaSqFt(num);
    setAreaInput(num > 0 ? num.toLocaleString("en-IN") : "");
  }

  // Derive step label
  const stepLabels = ["", "Pick a sector", "What are you building?", "How big is it?", "What quality?"];
  const displayStep = step === 0 ? 0 : step;
  const progressDots = [1, 2, 3];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/20 flex flex-col">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white flex items-center justify-center text-lg shadow-sm">
            🏗️
          </div>
          <div>
            <div className="text-sm font-black text-slate-900">BOQ Cost Estimator</div>
            <div className="text-[11px] text-slate-400 font-medium">
              {step === 0 ? "Pick your construction sector" : stepLabels[step + 1] ?? ""}
            </div>
          </div>
        </div>

        {/* Progress dots (shown only after sector picked) */}
        {step > 0 && (
          <div className="flex items-center gap-2">
            {progressDots.map((s) => (
              <div key={s}
                className={`rounded-full transition-all duration-300 ${
                  s < step  ? "w-6 h-2.5 bg-emerald-600"
                  : s === step ? "w-8 h-2.5 bg-emerald-800"
                  : "w-2.5 h-2.5 bg-slate-200"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Step Content ─────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col items-center justify-center px-4 py-10 transition-all duration-180 ${
        visible
          ? "opacity-100 translate-x-0"
          : animDir === "fwd" ? "opacity-0 translate-x-4" : "opacity-0 -translate-x-4"
      }`}>

        {/* ══ STEP 0: Sector Picker ════════════════════════════════ */}
        {step === 0 && (
          <div className="w-full max-w-3xl space-y-7">
            <div className="text-center space-y-1.5">
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900">What are you estimating?</h1>
              <p className="text-slate-400 text-sm">Pick the category that best describes your project</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {SECTORS.map((s) => (
                <button key={s.id}
                  onClick={() => { setSector(s.id); setBuildingType(null); }}
                  className={`group relative p-5 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                    sector === s.id
                      ? `${s.border} ${s.selectedBg} shadow-lg`
                      : "border-slate-200 bg-white hover:border-slate-300 shadow-sm"
                  }`}
                >
                  {sector === s.id && (
                    <div className="absolute top-3 right-3 w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-[10px] font-black">✓</span>
                    </div>
                  )}
                  <div className="text-4xl mb-2.5">{s.emoji}</div>
                  <div className="text-sm font-black text-slate-900">{s.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{s.subtitle}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ══ STEP 1: Building Type ════════════════════════════════ */}
        {step === 1 && sector && (
          <div className="w-full max-w-3xl space-y-7">
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full mb-1">
                <span>{sectorDef?.emoji}</span> {sectorDef?.title}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900">What are you building?</h1>
              <p className="text-slate-400 text-sm">Pick the type that matches your project</p>
            </div>

            {/* Power User notice */}
            {sector === "commercial" && (
              <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800">
                  <span className="font-black">Power User mode:</span> Commercial estimates carry ±25% accuracy.
                  Suitable for budgeting, not for contractor tendering. Always verify with a QS.
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {buildingTypes.map((bt) => (
                <button key={bt.slug}
                  onClick={() => setBuildingType(bt)}
                  className={`group relative p-4 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                    buildingType?.slug === bt.slug
                      ? "border-emerald-500 bg-emerald-50 shadow-md"
                      : "border-slate-200 bg-white hover:border-emerald-300 shadow-sm"
                  }`}
                >
                  {buildingType?.slug === bt.slug && (
                    <div className="absolute top-3 right-3 w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-[10px] font-black">✓</span>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <span className="text-3xl flex-shrink-0">{bt.emoji}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-black text-slate-900">{bt.title}</span>
                        {bt.isPowerUser && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            <Zap size={8} />POWER USER
                          </span>
                        )}
                        {bt.isIndicative && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                            INDICATIVE
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{bt.subtitle}</div>
                      {bt.indicativeNote && (
                        <div className="text-[10px] text-orange-700 mt-1 leading-snug italic">{bt.indicativeNote}</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ══ STEP 2: Size Inputs ══════════════════════════════════ */}
        {step === 2 && buildingType && (
          <div className="w-full max-w-2xl space-y-7">
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full mb-1">
                <span>{buildingType.emoji}</span> {buildingType.title}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900">How big is it?</h1>
            </div>

            {/* sqft-floors (standard — housing, office, school, hospital …) */}
            {(buildingType.sizeMode === "sqft-floors" || buildingType.sizeMode === "sqft-rooms") && (
              <>
                {/* BHK presets only for housing */}
                {sector === "housing" && (
                  <div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">Quick pick by size</div>
                    <div className="flex gap-2 flex-wrap justify-center">
                      {BHK_PRESETS.map((p) => (
                        <button key={p.label}
                          onClick={() => { setAreaSqFt(p.sqft); setAreaInput(p.sqft.toLocaleString("en-IN")); }}
                          className={`px-4 py-2 rounded-xl text-sm font-black cursor-pointer transition-all border ${
                            areaSqFt === p.sqft
                              ? "bg-emerald-800 text-white border-emerald-900 shadow-md"
                              : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400"
                          }`}
                        >
                          {p.label}
                          <span className="block text-[10px] font-bold opacity-70 mt-0.5">~{p.sqft.toLocaleString()} sq.ft</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sq.ft input */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Total Floor Area (sq.ft)</label>
                  <div className="flex items-center gap-3">
                    <input type="text" inputMode="numeric" value={areaInput}
                      onChange={(e) => handleAreaInput(e.target.value)}
                      placeholder="e.g. 1,200"
                      className="flex-1 text-3xl font-black text-slate-900 border-b-2 border-emerald-400 focus:outline-none bg-transparent pb-1"
                      autoFocus
                    />
                    <span className="text-lg font-bold text-slate-400">sq.ft</span>
                  </div>
                  {areaSqFt > 0 && (
                    <div className="text-xs text-emerald-700 font-medium">≈ {(areaSqFt / 10.764).toFixed(0)} m²</div>
                  )}
                </div>

                {/* Hotel room count */}
                {buildingType.sizeMode === "sqft-rooms" && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Number of Guest Rooms</label>
                    <div className="flex items-center gap-3">
                      <input type="number" min={5} max={500} value={numRooms}
                        onChange={(e) => setNumRooms(Number(e.target.value))}
                        className="flex-1 text-3xl font-black text-slate-900 border-b-2 border-emerald-400 focus:outline-none bg-transparent pb-1"
                      />
                      <span className="text-lg font-bold text-slate-400">rooms</span>
                    </div>
                    <div className="text-xs text-slate-400">Rate will be shown in ₹ per sq.ft</div>
                  </div>
                )}

                {/* Floor selector */}
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center">How many floors?</div>
                  <div className="grid grid-cols-4 gap-2">
                    {FLOOR_OPTIONS.map((f) => (
                      <button key={f.value} onClick={() => setFloors(f.value)}
                        className={`py-3 rounded-xl text-xs font-black cursor-pointer transition-all border ${
                          floors === f.value
                            ? "bg-emerald-800 text-white border-emerald-900 shadow-md"
                            : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400"
                        }`}
                      >
                        <div>{f.label}</div>
                        <div className="text-[9px] font-medium opacity-70 mt-0.5">{f.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* sqft-height (warehouse / factory) */}
            {buildingType.sizeMode === "sqft-height" && (
              <>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Floor Area (sq.ft)</label>
                  <div className="flex items-center gap-3">
                    <input type="text" inputMode="numeric" value={areaInput}
                      onChange={(e) => handleAreaInput(e.target.value)}
                      placeholder="e.g. 10,000" autoFocus
                      className="flex-1 text-3xl font-black text-slate-900 border-b-2 border-emerald-400 focus:outline-none bg-transparent pb-1"
                    />
                    <span className="text-lg font-bold text-slate-400">sq.ft</span>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Clear Internal Height (metres)</label>
                  <div className="flex items-center gap-3">
                    <input type="number" min={3} max={20} step={0.5} value={clearHeight}
                      onChange={(e) => setClearHeight(Number(e.target.value))}
                      className="flex-1 text-3xl font-black text-slate-900 border-b-2 border-emerald-400 focus:outline-none bg-transparent pb-1"
                    />
                    <span className="text-lg font-bold text-slate-400">m</span>
                  </div>
                  <div className="text-xs text-slate-400">Typical: 6 m for warehouse, 8–12 m for factory with crane</div>
                </div>
              </>
            )}

            {/* linear-wall (boundary wall) */}
            {buildingType.sizeMode === "linear-wall" && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Total Wall Perimeter (running feet)</label>
                  <div className="flex items-center gap-3">
                    <input type="number" min={10} max={5000} value={linearLength}
                      onChange={(e) => setLinearLength(Number(e.target.value))} autoFocus
                      className="flex-1 text-3xl font-black text-slate-900 border-b-2 border-emerald-400 focus:outline-none bg-transparent pb-1"
                    />
                    <span className="text-lg font-bold text-slate-400">rft</span>
                  </div>
                  <div className="text-xs text-slate-400">Measure the outer boundary of your plot</div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Wall Height (feet)</label>
                  <div className="flex gap-2 flex-wrap">
                    {[5, 6, 7, 8, 10, 12].map((h) => (
                      <button key={h} onClick={() => setLinearHeight(h)}
                        className={`px-4 py-2 rounded-xl text-sm font-black cursor-pointer transition-all border ${
                          linearHeight === h
                            ? "bg-emerald-800 text-white border-emerald-900"
                            : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400"
                        }`}
                      >{h} ft</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* linear-road */}
            {buildingType.sizeMode === "linear-road" && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Road Length (metres)</label>
                  <div className="flex items-center gap-3">
                    <input type="number" min={10} max={50000} value={linearLength}
                      onChange={(e) => setLinearLength(Number(e.target.value))} autoFocus
                      className="flex-1 text-3xl font-black text-slate-900 border-b-2 border-emerald-400 focus:outline-none bg-transparent pb-1"
                    />
                    <span className="text-lg font-bold text-slate-400">m</span>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Road Width (metres)</label>
                  <div className="flex gap-2 flex-wrap">
                    {[3, 3.75, 5.5, 7, 10, 14].map((w) => (
                      <button key={w} onClick={() => setLinearWidth(w)}
                        className={`px-3 py-2 rounded-xl text-xs font-black cursor-pointer transition-all border ${
                          linearWidth === w
                            ? "bg-emerald-800 text-white border-emerald-900"
                            : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400"
                        }`}
                      >{w} m<span className="block text-[9px] font-medium opacity-70 mt-0.5">{
                        w <= 3.75 ? "Single lane" : w <= 5.5 ? "Village road" : w <= 7 ? "2-lane" : w <= 10 ? "Urban road" : "Highway"
                      }</span></button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* linear-drain */}
            {buildingType.sizeMode === "linear-drain" && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Drain Length (metres)</label>
                  <div className="flex items-center gap-3">
                    <input type="number" min={10} value={linearLength}
                      onChange={(e) => setLinearLength(Number(e.target.value))} autoFocus
                      className="flex-1 text-3xl font-black text-slate-900 border-b-2 border-emerald-400 focus:outline-none bg-transparent pb-1"
                    />
                    <span className="text-lg font-bold text-slate-400">m</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Width (m)</label>
                    <input type="number" min={0.3} max={5} step={0.1} value={linearWidth}
                      onChange={(e) => setLinearWidth(Number(e.target.value))}
                      className="w-full text-2xl font-black text-slate-900 border-b-2 border-emerald-400 focus:outline-none bg-transparent pb-1"
                    />
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Depth (m)</label>
                    <input type="number" min={0.3} max={3} step={0.1} value={linearDepth}
                      onChange={(e) => setLinearDepth(Number(e.target.value))}
                      className="w-full text-2xl font-black text-slate-900 border-b-2 border-emerald-400 focus:outline-none bg-transparent pb-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* area-only (painting, flooring) */}
            {buildingType.sizeMode === "area-only" && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Total Area to Cover (sq.ft)</label>
                <div className="flex items-center gap-3">
                  <input type="text" inputMode="numeric" value={areaInput}
                    onChange={(e) => handleAreaInput(e.target.value)}
                    placeholder="e.g. 1,200" autoFocus
                    className="flex-1 text-3xl font-black text-slate-900 border-b-2 border-emerald-400 focus:outline-none bg-transparent pb-1"
                  />
                  <span className="text-lg font-bold text-slate-400">sq.ft</span>
                </div>
                <div className="text-xs text-slate-400">Measure the actual floor / wall area to be covered</div>
              </div>
            )}

            {/* count-users (septic tank) */}
            {buildingType.sizeMode === "count-users" && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Number of Users (persons per day)</label>
                <div className="flex gap-2 flex-wrap">
                  {[5, 10, 20, 30, 50, 100].map((n) => (
                    <button key={n} onClick={() => setNumUsers(n)}
                      className={`px-4 py-2 rounded-xl text-sm font-black cursor-pointer transition-all border ${
                        numUsers === n
                          ? "bg-emerald-800 text-white border-emerald-900"
                          : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400"
                      }`}
                    >{n} users</button>
                  ))}
                </div>
                <div className="text-xs text-slate-400">Per IS 2470 — tank capacity is calculated automatically from user count</div>
              </div>
            )}

            {/* capacity-kl (water tank) */}
            {buildingType.sizeMode === "capacity-kl" && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Storage Capacity (Kilolitres)</label>
                <div className="flex gap-2 flex-wrap">
                  {[5, 10, 25, 50, 100, 200, 500].map((n) => (
                    <button key={n} onClick={() => setCapacityKL(n)}
                      className={`px-4 py-2 rounded-xl text-sm font-black cursor-pointer transition-all border ${
                        capacityKL === n
                          ? "bg-emerald-800 text-white border-emerald-900"
                          : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400"
                      }`}
                    >{n} KL</button>
                  ))}
                </div>
              </div>
            )}

            {/* running-feet (kitchen) */}
            {buildingType.sizeMode === "running-feet" && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Counter Length (running feet)</label>
                <div className="flex gap-2 flex-wrap">
                  {[6, 8, 10, 12, 16, 20].map((n) => (
                    <button key={n} onClick={() => setRunningFeet(n)}
                      className={`px-4 py-2 rounded-xl text-sm font-black cursor-pointer transition-all border ${
                        runningFeet === n
                          ? "bg-emerald-800 text-white border-emerald-900"
                          : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400"
                      }`}
                    >
                      {n} rft
                      <span className="block text-[10px] font-medium opacity-70 mt-0.5">{
                        n <= 8 ? "Straight" : n <= 12 ? "L-shape" : "U-shape"
                      }</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ STEP 3: Quality ════════════════════════════════════ */}
        {step === 3 && sector && (
          <div className="w-full max-w-3xl space-y-7">
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full mb-1">
                <span>{buildingType?.emoji}</span> {buildingType?.title}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900">What quality of finish?</h1>
              <p className="text-slate-400 text-sm">This affects materials, fittings and specifications — pick what fits your budget</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {qualityOptions.map((q) => (
                <button key={q.id}
                  onClick={() => setQuality(q.id)}
                  className={`group relative p-5 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                    quality === q.id
                      ? "border-emerald-500 bg-emerald-50 shadow-lg"
                      : "border-slate-200 bg-white hover:border-slate-300 shadow-sm"
                  }`}
                >
                  {quality === q.id && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-black">✓</span>
                    </div>
                  )}
                  <div className="text-4xl mb-3">{q.emoji}</div>
                  <div className="text-base font-black text-slate-900 mb-1">{q.title}</div>
                  <div className="text-xs text-slate-500 mb-3 leading-snug">{q.description}</div>
                  <div className={`text-xs font-black px-2.5 py-1.5 rounded-lg inline-block ${q.badgeClass}`}>
                    {q.badge}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-center text-[11px] text-slate-400">
              Rates based on CPWD DSR 2023 & State PWD schedules. Actual cost may vary ±15%
              {buildingType?.isPowerUser ? " (±25% for commercial types)" : ""}.
            </p>
          </div>
        )}
      </div>

      {/* ── Bottom Nav ───────────────────────────────────────────────── */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-md border-t border-slate-100 px-6 py-4 flex items-center justify-between shadow-2xl">
        {step > 0 ? (
          <button onClick={goBack}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer"
          >
            <ArrowLeft size={15} /> Back
          </button>
        ) : <div />}

        <button onClick={goNext} disabled={!canProceed}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black text-sm transition-all shadow-md cursor-pointer ${
            canProceed
              ? "bg-emerald-800 hover:bg-emerald-900 text-white shadow-emerald-200 hover:scale-[1.02] active:scale-[0.98]"
              : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
          }`}
        >
          {step === 3 ? "Calculate my cost →" : "Next"}
          {step < 3 && canProceed && <ArrowRight size={15} />}
        </button>
      </div>
    </div>
  );
}
