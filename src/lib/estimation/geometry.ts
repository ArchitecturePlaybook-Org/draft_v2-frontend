import { Point, MeasuredShape } from '@/components/estimation/SimpleSvgLayer';

/**
 * Calculates the Euclidean distance in pixels between two points
 */
export function distanceBetween(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates the angle in degrees (0 - 360) from p1 to p2
 */
export function calculateAngleDegrees(from: Point, to: Point): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return Math.round(deg * 10) / 10;
}

/**
 * Snaps a target point to the nearest orthogonal axis (0, 90, 180, 270 degrees)
 * or 45-degree diagonal relative to the origin point.
 */
export function snapToOrtho(from: Point, to: Point, allowDiagonals = false): { point: Point; angle: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 1) {
    return { point: to, angle: 0 };
  }

  // Angle in radians (-PI to +PI)
  const angleRad = Math.atan2(dy, dx);
  let angleDeg = (angleRad * 180) / Math.PI;
  if (angleDeg < 0) angleDeg += 360;

  let snappedAngleDeg = 0;

  if (allowDiagonals) {
    // Snap to nearest 45 degree increment
    snappedAngleDeg = Math.round(angleDeg / 45) * 45;
  } else {
    // Snap strictly to cardinal axes (0, 90, 180, 270)
    snappedAngleDeg = Math.round(angleDeg / 90) * 90;
  }

  if (snappedAngleDeg === 360) snappedAngleDeg = 0;

  const snappedRad = (snappedAngleDeg * Math.PI) / 180;
  const snappedX = Math.round(from.x + dist * Math.cos(snappedRad));
  const snappedY = Math.round(from.y + dist * Math.sin(snappedRad));

  return {
    point: { x: snappedX, y: snappedY },
    angle: snappedAngleDeg
  };
}

/**
 * Scans all existing shape points (and prior points in current shape) to find
 * the nearest vertex within the threshold distance.
 */
export function findSnapPoint(
  cursor: Point,
  existingShapes: MeasuredShape[],
  currentPoints: Point[] = [],
  thresholdPx = 14
): { snapPoint: Point; targetShapeId?: string; pointIndex?: number } | null {
  let closestDist = thresholdPx;
  let bestMatch: { snapPoint: Point; targetShapeId?: string; pointIndex?: number } | null = null;

  // 1. Check existing shapes
  for (const shape of existingShapes) {
    for (let i = 0; i < shape.points.length; i++) {
      const pt = shape.points[i];
      const d = distanceBetween(cursor, pt);
      if (d < closestDist) {
        closestDist = d;
        bestMatch = { snapPoint: pt, targetShapeId: shape.id, pointIndex: i };
      }
    }
  }

  // 2. Check current active drawing points (except the very last one we just placed)
  if (currentPoints.length > 1) {
    for (let i = 0; i < currentPoints.length - 1; i++) {
      const pt = currentPoints[i];
      const d = distanceBetween(cursor, pt);
      if (d < closestDist) {
        closestDist = d;
        bestMatch = { snapPoint: pt, pointIndex: i };
      }
    }
  }

  return bestMatch;
}

/**
 * Creates 4 bounding points for a rectangle from 2 diagonal corners.
 * Returns in clockwise order: Top-Left, Top-Right, Bottom-Right, Bottom-Left
 */
export function createRectanglePoints(p1: Point, p2: Point): Point[] {
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);

  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY }
  ];
}

/**
 * Calculates polyline length in meters given pixel points and scale
 */
export function calculatePolylineLength(points: Point[], scaleMetersPerPixel: number): number {
  if (points.length < 2) return 0;
  let totalPx = 0;
  for (let i = 1; i < points.length; i++) {
    totalPx += distanceBetween(points[i - 1], points[i]);
  }
  return totalPx * scaleMetersPerPixel;
}

/**
 * Calculates polygon area in square meters using Shoelace formula
 */
export function calculatePolygonArea(points: Point[], scaleMetersPerPixel: number): number {
  if (points.length < 3) return 0;
  let areaVal = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    areaVal += points[i].x * points[j].y;
    areaVal -= points[j].x * points[i].y;
  }
  const pxArea = Math.abs(areaVal / 2);
  return pxArea * (scaleMetersPerPixel * scaleMetersPerPixel);
}
