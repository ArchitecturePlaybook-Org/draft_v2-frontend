// Advanced Spatial OCR Engine for Scale Calibration
import Tesseract from 'tesseract.js';
import { DetectedWall, Point } from './wallDetection';

export interface CalibrationResult {
  pixelsPerUnit: number | null;
  detectedText: string;
  bestWallIndex: number | null;
  estimatedLength: number | null;
}

// Helper: Distance from point to line segment
function distanceToLine(p: Point, start: Point, end: Point) {
  const l2 = Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2);
  if (l2 === 0) return Math.sqrt(Math.pow(p.x - start.x, 2) + Math.pow(p.y - start.y, 2));
  let t = ((p.x - start.x) * (end.x - start.x) + (p.y - start.y) * (end.y - start.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projection = { x: start.x + t * (end.x - start.x), y: start.y + t * (end.y - start.y) };
  return Math.sqrt(Math.pow(p.x - projection.x, 2) + Math.pow(p.y - projection.y, 2));
}

export async function detectScaleFromImage(
  imageSrc: string,
  unitSystem: 'metric' | 'imperial',
  detectedWalls: DetectedWall[]
): Promise<CalibrationResult> {
  try {
    const result = await Tesseract.recognize(imageSrc, 'eng', {
      logger: m => console.log(m)
    });

    const words = result.data.words || [];
    let potentialScales: { scale: number, wallIdx: number, physicalLength: number }[] = [];

    // Regex for dimensions
    const imperialRegex = /(?:(\d+)\s*[']|ft)?\s*(?:(\d+(?:\.\d+)?)\s*["]|in)?/;
    const metricRegex = /(\d+(?:\.\d+)?)\s*(m|mm|cm)/;

    for (const word of words) {
      let physicalLength = null;
      
      if (unitSystem === 'imperial') {
        const matches = word.text.match(imperialRegex);
        if (matches && (matches[1] || matches[2])) {
          const feet = parseFloat(matches[1] || '0');
          const inches = parseFloat(matches[2] || '0');
          if (feet > 0 || inches > 0) {
            physicalLength = feet + (inches / 12);
          }
        }
      } else {
        const matches = word.text.match(metricRegex);
        if (matches) {
          const val = parseFloat(matches[1]);
          const unit = matches[2];
          if (unit === 'm') physicalLength = val;
          else if (unit === 'cm') physicalLength = val / 100;
          else if (unit === 'mm') physicalLength = val / 1000;
        }
      }

      if (physicalLength && physicalLength > 0) {
        // Find center of bounding box
        const bbox = word.bbox;
        const cx = (bbox.x0 + bbox.x1) / 2;
        const cy = (bbox.y0 + bbox.y1) / 2;
        const center = { x: cx, y: cy };

        // Find nearest wall
        let nearestWallIdx = -1;
        let minDistance = Infinity;

        detectedWalls.forEach((w, idx) => {
          const dist = distanceToLine(center, w.start, w.end);
          if (dist < minDistance) {
            minDistance = dist;
            nearestWallIdx = idx;
          }
        });

        // Threshold: Text must be within 100 pixels of the wall
        if (minDistance < 100 && nearestWallIdx !== -1) {
          const w = detectedWalls[nearestWallIdx];
          const scale = w.lengthPixels / physicalLength;
          potentialScales.push({ scale, wallIdx: nearestWallIdx, physicalLength });
        }
      }
    }

    if (potentialScales.length === 0) {
      return { pixelsPerUnit: null, detectedText: result.data.text, bestWallIndex: null, estimatedLength: null };
    }

    // Sort by scale to find median
    potentialScales.sort((a, b) => a.scale - b.scale);
    const medianMatch = potentialScales[Math.floor(potentialScales.length / 2)];

    return {
      pixelsPerUnit: medianMatch.scale,
      detectedText: result.data.text,
      bestWallIndex: medianMatch.wallIdx,
      estimatedLength: medianMatch.physicalLength
    };

  } catch (err) {
    console.error("OCR Spatial Scale Detection Failed:", err);
    return { pixelsPerUnit: null, detectedText: '', bestWallIndex: null, estimatedLength: null };
  }
}
