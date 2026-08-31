import type { BOQResult, BOQLineItem } from '@/domains/boq/types';
import type { TurnkeyRoom } from '@/store/turnkey-store';

// ─── Stage names that are structural vs finish ─────────────────────────────────

const STRUCTURAL_STAGES = new Set(['earthwork', 'substructure', 'superstructure', 'rcc', 'external', 'mep']);
const FINISH_STAGES     = new Set(['flooring', 'plaster', 'painting', 'doors_windows', 'finishes']);

// ─── MergedBOQResult ─────────────────────────────────────────────────────────

export interface MergedBOQResult {
  shellItems: BOQLineItem[];
  roomItems: BOQLineItem[];
  allItems: BOQLineItem[];
  shellTotal: number;
  roomTotal: number;
  grandTotal: number;
  buaM2: number;
}

/**
 * mergeShellAndRooms
 * ──────────────────
 * Merges a structural shell BOQ (from Stage 2) with exact room finishes
 * (from Stage 3 traced polygons).
 *
 * Merge rule:
 *   - Keep ALL structural/MEP line items from the shell (earthwork, foundation, RCC, etc.)
 *   - STRIP all generic finishes/flooring/painting items from the shell
 *   - REPLACE them with exact room-tagged items from traced polygons
 *   - If no rooms were traced, fall back to the original shell finishes items
 *
 * @param shellResult  - BOQResult from calculateCompositeBOQ() in Stage 2
 * @param rooms        - TurnkeyRoom[] from traced polygons in Stage 3
 * @param buaM2        - Total built-up area in m²
 */
export function mergeShellAndRooms(
  shellResult: BOQResult,
  rooms: TurnkeyRoom[],
  buaM2: number,
): MergedBOQResult {
  const hasRooms = rooms.length > 0;

  // 1. Split shell line items into structural vs finishes
  const shellStructural = shellResult.line_items.filter(
    (item) => STRUCTURAL_STAGES.has(item.stage)
  );
  const shellFinishes = shellResult.line_items.filter(
    (item) => FINISH_STAGES.has(item.stage)
  );

  // 2. If rooms were traced, use room items; otherwise keep shell finishes as fallback
  const roomItems: BOQLineItem[] = hasRooms
    ? rooms.flatMap((room) =>
        room.boqItems.map((item) => ({
          ...item,
          trace_source: 'room' as const,
          room_name: room.name,
          room_id: room.id,
          source_module: 'room-assembly',
          source_module_name: room.name,
        }))
      )
    : shellFinishes.map((item) => ({
        ...item,
        trace_source: 'shell' as const,
      }));

  // 3. Tag all shell structural items
  const taggedShellItems = shellStructural.map((item) => ({
    ...item,
    trace_source: 'shell' as const,
  }));

  // 4. Combine
  const allItems = [...taggedShellItems, ...roomItems];

  // 5. Totals
  const shellTotal = round2(taggedShellItems.reduce((s, i) => s + i.amount, 0));
  const roomTotal  = round2(roomItems.reduce((s, i) => s + i.amount, 0));
  const grandTotal = round2(shellTotal + roomTotal);

  return {
    shellItems: taggedShellItems,
    roomItems,
    allItems,
    shellTotal,
    roomTotal,
    grandTotal,
    buaM2,
  };
}

/**
 * groupMergedByStage
 * ──────────────────
 * Groups the merged allItems array by construction stage for the
 * "Engineer / Tender View" tab in Stage 4.
 */
export function groupMergedByStage(
  merged: MergedBOQResult,
): Record<string, BOQLineItem[]> {
  const ORDER = [
    'earthwork', 'substructure', 'rcc', 'superstructure', 'external',
    'plaster', 'flooring', 'painting', 'finishes', 'doors_windows', 'mep',
  ];
  const grouped: Record<string, BOQLineItem[]> = {};
  for (const stage of ORDER) grouped[stage] = [];

  for (const item of merged.allItems) {
    const stage = item.stage || 'superstructure';
    if (!grouped[stage]) grouped[stage] = [];
    grouped[stage].push(item);
  }

  // Remove empty stages
  for (const key of Object.keys(grouped)) {
    if (grouped[key].length === 0) delete grouped[key];
  }
  return grouped;
}

/**
 * groupMergedByRoom
 * ─────────────────
 * Groups the merged allItems by room_name for the "Client / Space View" tab.
 * Shell structural items are grouped under a synthetic "Civil Structure" bucket.
 */
export function groupMergedByRoom(
  merged: MergedBOQResult,
): Record<string, { label: string; icon: string; items: BOQLineItem[]; total: number }> {
  const groups: Record<string, { label: string; icon: string; items: BOQLineItem[]; total: number }> = {};

  for (const item of merged.allItems) {
    const key   = item.trace_source === 'shell' ? '__shell__' : (item.room_id || '__shell__');
    const label = item.trace_source === 'shell' ? 'Civil Structure & MEP' : (item.room_name || 'Other');
    const icon  = item.trace_source === 'shell' ? '🏗️' : '🏠';

    if (!groups[key]) groups[key] = { label, icon, items: [], total: 0 };
    groups[key].items.push(item);
    groups[key].total = round2(groups[key].total + item.amount);
  }
  return groups;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
