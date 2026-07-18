// Utility for OpenCV wall detection logic
// We must dynamically load OpenCV in Next.js because it's a heavy WASM bundle

export interface Point {
  x: number;
  y: number;
}

export interface DetectedWall {
  id: string;
  start: Point;
  end: Point;
  lengthPixels: number;
  thicknessPixels?: number;
}

// Merges collinear and overlapping lines to prevent double-drawing thick walls
function mergeLines(lines: DetectedWall[], distanceThreshold = 25, angleThreshold = 0.15): DetectedWall[] {
  const getAngle = (l: DetectedWall) => Math.atan2(l.end.y - l.start.y, l.end.x - l.start.x);
  
  const areLinesCollinear = (l1: DetectedWall, l2: DetectedWall) => {
    let a1 = getAngle(l1);
    let a2 = getAngle(l2);
    if (a1 < 0) a1 += Math.PI;
    if (a2 < 0) a2 += Math.PI;
    
    let angleDiff = Math.abs(a1 - a2);
    if (angleDiff > Math.PI / 2) angleDiff = Math.PI - angleDiff;
    if (angleDiff > angleThreshold) return false;
    
    // Perpendicular distance
    const cx = (l2.start.x + l2.end.x) / 2;
    const cy = (l2.start.y + l2.end.y) / 2;
    const len = l1.lengthPixels;
    if (len === 0) return false;
    const numerator = Math.abs((l1.end.y - l1.start.y) * cx - (l1.end.x - l1.start.x) * cy + l1.end.x * l1.start.y - l1.end.y * l1.start.x);
    const distance = numerator / len;
    
    return distance < distanceThreshold;
  };

  const mergeTwoLines = (l1: DetectedWall, l2: DetectedWall): DetectedWall => {
    const cx = (l1.start.x + l1.end.x + l2.start.x + l2.end.x) / 4;
    const cy = (l1.start.y + l1.end.y + l2.start.y + l2.end.y) / 4;
    
    let a1 = getAngle(l1);
    let a2 = getAngle(l2);
    if (a1 < 0) a1 += Math.PI;
    if (a2 < 0) a2 += Math.PI;
    if (Math.abs(a1 - a2) > Math.PI / 2) {
       if (a1 < a2) a1 += Math.PI;
       else a2 += Math.PI;
    }
    
    const avgAngle = (a1 + a2) / 2;
    const dx = Math.cos(avgAngle);
    const dy = Math.sin(avgAngle);
    
    const pts = [l1.start, l1.end, l2.start, l2.end];
    let minT = Infinity;
    let maxT = -Infinity;
    
    for (const p of pts) {
      const vx = p.x - cx;
      const vy = p.y - cy;
      const t = vx * dx + vy * dy;
      if (t < minT) minT = t;
      if (t > maxT) maxT = t;
    }
    
    return { 
      id: l1.id, 
      start: { x: cx + minT * dx, y: cy + minT * dy }, 
      end: { x: cx + maxT * dx, y: cy + maxT * dy }, 
      lengthPixels: maxT - minT 
    };
  };

  let currentLines = [...lines];
  let changed = true;
  while (changed) {
    changed = false;
    const nextLines: DetectedWall[] = [];
    const used = new Set<number>();
    for (let i = 0; i < currentLines.length; i++) {
      if (used.has(i)) continue;
      let lineGroup = currentLines[i];
      used.add(i);
      for (let j = i + 1; j < currentLines.length; j++) {
        if (used.has(j)) continue;
        if (areLinesCollinear(lineGroup, currentLines[j])) {
          lineGroup = mergeTwoLines(lineGroup, currentLines[j]);
          used.add(j);
          changed = true;
        }
      }
      nextLines.push(lineGroup);
    }
    currentLines = nextLines;
  }
  return currentLines;
}

export async function detectWallsFromCanvas(canvasElement: HTMLCanvasElement): Promise<DetectedWall[]> {
  const cv = (window as any).cv;
  if (!cv) throw new Error("OpenCV is not loaded yet.");

  const src = cv.imread(canvasElement);
  const dst = new cv.Mat();
  const edges = new cv.Mat();
  const lines = new cv.Mat();

  try {
    cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY, 0);
    cv.threshold(dst, dst, 200, 255, cv.THRESH_BINARY_INV);

    // Use a larger 5x5 kernel to completely erase thin dimension lines and text noise
    const M = cv.Mat.ones(5, 5, cv.CV_8U);
    cv.morphologyEx(dst, dst, cv.MORPH_OPEN, M);
    M.delete();

    cv.Canny(dst, edges, 50, 150, 3);

    // Increase thresholds to only find significant straight lines
    cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 80, 60, 20);

    const walls: DetectedWall[] = [];
    for (let i = 0; i < lines.rows; i++) {
      const x1 = lines.data32S[i * 4];
      const y1 = lines.data32S[i * 4 + 1];
      const x2 = lines.data32S[i * 4 + 2];
      const y2 = lines.data32S[i * 4 + 3];
      const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      walls.push({
        id: `wall_${i}_${Date.now()}`,
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        lengthPixels: length
      });
    }

    // Cluster and merge double lines/broken segments
    const mergedWalls = mergeLines(walls, 25, 0.15);
    
    // Extract structural thickness by firing a perpendicular ray across the binary mask
    for (const w of mergedWalls) {
       const dx = w.end.x - w.start.x;
       const dy = w.end.y - w.start.y;
       const len = w.lengthPixels;
       if (len === 0) {
          w.thicknessPixels = 0;
          continue;
       }
       
       const nx = -dy / len;
       const ny = dx / len;
       
       const cx = (w.start.x + w.end.x) / 2;
       const cy = (w.start.y + w.end.y) / 2;
       
       let t1 = 0;
       while (true) {
          const px = Math.round(cx + nx * t1);
          const py = Math.round(cy + ny * t1);
          if (px < 0 || px >= dst.cols || py < 0 || py >= dst.rows) break;
          if (dst.ucharPtr(py, px)[0] === 0) break; // Reached black background
          t1++;
          if (t1 > 100) break; // Max 100px thickness safeguard
       }
       
       let t2 = 0;
       while (true) {
          const px = Math.round(cx - nx * t2);
          const py = Math.round(cy - ny * t2);
          if (px < 0 || px >= dst.cols || py < 0 || py >= dst.rows) break;
          if (dst.ucharPtr(py, px)[0] === 0) break; // Reached black background
          t2++;
          if (t2 > 100) break; // Max 100px thickness safeguard
       }
       
       // t1 + t2 represents total pixel thickness traversed
       w.thicknessPixels = t1 + t2;
    }
    
    // Filter out tiny artifacts that survived
    return mergedWalls.filter(w => w.lengthPixels > 60);

  } finally {
    src.delete();
    dst.delete();
    edges.delete();
    lines.delete();
  }
}

export interface DetectedRoom {
  id: string;
  polygon: Point[];
  areaPixels: number;
  center: Point;
}

export function detectRoomsFromWalls(walls: DetectedWall[], width: number, height: number): DetectedRoom[] {
  const cv = (window as any).cv;
  if (!cv) throw new Error("OpenCV is not loaded yet.");

  const mat = cv.Mat.zeros(height, width, cv.CV_8UC1);
  
  // Draw walls as thick white lines to ensure they connect at corners
  for (const w of walls) {
    cv.line(mat, new cv.Point(w.start.x, w.start.y), new cv.Point(w.end.x, w.end.y), new cv.Scalar(255), 20);
  }

  // Heavily dilate to close gaps like small doors
  const M = cv.Mat.ones(15, 15, cv.CV_8U);
  cv.dilate(mat, mat, M);
  M.delete();

  // DO NOT INVERT the image. 
  // Background is 0 (black), walls are 255 (white).
  // findContours will find the white wall network as top-level contours,
  // and the empty enclosed rooms as internal hole contours!

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(mat, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

  const rooms: DetectedRoom[] = [];
  
  for (let i = 0; i < contours.size(); ++i) {
    // hierarchy data is [next, previous, first_child, parent]
    const parentIdx = hierarchy.data32S[i * 4 + 3];
    
    // If parentIdx !== -1, this contour is a hole inside a white object.
    // In our case, a hole inside the white wall network IS a room!
    if (parentIdx !== -1) {
      const cnt = contours.get(i);
      const area = cv.contourArea(cnt);
      
      // Filter out tiny noise holes
      if (area > 5000 && area < (width * height * 0.9)) {
         const poly = new cv.Mat();
         // Simplify the polygon
         cv.approxPolyDP(cnt, poly, 10, true);
         
         const points: Point[] = [];
         for (let j = 0; j < poly.rows; j++) {
           points.push({
             x: poly.data32S[j * 2],
             y: poly.data32S[j * 2 + 1]
           });
         }

         const moments = cv.moments(cnt);
         const cx = moments.m10 / (moments.m00 || 1);
         const cy = moments.m01 / (moments.m00 || 1);

         rooms.push({
           id: `room_${i}_${Date.now()}`,
           polygon: points,
           areaPixels: area,
           center: { x: cx, y: cy }
         });
         
         poly.delete();
      }
      cnt.delete();
    }
  }

  mat.delete();
  contours.delete();
  hierarchy.delete();

  return rooms;
}
