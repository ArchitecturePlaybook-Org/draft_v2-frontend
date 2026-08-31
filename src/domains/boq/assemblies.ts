/**
 * "Draw Once, Calculate All" Multi-Trade Assembly Engine
 * =======================================================
 * Translates a single room polygon or wall line into 5-6 parallel building trades
 * per CPWD DSR 2023, IS 1200, and IS 456 standards.
 */

import { BOQLineItem } from "./types";
import { makeDSRItem } from "./engine";

export type RoomAssemblyType = "living_bedroom" | "toilet_bath" | "kitchen" | "balcony" | "utility";
export type FinishQuality = "economy" | "standard" | "luxury";

export interface RoomAssemblyToggles {
  flooring: boolean;
  skirting: boolean;
  falseCeiling: boolean;
  paint: boolean;
  plinthSand: boolean;
  pccBed: boolean;
  dadoTiles: boolean;
}

export const DEFAULT_ROOM_TOGGLES: Record<RoomAssemblyType, RoomAssemblyToggles> = {
  living_bedroom: {
    flooring: true,
    skirting: true,
    falseCeiling: true,
    paint: true,
    plinthSand: true,
    pccBed: true,
    dadoTiles: false,
  },
  toilet_bath: {
    flooring: true,
    skirting: false,
    falseCeiling: false,
    paint: true,
    plinthSand: true,
    pccBed: true,
    dadoTiles: true,
  },
  kitchen: {
    flooring: true,
    skirting: true,
    falseCeiling: true,
    paint: true,
    plinthSand: true,
    pccBed: true,
    dadoTiles: true,
  },
  balcony: {
    flooring: true,
    skirting: true,
    falseCeiling: false,
    paint: false,
    plinthSand: false,
    pccBed: true,
    dadoTiles: false,
  },
  utility: {
    flooring: true,
    skirting: true,
    falseCeiling: false,
    paint: true,
    plinthSand: true,
    pccBed: true,
    dadoTiles: true,
  },
};

/**
 * Calculates all 6 trades for a single room polygon without redundant tracing.
 */
export function calcRoomMultiTradeBOQ(
  areaM2: number,
  perimeterM: number,
  roomType: RoomAssemblyType = "living_bedroom",
  toggles: Partial<RoomAssemblyToggles> = {},
  finishQuality: FinishQuality = "standard",
  heightM: number = 3.0,
  roomName: string = "Room"
): BOQLineItem[] {
  const active = { ...DEFAULT_ROOM_TOGGLES[roomType], ...toggles };
  const items: BOQLineItem[] = [];

  if (areaM2 <= 0) return items;

  // 1. Flooring Tiles
  if (active.flooring) {
    if (roomType === "toilet_bath" || roomType === "utility") {
      items.push(
        makeDSRItem(
          "11.39",
          areaM2,
          `Anti-skid Ceramic floor tiles in ${roomName}`,
          `Anti-skid ceramic floor tiles 300x300mm in ${roomName}`,
          "room-assembly",
          roomName
        )
      );
    } else if (finishQuality === "luxury") {
      items.push(
        makeDSRItem(
          "11.41",
          areaM2,
          `Polished Italian/Glazed Vitrified tiles in ${roomName}`,
          `Polished Large Format Glazed Vitrified Tiles (800x1600mm) in ${roomName}`,
          "room-assembly",
          roomName
        )
      );
    } else {
      items.push(
        makeDSRItem(
          "11.41",
          areaM2,
          `Polished Vitrified floor tiles 600x600mm in ${roomName}`,
          `Polished vitrified floor tiles 600x600mm in ${roomName}`,
          "room-assembly",
          roomName
        )
      );
    }
  }

  // 2. Skirting (Perimeter - 0.9m door width)
  if (active.skirting && perimeterM > 1) {
    const skirtingLen = Math.max(0, perimeterM - 0.9);
    items.push(
      makeDSRItem(
        "11.42",
        skirtingLen,
        `Matching tile skirting (100mm height) in ${roomName}`,
        `Matching tile skirting 100mm height in ${roomName}`,
        "room-assembly",
        roomName
      )
    );
  }

  // 3. Wall Dado (Toilets & Kitchens)
  if (active.dadoTiles && perimeterM > 1) {
    const dadoHeight = roomType === "toilet_bath" ? 2.1 : 0.6; // 2.1m for bath, 0.6m above kitchen counter
    const netDadoLen = Math.max(0, perimeterM - 0.9);
    const dadoArea = netDadoLen * dadoHeight;
    items.push(
      makeDSRItem(
        "11.45",
        dadoArea,
        `Glazed wall dado tiles up to ${dadoHeight}m in ${roomName}`,
        `Glazed ceramic wall tiles (dado) up to ${dadoHeight}m height in ${roomName}`,
        "room-assembly",
        roomName
      )
    );
  }

  // 4. False Ceiling
  if (active.falseCeiling) {
    items.push(
      makeDSRItem(
        "INT-FC-GYP",
        areaM2,
        `Suspended gypsum false ceiling with GI framing in ${roomName}`,
        `12.5mm Gypsum false ceiling on GI suspension grid in ${roomName}`,
        "room-assembly",
        roomName
      )
    );
  }

  // 5. Ceiling Putty & Paint
  if (active.paint) {
    items.push(
      makeDSRItem(
        "13.41.1",
        areaM2,
        `2-coat acrylic washable emulsion on ceiling in ${roomName}`,
        `Acrylic emulsion ceiling paint (2 coats) over primer in ${roomName}`,
        "room-assembly",
        roomName
      )
    );
  }

  // 6. Plinth Sand Bedding (100mm)
  if (active.plinthSand) {
    const sandVol = areaM2 * 0.10;
    items.push(
      makeDSRItem(
        "2.25",
        sandVol,
        `100mm compacted sand bedding under floor in ${roomName}`,
        `Sand filling under plinth floor bed (100mm thick) in ${roomName}`,
        "room-assembly",
        roomName
      )
    );
  }

  // 7. Sub-base PCC Bed (50mm 1:2:4)
  if (active.pccBed) {
    const pccVol = areaM2 * 0.05;
    items.push(
      makeDSRItem(
        "4.1.3",
        pccVol,
        `50mm PCC 1:2:4 floor sub-base in ${roomName}`,
        `PCC 1:2:4 leveling bed (50mm thick) under tiles in ${roomName}`,
        "room-assembly",
        roomName
      )
    );
  }

  return items;
}

/**
 * Calculates all 6 trades for a single wall line without redundant tracing.
 */
export function calcWallMultiTradeBOQ(
  lengthM: number,
  wallThkMm: number = 230,
  heightM: number = 3.0,
  isExternal: boolean = true,
  wallName: string = "Wall"
): BOQLineItem[] {
  const items: BOQLineItem[] = [];
  if (lengthM <= 0) return items;

  const thkM = wallThkMm / 1000;
  const trenchW = thkM + 0.30;
  const foundDepth = 0.85;

  // 1. Excavation Trench
  items.push(
    makeDSRItem(
      "2.8.1",
      lengthM * trenchW * foundDepth,
      `Foundation trench excavation for ${wallName}`,
      `Earthwork in excavation for ${wallName} (${lengthM.toFixed(1)}m × ${trenchW.toFixed(2)}m × ${foundDepth}m)`,
      "wall-assembly",
      wallName
    )
  );

  // 2. Foundation PCC Bed (100mm)
  items.push(
    makeDSRItem(
      "4.1.8",
      lengthM * trenchW * 0.10,
      `PCC 1:4:8 M10 bed under ${wallName}`,
      `PCC 1:4:8 foundation bed (100mm) under ${wallName}`,
      "wall-assembly",
      wallName
    )
  );

  // 3. Foundation Stepped Masonry
  items.push(
    makeDSRItem(
      "6.1.2",
      lengthM * thkM * 0.60,
      `Brickwork in foundation & plinth for ${wallName}`,
      `Brick masonry in foundation & plinth in CM 1:6 for ${wallName}`,
      "wall-assembly",
      wallName
    )
  );

  // 4. Damp Proof Course (DPC 50mm)
  items.push(
    makeDSRItem(
      "4.10",
      lengthM * thkM,
      `50mm DPC with waterproofing under ${wallName}`,
      `50mm Damp Proof Course (DPC) in concrete 1:2:4 with waterproofing under ${wallName}`,
      "wall-assembly",
      wallName
    )
  );

  // 5. Superstructure Brickwork
  items.push(
    makeDSRItem(
      "6.4.2",
      lengthM * thkM * heightM,
      `Superstructure brickwork for ${wallName}`,
      `Brickwork 230mm in superstructure in CM 1:6 for ${wallName} (${heightM}m height)`,
      "wall-assembly",
      wallName
    )
  );

  // 6. Plastering (Internal & External)
  items.push(
    makeDSRItem(
      "13.1.2",
      lengthM * heightM,
      `12mm internal plaster (1:6) for ${wallName}`,
      `12mm internal cement plaster (1:6) for ${wallName}`,
      "wall-assembly",
      wallName
    )
  );

  if (isExternal) {
    items.push(
      makeDSRItem(
        "13.5.2",
        lengthM * heightM,
        `18mm external sand-face plaster (1:6) for ${wallName}`,
        `18mm external sand-face waterproof plaster for ${wallName}`,
        "wall-assembly",
        wallName
      )
    );
  }

  return items;
}

export interface HighLevelTradeBreakdown {
  structure: { amount: number; percentage: number; label: string; icon: string };
  finishes: { amount: number; percentage: number; label: string; icon: string };
  openings: { amount: number; percentage: number; label: string; icon: string };
  mep: { amount: number; percentage: number; label: string; icon: string };
  total: number;
  costPerSqFt: number;
  costPerSqM: number;
}

export function calculateHighLevelTradeBreakdown(
  items: BOQLineItem[],
  totalAreaSqFt: number = 1200
): HighLevelTradeBreakdown {
  let structAmt = 0;
  let finishAmt = 0;
  let openAmt = 0;
  let mepAmt = 0;

  items.forEach((item) => {
    const st = item.stage || "superstructure";
    if (st === "earthwork" || st === "substructure" || st === "superstructure" || st === "rcc" || st === "external") {
      structAmt += item.amount;
    } else if (st === "plaster" || st === "flooring" || st === "painting" || st === "finishes") {
      finishAmt += item.amount;
    } else if (st === "doors_windows") {
      openAmt += item.amount;
    } else if (st === "mep") {
      mepAmt += item.amount;
    } else {
      structAmt += item.amount;
    }
  });

  const grandTotal = structAmt + finishAmt + openAmt + mepAmt;
  const safeTotal = grandTotal > 0 ? grandTotal : 1;
  const safeSqFt = totalAreaSqFt > 0 ? totalAreaSqFt : 1;
  const totalAreaSqM = safeSqFt * 0.0929;

  return {
    structure: {
      amount: Math.round(structAmt),
      percentage: Math.round((structAmt / safeTotal) * 100),
      label: "Structure & Masonry",
      icon: "🏗️",
    },
    finishes: {
      amount: Math.round(finishAmt),
      percentage: Math.round((finishAmt / safeTotal) * 100),
      label: "Finishes & Flooring",
      icon: "🪵",
    },
    openings: {
      amount: Math.round(openAmt),
      percentage: Math.round((openAmt / safeTotal) * 100),
      label: "Doors & Windows",
      icon: "🚪",
    },
    mep: {
      amount: Math.round(mepAmt),
      percentage: Math.round((mepAmt / safeTotal) * 100),
      label: "Plumbing & MEP",
      icon: "⚡",
    },
    total: Math.round(grandTotal),
    costPerSqFt: Math.round(grandTotal / safeSqFt),
    costPerSqM: Math.round(grandTotal / (totalAreaSqM > 0 ? totalAreaSqM : 1)),
  };
}
