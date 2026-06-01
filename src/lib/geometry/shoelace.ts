export interface Point {
  x: number;
  y: number;
}

/**
 * Calculates the internal square area of a polygon using the Shoelace Formula.
 * @param points Array of Point objects representing the vertices of the polygon in order
 * @param pixelsPerUnit The global scale (e.g., 50 pixels = 1 foot/meter)
 * @returns The physical area in square units
 */
export function calculateShoelaceArea(points: Point[], pixelsPerUnit: number): number {
  if (points.length < 3) return 0;
  if (pixelsPerUnit <= 0) return 0;

  let area = 0;
  let j = points.length - 1;

  for (let i = 0; i < points.length; i++) {
    area += (points[j].x + points[i].x) * (points[j].y - points[i].y);
    j = i;
  }

  // Raw area in pixels squared
  const rawPixelArea = Math.abs(area / 2);

  // Convert pixel area to real-world area using scale squared
  const scaleSquared = pixelsPerUnit * pixelsPerUnit;
  const physicalArea = rawPixelArea / scaleSquared;

  return physicalArea;
}
