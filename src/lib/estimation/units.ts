/**
 * Architectural Measurement & Scale Units Library
 * Supports Metric (m, mm, cm) and Imperial (ft, in, yd) units,
 * including architectural string parsing (e.g. 10' 6", 3000mm, 120").
 */

export type CalibrationUnit = 'm' | 'mm' | 'cm' | 'ft' | 'in' | 'yd';

export interface UnitInfo {
  unit: CalibrationUnit;
  label: string;
  shortLabel: string;
  symbol: string;
  system: 'metric' | 'imperial';
  toMeters: number;    // multiply unit value by this to get meters
  fromMeters: number;  // multiply meters by this to get unit value
  defaultPrecision: number;
}

export const CALIBRATION_UNITS: Record<CalibrationUnit, UnitInfo> = {
  m: {
    unit: 'm',
    label: 'Meters (m)',
    shortLabel: 'Meters',
    symbol: 'm',
    system: 'metric',
    toMeters: 1.0,
    fromMeters: 1.0,
    defaultPrecision: 4,
  },
  mm: {
    unit: 'mm',
    label: 'Millimeters (mm)',
    shortLabel: 'Millimeters',
    symbol: 'mm',
    system: 'metric',
    toMeters: 0.001,
    fromMeters: 1000.0,
    defaultPrecision: 1,
  },
  cm: {
    unit: 'cm',
    label: 'Centimeters (cm)',
    shortLabel: 'Centimeters',
    symbol: 'cm',
    system: 'metric',
    toMeters: 0.01,
    fromMeters: 100.0,
    defaultPrecision: 2,
  },
  ft: {
    unit: 'ft',
    label: 'Feet (ft)',
    shortLabel: 'Feet',
    symbol: 'ft',
    system: 'imperial',
    toMeters: 0.3048,
    fromMeters: 1 / 0.3048,
    defaultPrecision: 4,
  },
  in: {
    unit: 'in',
    label: 'Inches (in)',
    shortLabel: 'Inches',
    symbol: 'in',
    system: 'imperial',
    toMeters: 0.0254,
    fromMeters: 1 / 0.0254,
    defaultPrecision: 2,
  },
  yd: {
    unit: 'yd',
    label: 'Yards (yd)',
    shortLabel: 'Yards',
    symbol: 'yd',
    system: 'imperial',
    toMeters: 0.9144,
    fromMeters: 1 / 0.9144,
    defaultPrecision: 4,
  },
};

export const UNIT_LIST: UnitInfo[] = Object.values(CALIBRATION_UNITS);

export interface CalibrationPreset {
  label: string;
  value: number;
  unit: CalibrationUnit;
  category: 'metric' | 'imperial';
  note?: string;
}

export const COMMON_CALIBRATION_PRESETS: CalibrationPreset[] = [
  // Metric Presets
  { label: '900 mm', value: 900, unit: 'mm', category: 'metric', note: 'Standard Door' },
  { label: '1000 mm', value: 1000, unit: 'mm', category: 'metric', note: '1 Meter Grid' },
  { label: '1.2 m', value: 1.2, unit: 'm', category: 'metric', note: 'Corridor' },
  { label: '2.4 m', value: 2.4, unit: 'm', category: 'metric', note: 'Ceiling Ht' },
  { label: '3.0 m', value: 3.0, unit: 'm', category: 'metric', note: '3m Room Span' },
  { label: '5.0 m', value: 5.0, unit: 'm', category: 'metric', note: 'Bay Span' },

  // Imperial Presets
  { label: '3 ft', value: 3, unit: 'ft', category: 'imperial', note: '36" Door' },
  { label: '8 ft', value: 8, unit: 'ft', category: 'imperial', note: '8\' Ceiling' },
  { label: '10 ft', value: 10, unit: 'ft', category: 'imperial', note: '10\' Bay' },
  { label: '12 ft', value: 12, unit: 'ft', category: 'imperial', note: '12\' Room' },
  { label: '20 ft', value: 20, unit: 'ft', category: 'imperial', note: '20\' Span' },
  { label: '50 ft', value: 50, unit: 'ft', category: 'imperial', note: 'Lot Dimension' },
];

/**
 * Convert value from meters to a target unit.
 */
export function metersToUnit(meters: number, unit: CalibrationUnit): number {
  const info = CALIBRATION_UNITS[unit] || CALIBRATION_UNITS.m;
  return meters * info.fromMeters;
}

/**
 * Convert value from a source unit to meters.
 */
export function unitToMeters(value: number, unit: CalibrationUnit): number {
  const info = CALIBRATION_UNITS[unit] || CALIBRATION_UNITS.m;
  return value * info.toMeters;
}

/**
 * Convert a value directly between two units.
 */
export function convertUnits(value: number, from: CalibrationUnit, to: CalibrationUnit): number {
  const meters = unitToMeters(value, from);
  return metersToUnit(meters, to);
}

/**
 * Format a scale value (in meters per pixel) to the target unit.
 */
export function formatScaleValue(metersPerPixel: number, unit: CalibrationUnit): string {
  const info = CALIBRATION_UNITS[unit] || CALIBRATION_UNITS.m;
  const inUnit = metersPerPixel * info.fromMeters;
  
  if (unit === 'mm') {
    return inUnit >= 100 ? inUnit.toFixed(1) : inUnit.toFixed(2);
  }
  if (unit === 'cm') {
    return inUnit.toFixed(2);
  }
  if (unit === 'in') {
    return inUnit.toFixed(2);
  }
  if (unit === 'ft' || unit === 'yd' || unit === 'm') {
    return inUnit.toFixed(4);
  }
  return inUnit.toFixed(info.defaultPrecision);
}

/**
 * Get multi-unit secondary scale representation for clarity.
 */
export function getSecondaryScaleEquivalents(metersPerPixel: number, currentUnit: CalibrationUnit): string {
  const isMetric = CALIBRATION_UNITS[currentUnit]?.system === 'metric';
  
  if (isMetric) {
    const ft = formatScaleValue(metersPerPixel, 'ft');
    const inch = formatScaleValue(metersPerPixel, 'in');
    const mm = formatScaleValue(metersPerPixel, 'mm');
    if (currentUnit === 'm') {
      return `${ft} ft · ${inch} in (${mm} mm)`;
    }
    return `${formatScaleValue(metersPerPixel, 'm')} m · ${ft} ft`;
  } else {
    const m = formatScaleValue(metersPerPixel, 'm');
    const mm = formatScaleValue(metersPerPixel, 'mm');
    const ft = formatScaleValue(metersPerPixel, 'ft');
    if (currentUnit === 'ft') {
      return `${m} m · ${mm} mm · ${formatScaleValue(metersPerPixel, 'in')} in`;
    }
    return `${m} m · ${ft} ft`;
  }
}

/**
 * Parses fractional strings like "1/2", "3/4", "1 1/2" into a float.
 */
function parseFraction(str: string): number {
  const parts = str.trim().split(/\s+/);
  if (parts.length === 2) {
    const whole = parseFloat(parts[0]) || 0;
    const fracParts = parts[1].split('/');
    if (fracParts.length === 2) {
      const num = parseFloat(fracParts[0]) || 0;
      const den = parseFloat(fracParts[1]) || 1;
      return whole + (den !== 0 ? num / den : 0);
    }
    return whole;
  }
  if (parts.length === 1 && parts[0].includes('/')) {
    const fracParts = parts[0].split('/');
    if (fracParts.length === 2) {
      const num = parseFloat(fracParts[0]) || 0;
      const den = parseFloat(fracParts[1]) || 1;
      return den !== 0 ? num / den : 0;
    }
  }
  return parseFloat(str) || 0;
}

export interface ParsedDimensionResult {
  meters: number;
  detectedUnit: CalibrationUnit;
  unitValue: number;
  displayText: string;
}

/**
 * Intelligent architectural dimension parser.
 * Handles inputs like:
 * - "10" (with fallbackUnit)
 * - "10' 6"" or "10'6"" or "10-6" or "10ft 6in"
 * - "3000mm" or "3000 mm"
 * - "3.5m" or "3.5 m"
 * - "120in" or "120"" or "120 in"
 * - "150cm" or "150 cm"
 * - "10 yd" or "10yd"
 */
export function parseArchitecturalDimension(
  input: string,
  fallbackUnit: CalibrationUnit = 'm'
): ParsedDimensionResult | null {
  if (!input || typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw) return null;

  // 1. Check for Feet & Inches pattern: e.g. 10' 6", 10'6", 10'-6", 10' 6 1/2", 10ft 6in
  const feetInchesMatch = raw.match(
    /^(\d+(?:\.\d+)?)\s*(?:'|ft|feet|-)\s*(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)?\s*(?:"|in|inch|inches)?$/i
  );
  if (feetInchesMatch) {
    const feet = parseFloat(feetInchesMatch[1]) || 0;
    const inchesRaw = feetInchesMatch[2] ? parseFraction(feetInchesMatch[2]) : 0;
    const totalFeet = feet + (inchesRaw / 12);
    const meters = totalFeet * 0.3048;
    return {
      meters,
      detectedUnit: 'ft',
      unitValue: totalFeet,
      displayText: `${feet}' ${inchesRaw ? inchesRaw + '"' : ''}`.trim(),
    };
  }

  // 2. Check for explicit unit suffix: e.g. "3000mm", "120in", "3.5m", "150cm", "10yd", "15ft"
  const suffixMatch = raw.match(
    /^([0-9]+(?:\.[0-9]+)?|\d+\s+\d+\/\d+|\d+\/\d+)\s*(mm|cm|m|meters?|ft|feet|'|in|inch|inches|"|yd|yards?)$/i
  );
  if (suffixMatch) {
    const num = suffixMatch[1].includes('/') ? parseFraction(suffixMatch[1]) : parseFloat(suffixMatch[1]);
    const unitStr = suffixMatch[2].toLowerCase();
    
    let unit: CalibrationUnit = 'm';
    if (unitStr === 'mm') unit = 'mm';
    else if (unitStr === 'cm') unit = 'cm';
    else if (unitStr === 'm' || unitStr.startsWith('meter')) unit = 'm';
    else if (unitStr === 'ft' || unitStr.startsWith('feet') || unitStr === "'") unit = 'ft';
    else if (unitStr === 'in' || unitStr.startsWith('inch') || unitStr === '"') unit = 'in';
    else if (unitStr === 'yd' || unitStr.startsWith('yard')) unit = 'yd';

    const meters = unitToMeters(num, unit);
    return {
      meters,
      detectedUnit: unit,
      unitValue: num,
      displayText: `${num} ${unit}`,
    };
  }

  // 3. Fallback: Numeric value evaluated using the provided fallbackUnit
  const val = raw.includes('/') ? parseFraction(raw) : parseFloat(raw);
  if (!isNaN(val) && val > 0) {
    const meters = unitToMeters(val, fallbackUnit);
    return {
      meters,
      detectedUnit: fallbackUnit,
      unitValue: val,
      displayText: `${val} ${fallbackUnit}`,
    };
  }

  return null;
}
