/**
 * Physics & IS 1200 Material Decomposition Engine
 * =================================================
 * Converts composite civil line items & room assemblies into exact physical
 * procurement quantities (Cement bags, TMT steel tonnes, Aggregates, M-Sand,
 * Bricks/Blocks count, Tile boxes, Paint litres, Gypsum sheets).
 */

import { BOQLineItem } from "./types";
import { TurnkeyRoom } from "@/store/turnkey-store";

export interface MaterialIndentItem {
  id: string;
  category: 'structural' | 'masonry' | 'tiles' | 'ceilings_paint' | 'openings_waterproofing';
  name: string;
  spec: string;
  netQty: number;
  wastagePercent: number;
  procurementQty: number;
  unit: string;
  packageUnit: string; // e.g. "50kg Bag", "Tonne", "Box (4 pcs)", "20L Drum"
  packageCount: number;
  defaultRate: number;
  currentRate: number;
  amount: number;
  isEdited?: boolean;
}

export interface MaterialIndentCategory {
  id: string;
  title: string;
  icon: string;
  description: string;
  items: MaterialIndentItem[];
  totalCost: number;
}

export interface FullMaterialBreakdown {
  categories: MaterialIndentCategory[];
  totalMaterialCost: number;
  cementBagsTotal: number;
  steelTonnesTotal: number;
  bricksCountTotal: number;
  tileBoxesTotal: number;
  paintLitresTotal: number;
}

/**
 * calculateMaterialBreakdown
 * ──────────────────────────
 * Parses all line items in the merged BOQ and decomposes them into physical
 * material procurement indents.
 */
export function calculateMaterialBreakdown(
  allItems: BOQLineItem[],
  rooms: TurnkeyRoom[] = [],
  buaM2: number = 108
): FullMaterialBreakdown {
  
  // ── 1. Aggregate fundamental geometric quantities from line items ─────────
  let pccM10Vol = 0;       // m³ (4.1.8)
  let pccM15Vol = 0;       // m³ (4.1.3)
  let rccFootingVol = 0;   // m³ (5.1.2)
  let rccColBeamVol = 0;   // m³ (5.2.2, 5.3.1)
  let rccSlabVol = 0;      // m³ (5.4.1)
  let steelKgFromItems = 0;// kg (5.22.6, TMT-500)
  let brickwork230Vol = 0; // m³ (6.1.2, 6.4.2)
  let brickwork115Area = 0;// m² (6.4.3)
  let intPlasterArea = 0;  // m² (13.1.2)
  let extPlasterArea = 0;  // m² (13.5.2)
  let vitrifiedTileArea = 0; // m² (11.41)
  let ceramicTileArea = 0;   // m² (11.39)
  let dadoTileArea = 0;      // m² (11.45)
  let skirtingLen = 0;       // m (11.42)
  let falseCeilingArea = 0;  // m² (INT-FC-GYP, 12.45)
  let paintCeilingArea = 0;  // m² (13.41.1, 13.80)
  let paintWallArea = 0;     // m² (13.44, 13.50)
  let doorsCount = 0;
  let windowsCount = 0;

  allItems.forEach((item) => {
    const code = item.item_code || '';
    const desc = (item.description || '').toLowerCase();
    const qty = item.quantity;

    if (code === '4.1.8' || (desc.includes('pcc 1:4:8') && item.unit === 'm³')) {
      pccM10Vol += qty;
    } else if (code === '4.1.3' || (desc.includes('pcc 1:2:4') && item.unit === 'm³')) {
      pccM15Vol += qty;
    } else if (code === '5.1.2' || desc.includes('footing') && item.unit === 'm³') {
      rccFootingVol += qty;
    } else if (code === '5.2.2' || code === '5.3.1' || (desc.includes('column') || desc.includes('beam')) && item.unit === 'm³') {
      rccColBeamVol += qty;
    } else if (code === '5.4.1' || desc.includes('slab') && item.unit === 'm³') {
      rccSlabVol += qty;
    } else if (code === '5.22.6' || code === 'TMT-500' || desc.includes('steel') || desc.includes('tmt')) {
      steelKgFromItems += item.unit === 'tonne' || item.unit === 'MT' ? qty * 1000 : qty;
    } else if (code === '6.4.2' || code === '6.1.2' || (desc.includes('brickwork') && item.unit === 'm³')) {
      brickwork230Vol += qty;
    } else if (code === '6.4.3' || (desc.includes('half brick') && item.unit === 'm²')) {
      brickwork115Area += qty;
    } else if (code === '13.1.2' || desc.includes('internal plaster')) {
      intPlasterArea += qty;
    } else if (code === '13.5.2' || desc.includes('external plaster')) {
      extPlasterArea += qty;
    } else if (code === '11.41' || desc.includes('vitrified')) {
      vitrifiedTileArea += qty;
    } else if (code === '11.39' || desc.includes('anti-skid') || desc.includes('ceramic floor')) {
      ceramicTileArea += qty;
    } else if (code === '11.45' || desc.includes('dado')) {
      dadoTileArea += qty;
    } else if (code === '11.42' || desc.includes('skirting')) {
      skirtingLen += qty;
    } else if (code === 'INT-FC-GYP' || code === '12.45' || desc.includes('false ceiling')) {
      falseCeilingArea += qty;
    } else if (code === '13.41.1' || desc.includes('ceiling paint')) {
      paintCeilingArea += qty;
    } else if (code === '13.44' || code === '13.50' || desc.includes('emulsion') || desc.includes('acrylic')) {
      paintWallArea += qty;
    } else if (code === 'DOOR-1' || desc.includes('door')) {
      doorsCount += Math.max(1, Math.round(qty));
    } else if (code === 'WIN-1' || desc.includes('window')) {
      windowsCount += Math.max(1, Math.round(qty));
    }
  });

  // Fallbacks if only room assemblies were traced
  if (vitrifiedTileArea === 0 && rooms.length > 0) {
    rooms.forEach(r => {
      if (r.roomType !== 'toilet_bath' && r.roomType !== 'utility') vitrifiedTileArea += r.areaM2;
      else ceramicTileArea += r.areaM2;
      if (r.toggles.dadoTiles) dadoTileArea += Math.max(0, r.perimeterM - 0.9) * 2.1;
      if (r.toggles.skirting) skirtingLen += Math.max(0, r.perimeterM - 0.9);
      if (r.toggles.falseCeiling) falseCeilingArea += r.areaM2;
    });
  }

  // ── 2. IS 1200 Constant Multipliers ───────────────────────────────────────
  
  // A. CEMENT CALCULATION (in 50kg Bags)
  // PCC 1:4:8 = 3.4 bags/m³
  // PCC 1:2:4 = 6.4 bags/m³
  // RCC 1:1.5:3 M25 = 8.2 bags/m³
  // Brickwork 230mm (1:6) = 1.4 bags/m³
  // Partition 115mm (1:4) = 0.25 bags/m²
  // Int Plaster 12mm (1:6) = 0.08 bags/m²
  // Ext Plaster 18mm (1:6) = 0.12 bags/m²
  // Tile bed (1:4) = 0.18 bags/m²
  const totalRccVol = rccFootingVol + rccColBeamVol + rccSlabVol || (buaM2 * 0.165);
  const totalPccVol = pccM10Vol + pccM15Vol || (buaM2 * 0.08);
  const totalBrickVol = brickwork230Vol || (buaM2 * 0.22);
  const totalPlasterArea = intPlasterArea + extPlasterArea || (buaM2 * 3.2);
  const totalTileArea = vitrifiedTileArea + ceramicTileArea + dadoTileArea || (buaM2 * 0.9);

  const cementBagsPCC     = totalPccVol * 5.0;
  const cementBagsRCC     = totalRccVol * 8.2;
  const cementBagsMasonry = totalBrickVol * 1.4 + (brickwork115Area * 0.25);
  const cementBagsPlaster = (intPlasterArea || buaM2 * 2.2) * 0.08 + (extPlasterArea || buaM2 * 1.0) * 0.12;
  const cementBagsTiles   = totalTileArea * 0.18;
  const netCementBags     = Math.ceil(cementBagsPCC + cementBagsRCC + cementBagsMasonry + cementBagsPlaster + cementBagsTiles);
  const grossCementBags   = Math.ceil(netCementBags * 1.03); // 3% handling margin

  // B. STEEL TMT REBAR (Fe500D)
  const netSteelKg = steelKgFromItems > 0 ? steelKgFromItems : (totalRccVol * 128);
  const grossSteelTonnes = parseFloat(((netSteelKg * 1.05) / 1000).toFixed(2)); // 5% cutting waste

  // C. AGGREGATES & M-SAND
  const coarseAggregateM3 = parseFloat(((totalPccVol * 0.85) + (totalRccVol * 0.82)).toFixed(1));
  const mSandConcreteM3   = parseFloat(((totalPccVol * 0.45) + (totalRccVol * 0.42)).toFixed(1));
  const mSandPlasterM3    = parseFloat(((totalPlasterArea * 0.018) + (totalBrickVol * 0.28)).toFixed(1));
  const totalSandM3       = parseFloat((mSandConcreteM3 + mSandPlasterM3).toFixed(1));

  // D. BRICKS & BLOCKS COUNT
  const netBricksCount = Math.round((totalBrickVol * 500) + (brickwork115Area * 55));
  const grossBricksCount = Math.ceil(netBricksCount * 1.05); // 5% breakage margin

  // E. TILES (Boxes)
  // Vitrified: 600x600mm -> 4 pcs = 15.5 sqft (1.44 m²) per box
  const vitrifiedSqFt = (vitrifiedTileArea || buaM2 * 0.75) * 10.7639;
  const vitrifiedBoxes = Math.ceil((vitrifiedSqFt * 1.08) / 15.5); // 8% cut waste

  // Anti-Skid: 300x300mm -> 10 pcs = 9.68 sqft (0.90 m²) per box
  const ceramicSqFt = (ceramicTileArea || buaM2 * 0.15) * 10.7639;
  const ceramicBoxes = Math.ceil((ceramicSqFt * 1.08) / 9.68);

  // Dado Wall Tiles: 300x450mm -> 8 pcs = 11.62 sqft (1.08 m²) per box
  const dadoSqFt = (dadoTileArea || (rooms.filter(r=>r.toggles.dadoTiles).length * 150)) * 10.7639;
  const dadoBoxes = Math.ceil((dadoSqFt * 1.08) / 11.62);

  // F. FALSE CEILING GYPSUM BOARDS (6ft x 4ft = 24 sqft = 2.23 m² per board)
  const ceilingSqM = falseCeilingArea || (buaM2 * 0.55);
  const gypsumBoards = Math.ceil((ceilingSqM * 1.06) / 2.23);
  const giChannelsRmt = Math.ceil(ceilingSqM * 2.1);

  // G. PAINTS & PUTTY
  const paintTotalArea = (paintWallArea || buaM2 * 2.6) + (paintCeilingArea || buaM2 * 0.8);
  const puttyKg = Math.ceil(paintTotalArea * 0.8);
  const puttyBags40kg = Math.ceil(puttyKg / 40);
  const interiorPaintLitres = Math.ceil((paintTotalArea * 0.18) * 1.05);
  const exteriorPaintLitres = Math.ceil(((extPlasterArea || buaM2 * 1.0) * 0.22) * 1.05);
  const primerLitres = Math.ceil((paintTotalArea * 0.10) * 1.05);

  // ── 3. Build Categorized Material Items ────────────────────────────────────

  const structuralItems: MaterialIndentItem[] = [
    {
      id: 'mat-cement-53',
      category: 'structural',
      name: 'OPC/PPC 53-Grade Cement',
      spec: 'UltraTech / ACC / Birla Super (IS 12269 & IS 1489)',
      netQty: netCementBags,
      wastagePercent: 3,
      procurementQty: grossCementBags,
      unit: 'Bags',
      packageUnit: '50 kg Bag',
      packageCount: grossCementBags,
      defaultRate: 395,
      currentRate: 395,
      amount: grossCementBags * 395,
    },
    {
      id: 'mat-tmt-500d',
      category: 'structural',
      name: 'Fe-500D TMT Rebar Reinforcement',
      spec: 'Tata Tiscon / JSW Neosteel / Jindal Panther (IS 1786)',
      netQty: parseFloat((netSteelKg / 1000).toFixed(2)),
      wastagePercent: 5,
      procurementQty: grossSteelTonnes,
      unit: 'Tonnes',
      packageUnit: '1 MT Bundle',
      packageCount: Math.ceil(grossSteelTonnes),
      defaultRate: 66500,
      currentRate: 66500,
      amount: Math.round(grossSteelTonnes * 66500),
    },
    {
      id: 'mat-aggregate-20mm',
      category: 'structural',
      name: '20mm & 40mm Graded Stone Jelly Aggregate',
      spec: 'Hard crushed granite stone aggregate (IS 383)',
      netQty: coarseAggregateM3,
      wastagePercent: 5,
      procurementQty: parseFloat((coarseAggregateM3 * 1.05).toFixed(1)),
      unit: 'm³',
      packageUnit: 'Brass (2.83 m³)',
      packageCount: parseFloat(((coarseAggregateM3 * 1.05) / 2.83).toFixed(1)),
      defaultRate: 1850,
      currentRate: 1850,
      amount: Math.round(coarseAggregateM3 * 1.05 * 1850),
    },
    {
      id: 'mat-msand-concrete',
      category: 'structural',
      name: 'Manufactured Concrete Sand (M-Sand Zone II)',
      spec: 'Double washed & classified manufactured sand (IS 383)',
      netQty: totalSandM3,
      wastagePercent: 5,
      procurementQty: parseFloat((totalSandM3 * 1.05).toFixed(1)),
      unit: 'm³',
      packageUnit: 'Brass (2.83 m³)',
      packageCount: parseFloat(((totalSandM3 * 1.05) / 2.83).toFixed(1)),
      defaultRate: 1650,
      currentRate: 1650,
      amount: Math.round(totalSandM3 * 1.05 * 1650),
    },
  ];

  const masonryItems: MaterialIndentItem[] = [
    {
      id: 'mat-red-bricks',
      category: 'masonry',
      name: 'First Class Burnt Clay Red Bricks',
      spec: 'Standard 230×115×75mm Class 7.5 (IS 1077)',
      netQty: netBricksCount,
      wastagePercent: 5,
      procurementQty: grossBricksCount,
      unit: 'Nos',
      packageUnit: '1,000 Bricks Load',
      packageCount: Math.ceil(grossBricksCount / 1000),
      defaultRate: 9.5,
      currentRate: 9.5,
      amount: Math.round(grossBricksCount * 9.5),
    },
    {
      id: 'mat-dpc-chem',
      category: 'masonry',
      name: 'Integral Waterproofing Admixture (Liquid)',
      spec: 'Dr. Fixit 101 LW+ / Fosroc Conplast (IS 2645)',
      netQty: Math.ceil(grossCementBags * 0.20),
      wastagePercent: 2,
      procurementQty: Math.ceil(grossCementBags * 0.20),
      unit: 'Litres',
      packageUnit: '20L Canister',
      packageCount: Math.ceil((grossCementBags * 0.20) / 20),
      defaultRate: 165,
      currentRate: 165,
      amount: Math.round(Math.ceil(grossCementBags * 0.20) * 165),
    },
  ];

  const tileItems: MaterialIndentItem[] = [
    {
      id: 'mat-vitrified-tiles',
      category: 'tiles',
      name: 'Polished Vitrified Floor Tiles (600×600mm)',
      spec: 'Kajaria / Somany / Simpolo Glazed Vitrified (IS 15622 Group Bla)',
      netQty: Math.round(vitrifiedSqFt),
      wastagePercent: 8,
      procurementQty: vitrifiedBoxes * 15.5,
      unit: 'sq.ft',
      packageUnit: 'Box (4 pcs / 15.5 sqft)',
      packageCount: vitrifiedBoxes,
      defaultRate: 68,
      currentRate: 68,
      amount: Math.round(vitrifiedBoxes * 15.5 * 68),
    },
    {
      id: 'mat-ceramic-tiles',
      category: 'tiles',
      name: 'Anti-Skid Matte Ceramic Floor Tiles (300×300mm)',
      spec: 'Kajaria / Nitco Anti-Skid R10 Rating for Bathrooms & Balcony',
      netQty: Math.round(ceramicSqFt),
      wastagePercent: 8,
      procurementQty: ceramicBoxes * 9.68,
      unit: 'sq.ft',
      packageUnit: 'Box (10 pcs / 9.68 sqft)',
      packageCount: ceramicBoxes,
      defaultRate: 48,
      currentRate: 48,
      amount: Math.round(ceramicBoxes * 9.68 * 48),
    },
    {
      id: 'mat-dado-tiles',
      category: 'tiles',
      name: 'Glazed Digital Wall Dado Tiles (300×450mm)',
      spec: 'High-gloss digital ceramic wall tiles for 2.1m Bathrooms & Kitchen',
      netQty: Math.round(dadoSqFt),
      wastagePercent: 8,
      procurementQty: dadoBoxes * 11.62,
      unit: 'sq.ft',
      packageUnit: 'Box (8 pcs / 11.62 sqft)',
      packageCount: dadoBoxes,
      defaultRate: 52,
      currentRate: 52,
      amount: Math.round(dadoBoxes * 11.62 * 52),
    },
    {
      id: 'mat-tile-adhesive',
      category: 'tiles',
      name: 'Polymer Modified Tile Adhesive & Epoxy Grout',
      spec: 'Roff T02 / MYK Laticrete 290 Tile Adhesive (IS 15477 Type 2)',
      netQty: Math.ceil(totalTileArea * 4.5),
      wastagePercent: 5,
      procurementQty: Math.ceil(totalTileArea * 4.5),
      unit: 'kg',
      packageUnit: '20 kg Bag',
      packageCount: Math.ceil((totalTileArea * 4.5) / 20),
      defaultRate: 22,
      currentRate: 22,
      amount: Math.round(Math.ceil(totalTileArea * 4.5) * 22),
    },
  ];

  const ceilingsAndPaintItems: MaterialIndentItem[] = [
    {
      id: 'mat-gypsum-boards',
      category: 'ceilings_paint',
      name: '12.5mm Gyproc Gypsum False Ceiling Boards',
      spec: 'Saint-Gobain Gyproc 6ft × 4ft (1.83m × 1.22m) Tapered Edge',
      netQty: Math.ceil(ceilingSqM / 2.23),
      wastagePercent: 6,
      procurementQty: gypsumBoards,
      unit: 'Sheets',
      packageUnit: '6ft × 4ft Sheet',
      packageCount: gypsumBoards,
      defaultRate: 460,
      currentRate: 460,
      amount: gypsumBoards * 460,
    },
    {
      id: 'mat-gi-channel',
      category: 'ceilings_paint',
      name: 'GI Ceiling Framing Grid (Perimeter & Intermediate)',
      spec: '0.50mm BMT Galvanized steel suspension grid & brackets',
      netQty: giChannelsRmt,
      wastagePercent: 5,
      procurementQty: giChannelsRmt,
      unit: 'Rft',
      packageUnit: '12 ft Lengths',
      packageCount: Math.ceil(giChannelsRmt / 3.65),
      defaultRate: 42,
      currentRate: 42,
      amount: giChannelsRmt * 42,
    },
    {
      id: 'mat-wall-putty',
      category: 'ceilings_paint',
      name: 'White Cement Wall Putty (2-Coat)',
      spec: 'Birla White / JK WallMaxx Polymer Water-Resistant Putty',
      netQty: puttyKg,
      wastagePercent: 3,
      procurementQty: puttyBags40kg * 40,
      unit: 'kg',
      packageUnit: '40 kg Bag',
      packageCount: puttyBags40kg,
      defaultRate: 24,
      currentRate: 24,
      amount: puttyBags40kg * 40 * 24,
    },
    {
      id: 'mat-interior-paint',
      category: 'ceilings_paint',
      name: 'Premium Interior Acrylic Emulsion Paint',
      spec: 'Asian Paints Royale / Berger Silk Luxury (2 coats over primer)',
      netQty: interiorPaintLitres,
      wastagePercent: 5,
      procurementQty: interiorPaintLitres,
      unit: 'Litres',
      packageUnit: '20L Bucket',
      packageCount: Math.ceil(interiorPaintLitres / 20),
      defaultRate: 340,
      currentRate: 340,
      amount: interiorPaintLitres * 340,
    },
    {
      id: 'mat-exterior-paint',
      category: 'ceilings_paint',
      name: 'Exterior Weather-Shield Anti-Fungal Paint',
      spec: 'Asian Paints Apex Ultima / Dulux Weathershield (2 coats)',
      netQty: exteriorPaintLitres,
      wastagePercent: 5,
      procurementQty: exteriorPaintLitres,
      unit: 'Litres',
      packageUnit: '20L Bucket',
      packageCount: Math.ceil(exteriorPaintLitres / 20),
      defaultRate: 380,
      currentRate: 380,
      amount: exteriorPaintLitres * 380,
    },
  ];

  const openingsItems: MaterialIndentItem[] = [
    {
      id: 'mat-doors-flush',
      category: 'openings_waterproofing',
      name: 'Teak/Flush Interior & Toilet Door Assemblies',
      spec: '32mm BWP Grade flush doors with Teakwood frame & SS 304 hardware',
      netQty: Math.max(4, Math.round(buaM2 / 20)),
      wastagePercent: 0,
      procurementQty: Math.max(4, Math.round(buaM2 / 20)),
      unit: 'Sets',
      packageUnit: 'Complete Door Set',
      packageCount: Math.max(4, Math.round(buaM2 / 20)),
      defaultRate: 6800,
      currentRate: 6800,
      amount: Math.max(4, Math.round(buaM2 / 20)) * 6800,
    },
    {
      id: 'mat-windows-upvc',
      category: 'openings_waterproofing',
      name: 'UPVC Sliding / Casement Window Systems',
      spec: 'Kommerling / Fenesta 3-Track UPVC windows with 5mm toughened glass',
      netQty: Math.max(6, Math.round(buaM2 / 15)),
      wastagePercent: 0,
      procurementQty: Math.max(6, Math.round(buaM2 / 15)),
      unit: 'Units',
      packageUnit: 'Custom Frame (4×4 ft / 5×4 ft)',
      packageCount: Math.max(6, Math.round(buaM2 / 15)),
      defaultRate: 5400,
      currentRate: 5400,
      amount: Math.max(6, Math.round(buaM2 / 15)) * 5400,
    },
  ];

  const categories: MaterialIndentCategory[] = [
    {
      id: 'structural',
      title: 'Structural Raw Materials',
      icon: '🏗️',
      description: 'Cement, Fe500D TMT Steel, Aggregates & Concrete M-Sand',
      items: structuralItems,
      totalCost: structuralItems.reduce((s, i) => s + i.amount, 0),
    },
    {
      id: 'masonry',
      title: 'Masonry & Waterproofing Chemical',
      icon: '🧱',
      description: 'Red Clay Bricks, DPC Mortar & Integral Waterproofing Admixtures',
      items: masonryItems,
      totalCost: masonryItems.reduce((s, i) => s + i.amount, 0),
    },
    {
      id: 'tiles',
      title: 'Flooring, Wall Dado & Adhesives',
      icon: '🪵',
      description: 'Vitrified Tiles (600×600), Anti-skid Ceramic & 2.1m Wall Dado',
      items: tileItems,
      totalCost: tileItems.reduce((s, i) => s + i.amount, 0),
    },
    {
      id: 'ceilings_paint',
      title: 'Ceilings, Paint & Putty',
      icon: '🎨',
      description: 'Saint-Gobain Gypsum Boards, GI Framing, Emulsion Paint & Putty',
      items: ceilingsAndPaintItems,
      totalCost: ceilingsAndPaintItems.reduce((s, i) => s + i.amount, 0),
    },
    {
      id: 'openings_waterproofing',
      title: 'Doors, UPVC Windows & Openings',
      icon: '🚪',
      description: 'BWP Flush Doors, Hardware Sets & Multi-Track UPVC Window Units',
      items: openingsItems,
      totalCost: openingsItems.reduce((s, i) => s + i.amount, 0),
    },
  ];

  const totalMaterialCost = categories.reduce((sum, c) => sum + c.totalCost, 0);

  return {
    categories,
    totalMaterialCost,
    cementBagsTotal: grossCementBags,
    steelTonnesTotal: grossSteelTonnes,
    bricksCountTotal: grossBricksCount,
    tileBoxesTotal: vitrifiedBoxes + ceramicBoxes + dadoBoxes,
    paintLitresTotal: interiorPaintLitres + exteriorPaintLitres,
  };
}
