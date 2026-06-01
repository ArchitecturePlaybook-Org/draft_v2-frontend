"use client";

import React, { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { ProjectAsset } from "@/types/projects";
import { detectWallsFromCanvas, detectRoomsFromWalls, DetectedWall, DetectedRoom, Point } from "@/lib/cv/wallDetection";
import { detectScaleFromImage } from "@/lib/cv/scaleCalibration";
import { toast } from "sonner";
import { Bot, Maximize2, Loader2, Ruler, CheckCircle2, MousePointer2, Pencil, Eraser, Trash2, Hexagon } from "lucide-react";

interface FloorPlanAnalyzerCanvasProps {
  plan: ProjectAsset;
  unitSystem: "metric" | "imperial";
  onAIDataExtracted: (newRows: any[]) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  existingEstimations: any[];
}

// Helper to calculate area of a simple polygon
function calculatePolygonArea(points: Point[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area / 2);
}

// Helper to calculate centroid of a polygon
function calculatePolygonCentroid(points: Point[]): Point {
  let cx = 0, cy = 0;
  for (let p of points) {
    cx += p.x;
    cy += p.y;
  }
  return { x: cx / points.length, y: cy / points.length };
}

export function FloorPlanAnalyzerCanvas({ 
  plan, 
  unitSystem, 
  onAIDataExtracted,
  isExpanded,
  onToggleExpand,
  existingEstimations
}: FloorPlanAnalyzerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [cvLoaded, setCvLoaded] = useState(false);
  
  // Calibration State
  const [detectedWalls, setDetectedWalls] = useState<DetectedWall[]>([]);
  const [detectedRooms, setDetectedRooms] = useState<DetectedRoom[]>([]);
  const [calibrationWallIndex, setCalibrationWallIndex] = useState<number>(0);
  const [calibrationLength, setCalibrationLength] = useState<string>("");
  const [forceRecalibrate, setForceRecalibrate] = useState(false);

  // Extract existing scale if available
  const existingScale = React.useMemo(() => {
    for (const est of existingEstimations) {
      if (est.trace_data?.lengthPixels && est.length) {
        const len = parseFloat(est.length);
        if (!isNaN(len) && len > 0) {
          return est.trace_data.lengthPixels / len;
        }
      }
    }
    return null;
  }, [existingEstimations]);

  // Editing Modes
  const [toolMode, setToolMode] = useState<'idle' | 'draw' | 'delete' | 'draw-area'>('idle');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingStart, setDrawingStart] = useState<Point | null>(null);
  const [drawingEnd, setDrawingEnd] = useState<Point | null>(null);
  const [drawingAreaPoints, setDrawingAreaPoints] = useState<Point[]>([]);
  
  type ActiveHandle = { type: 'wall', idx: number, node: 'start'|'end' } | { type: 'room', idx: number, vertexIdx: number };
  const [activeHandle, setActiveHandle] = useState<ActiveHandle | null>(null);

  useEffect(() => {
    if (!plan.file) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      bgImageRef.current = img;
      if (canvasRef.current) {
        canvasRef.current.width = img.width;
        canvasRef.current.height = img.height;
        redrawCanvas();
      }
    };
    img.src = plan.file;
  }, [plan.file]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear and draw background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (bgImageRef.current) {
      ctx.drawImage(bgImageRef.current, 0, 0);
    }

    // Draw EXISTING estimations (Permanent traces)
    existingEstimations.forEach((est) => {
      if (est.trace_data) {
        if (est.trace_data.start && est.trace_data.end) {
          // It's a wall
          const w = est.trace_data;
          ctx.strokeStyle = "rgba(59, 130, 246, 0.6)"; 
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(w.start.x, w.start.y);
          ctx.lineTo(w.end.x, w.end.y);
          ctx.stroke();

          const cx = (w.start.x + w.end.x) / 2;
          const cy = (w.start.y + w.end.y) / 2;
          
          ctx.fillStyle = "rgba(59, 130, 246, 0.9)";
          ctx.beginPath();
          ctx.arc(cx, cy, 14, 0, 2 * Math.PI);
          ctx.fill();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 12px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const label = est.item_code.includes('-') ? est.item_code.split('-')[1] : "✓";
          ctx.fillText(label, cx, cy + 1);
        } else if (est.trace_data.polygon) {
          // It's a room
          const poly = est.trace_data.polygon as Point[];
          ctx.fillStyle = "rgba(168, 85, 247, 0.3)"; 
          ctx.strokeStyle = "rgba(168, 85, 247, 0.8)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(poly[0].x, poly[0].y);
          for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          const center = est.trace_data.center || calculatePolygonCentroid(poly);
          ctx.fillStyle = "rgba(168, 85, 247, 0.9)";
          ctx.beginPath();
          ctx.arc(center.x, center.y, 14, 0, 2 * Math.PI);
          ctx.fill();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 12px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const label = est.item_code.includes('-') ? est.item_code.split('-')[1] : "✓";
          ctx.fillText(label, center.x, center.y + 1);
        }
      }
    });

    // Draw active detected rooms (Editable areas)
    detectedRooms.forEach((r, idx) => {
      ctx.fillStyle = "rgba(217, 70, 239, 0.4)";
      ctx.strokeStyle = "rgba(217, 70, 239, 0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(r.polygon[0].x, r.polygon[0].y);
      for (let i = 1; i < r.polygon.length; i++) ctx.lineTo(r.polygon[i].x, r.polygon[i].y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`Area ${idx + 1}`, r.center.x, r.center.y);

      if (toolMode === 'idle' || toolMode === 'draw-area') {
        ctx.fillStyle = "rgba(255, 255, 255, 1)";
        ctx.strokeStyle = "rgba(217, 70, 239, 1)";
        ctx.lineWidth = 2;
        r.polygon.forEach(p => {
          ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
        });
      }
    });

    // Draw active detected walls (Editable traces)
    ctx.font = "bold 16px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    detectedWalls.forEach((w, idx) => {
      ctx.strokeStyle = "rgba(16, 185, 129, 0.8)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(w.start.x, w.start.y);
      ctx.lineTo(w.end.x, w.end.y);
      ctx.stroke();

      if (toolMode === 'idle' || toolMode === 'draw') {
        ctx.fillStyle = "rgba(255, 255, 255, 1)";
        ctx.strokeStyle = "rgba(16, 185, 129, 1)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(w.start.x, w.start.y, 6, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(w.end.x, w.end.y, 6, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      }

      const cx = (w.start.x + w.end.x) / 2;
      const cy = (w.start.y + w.end.y) / 2;
      
      ctx.fillStyle = "rgba(16, 185, 129, 0.9)";
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.fillText((idx + 1).toString(), cx, cy + 1);
    });

    // Draw manual drawing line (Ghost Line)
    if (toolMode === 'draw' && isDrawing && drawingStart && drawingEnd) {
      ctx.strokeStyle = "rgba(59, 130, 246, 0.9)"; // Blue
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(drawingStart.x, drawingStart.y);
      ctx.lineTo(drawingEnd.x, drawingEnd.y);
      ctx.stroke();
    }

    // Draw manual area polygon (Ghost Area)
    if (toolMode === 'draw-area' && drawingAreaPoints.length > 0) {
      ctx.fillStyle = "rgba(217, 70, 239, 0.2)";
      ctx.strokeStyle = "rgba(217, 70, 239, 0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(drawingAreaPoints[0].x, drawingAreaPoints[0].y);
      for (let i = 1; i < drawingAreaPoints.length; i++) {
        ctx.lineTo(drawingAreaPoints[i].x, drawingAreaPoints[i].y);
      }
      
      if (drawingEnd && isDrawing) {
         ctx.lineTo(drawingEnd.x, drawingEnd.y);
      }

      if (drawingAreaPoints.length > 1) {
         ctx.fill();
      }
      ctx.stroke();
      
      // Draw nodes
      drawingAreaPoints.forEach((p, idx) => {
         if (drawingAreaPoints.length > 2 && idx === 0) {
            // Draw special target for the first point to indicate 'Close'
            ctx.fillStyle = "rgba(16, 185, 129, 1)"; // Emerald Green
            ctx.beginPath();
            ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Add text label
            ctx.fillStyle = "rgba(16, 185, 129, 1)";
            ctx.font = "bold 13px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("Click to close area", p.x, p.y - 18);
         } else {
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "rgba(217, 70, 239, 0.9)";
            ctx.lineWidth = 2;
            ctx.stroke();
         }
      });
    }
  };

  useEffect(() => {
    redrawCanvas();
  }, [detectedWalls, detectedRooms, isDrawing, drawingStart, drawingEnd, drawingAreaPoints, existingEstimations, toolMode]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const snapToAngles = (start: Point, end: Point): Point => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx);
    const snapAngles = [0, Math.PI/2, Math.PI, -Math.PI/2, -Math.PI];
    for (let snap of snapAngles) {
      if (Math.abs(angle - snap) < 0.17) {
         const dist = Math.sqrt(dx*dx + dy*dy);
         return { x: start.x + dist * Math.cos(snap), y: start.y + dist * Math.sin(snap) };
      }
    }
    return end;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    
    if (toolMode === 'idle') {
       // Check rooms first
       for (let i = 0; i < detectedRooms.length; i++) {
         const r = detectedRooms[i];
         for (let v = 0; v < r.polygon.length; v++) {
           const p = r.polygon[v];
           const dist = Math.sqrt(Math.pow(coords.x - p.x, 2) + Math.pow(coords.y - p.y, 2));
           if (dist < 15) {
             setActiveHandle({ type: 'room', idx: i, vertexIdx: v });
             return;
           }
         }
       }
       
       for (let i = 0; i < detectedWalls.length; i++) {
         const w = detectedWalls[i];
         const distStart = Math.sqrt(Math.pow(coords.x - w.start.x, 2) + Math.pow(coords.y - w.start.y, 2));
         const distEnd = Math.sqrt(Math.pow(coords.x - w.end.x, 2) + Math.pow(coords.y - w.end.y, 2));
         
         if (distStart < 15) { setActiveHandle({ type: 'wall', idx: i, node: 'start' }); return; }
         if (distEnd < 15) { setActiveHandle({ type: 'wall', idx: i, node: 'end' }); return; }
       }
    }

    if (toolMode === 'draw') {
      setIsDrawing(true);
      setDrawingStart(coords);
      setDrawingEnd(coords);
    } else if (toolMode === 'draw-area') {
      setIsDrawing(true);
      // Close polygon if clicked near start
      if (drawingAreaPoints.length > 2) {
         const startPoint = drawingAreaPoints[0];
         const dist = Math.sqrt(Math.pow(coords.x - startPoint.x, 2) + Math.pow(coords.y - startPoint.y, 2));
         if (dist < 20) {
            // Close it
            const newArea: DetectedRoom = {
              id: `manual_room_${Date.now()}`,
              polygon: drawingAreaPoints,
              areaPixels: calculatePolygonArea(drawingAreaPoints),
              center: calculatePolygonCentroid(drawingAreaPoints)
            };
            setDetectedRooms(prev => [...prev, newArea]);
            setDrawingAreaPoints([]);
            setIsDrawing(false);
            return;
         }
      }
      setDrawingAreaPoints(prev => [...prev, coords]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    let coords = getCanvasCoords(e);

    if (activeHandle !== null) {
      if (activeHandle.type === 'wall') {
        setDetectedWalls(prev => prev.map((w, i) => {
          if (i !== activeHandle.idx) return w;
          
          let newStart = w.start;
          let newEnd = w.end;
          if (activeHandle.node === 'start') newStart = coords;
          if (activeHandle.node === 'end') newEnd = coords;
          
          const newDist = Math.sqrt(Math.pow(newEnd.x - newStart.x, 2) + Math.pow(newEnd.y - newStart.y, 2));
          return { ...w, start: newStart, end: newEnd, lengthPixels: newDist };
        }));
      } else if (activeHandle.type === 'room') {
        setDetectedRooms(prev => prev.map((r, i) => {
          if (i !== activeHandle.idx) return r;
          const newPoly = [...r.polygon];
          newPoly[activeHandle.vertexIdx] = coords;
          return {
            ...r,
            polygon: newPoly,
            areaPixels: calculatePolygonArea(newPoly),
            center: calculatePolygonCentroid(newPoly)
          };
        }));
      }
      return;
    }

    if (toolMode === 'draw' && isDrawing && drawingStart) {
      coords = snapToAngles(drawingStart, coords);
      setDrawingEnd(coords);
    } else if (toolMode === 'draw-area' && isDrawing) {
      setDrawingEnd(coords);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeHandle !== null) {
      setActiveHandle(null);
      return;
    }

    if (toolMode === 'draw' && isDrawing && drawingStart && drawingEnd) {
      const dist = Math.sqrt(Math.pow(drawingEnd.x - drawingStart.x, 2) + Math.pow(drawingEnd.y - drawingStart.y, 2));
      if (dist > 15) { 
        const newWall: DetectedWall = {
          id: `manual_${Date.now()}`,
          start: drawingStart,
          end: drawingEnd,
          lengthPixels: dist
        };
        setDetectedWalls(prev => [...prev, newWall]);
      }
      setIsDrawing(false);
      setDrawingStart(null);
      setDrawingEnd(null);
    } else if (toolMode === 'delete') {
      const coords = getCanvasCoords(e);
      let closestIdx = -1;
      let minDistance = Infinity;

      // Delete Walls
      detectedWalls.forEach((w, idx) => {
         const len = w.lengthPixels;
         if (len === 0) return;
         const px = w.end.x - w.start.x;
         const py = w.end.y - w.start.y;
         const u = ((coords.x - w.start.x) * px + (coords.y - w.start.y) * py) / (len * len);
         let cx, cy;
         if (u < 0) { cx = w.start.x; cy = w.start.y; }
         else if (u > 1) { cx = w.end.x; cy = w.end.y; }
         else { cx = w.start.x + u * px; cy = w.start.y + u * py; }
         
         const dist = Math.sqrt(Math.pow(coords.x - cx, 2) + Math.pow(coords.y - cy, 2));
         if (dist < minDistance) { minDistance = dist; closestIdx = idx; }
      });

      if (minDistance < 25 && closestIdx !== -1) {
         setDetectedWalls(prev => prev.filter((_, i) => i !== closestIdx));
         return;
      }

      // Delete Rooms
      let clickedRoomIdx = -1;
      detectedRooms.forEach((r, idx) => {
         const dist = Math.sqrt(Math.pow(coords.x - r.center.x, 2) + Math.pow(coords.y - r.center.y, 2));
         if (dist < 30) clickedRoomIdx = idx;
      });

      if (clickedRoomIdx !== -1) {
         setDetectedRooms(prev => prev.filter((_, i) => i !== clickedRoomIdx));
      }
    }
  };

  const handleAIAnalyze = async () => {
    if (!cvLoaded) {
      toast.error("Computer Vision engine is still loading. Please wait.");
      return;
    }
    if (!canvasRef.current) return;

    setIsProcessing(true);
    try {
      setProcessingStatus("Detecting architectural lines (OpenCV)...");
      const canvas = document.createElement("canvas");
      canvas.width = canvasRef.current.width;
      canvas.height = canvasRef.current.height;
      const ctx = canvas.getContext("2d");
      if (ctx && bgImageRef.current) ctx.drawImage(bgImageRef.current, 0, 0);

      const walls = await detectWallsFromCanvas(canvas);

      // --- WALL DEDUPLICATION ---
      const existingWalls = existingEstimations
        .filter(est => est.trace_data?.start && est.trace_data?.end)
        .map(est => est.trace_data as DetectedWall);
        
      const filteredWalls = walls.filter(newWall => {
         const nx = (newWall.end.x - newWall.start.x) / (newWall.lengthPixels || 1);
         const ny = (newWall.end.y - newWall.start.y) / (newWall.lengthPixels || 1);
         
         for (const exWall of existingWalls) {
            if (exWall.lengthPixels === 0) continue;
            const exx = (exWall.end.x - exWall.start.x) / exWall.lengthPixels;
            const exy = (exWall.end.y - exWall.start.y) / exWall.lengthPixels;
            
            const dotProduct = Math.abs(nx * exx + ny * exy);
            if (dotProduct > 0.95) { // Roughly parallel
               const mx = (newWall.start.x + newWall.end.x) / 2;
               const my = (newWall.start.y + newWall.end.y) / 2;
               
               const exLen = exWall.lengthPixels;
               const px = exWall.end.x - exWall.start.x;
               const py = exWall.end.y - exWall.start.y;
               
               const u = ((mx - exWall.start.x) * px + (my - exWall.start.y) * py) / (exLen * exLen);
               
               // Check if midpoint falls within the segment's bounding region
               if (u >= -0.2 && u <= 1.2) {
                  const cx = exWall.start.x + u * px;
                  const cy = exWall.start.y + u * py;
                  const dist = Math.sqrt(Math.pow(mx - cx, 2) + Math.pow(my - cy, 2));
                  
                  if (dist < 20) return false; // Duplicate
               }
            }
         }
         return true;
      });

      setDetectedWalls(filteredWalls);

      setProcessingStatus("Detecting rooms (OpenCV)...");
      const rooms = detectRoomsFromWalls(walls, canvas.width, canvas.height);
      
      // --- ROOM DEDUPLICATION ---
      const existingRooms = existingEstimations
        .filter(est => est.trace_data?.polygon)
        .map(est => est.trace_data as DetectedRoom);
        
      const filteredRooms = rooms.filter(newRoom => {
         for (const exRoom of existingRooms) {
            const dist = Math.sqrt(Math.pow(newRoom.center.x - (exRoom.center?.x || 0), 2) + Math.pow(newRoom.center.y - (exRoom.center?.y || 0), 2));
            if (dist < 30) return false; // Duplicate Room
         }
         return true;
      });

      setDetectedRooms(filteredRooms);

      if (filteredWalls.length > 0) {
        setCalibrationWallIndex(0);
        setProcessingStatus("Running Spatial OCR Auto-Scaling...");
        try {
           const ocr = await detectScaleFromImage(plan.file, unitSystem, walls);
           if (ocr && ocr.pixelsPerUnit && ocr.bestWallIndex !== null) {
               setCalibrationWallIndex(ocr.bestWallIndex);
               setCalibrationLength(ocr.estimatedLength ? ocr.estimatedLength.toString() : "");
               toast.info(`Auto-Scale: Matched Wall ${ocr.bestWallIndex + 1} to ${ocr.estimatedLength}${unitSystem === 'metric' ? 'm' : 'ft'}!`);
           } else {
               toast.warning("Could not auto-detect scale. Please calibrate manually.");
           }
        } catch (e) {
           console.log("OCR Spatial auto-scale failed", e);
        }
      }
      
      const skippedWalls = walls.length - filteredWalls.length;
      const skippedRooms = rooms.length - filteredRooms.length;
      const skipMsg = (skippedWalls > 0 || skippedRooms > 0) ? ` (Skipped ${skippedWalls} walls and ${skippedRooms} rooms that were already traced)` : "";
      toast.success(`Found ${filteredWalls.length} new walls and ${filteredRooms.length} new rooms!${skipMsg}`);
      
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "AI Analysis failed");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  const handleApplyCalibration = (forcedScale?: number) => {
    if (detectedWalls.length === 0 && detectedRooms.length === 0) return;
    
    let scale = 0;
    
    if (forcedScale) {
       scale = forcedScale;
    } else {
       const refWall = detectedWalls[calibrationWallIndex];
       if (!refWall && detectedWalls.length > 0) {
         toast.error("Selected reference wall no longer exists.");
         return;
       }
       const realLength = parseFloat(calibrationLength);
       
       if (isNaN(realLength) || realLength <= 0) {
         toast.error("Please enter a valid numerical length.");
         return;
       }

       if (!refWall) {
         toast.error("You need at least one wall to calibrate scale.");
         return;
       }
       
       scale = refWall.lengthPixels / realLength; // pixels per unit
    }

    toast.success(`Generating estimations...`);

    const newRows: any[] = [];
    const baseItemIndex = existingEstimations.length;

    // Add Walls
    detectedWalls.forEach((w, idx) => {
      const lengthUnits = w.lengthPixels / scale;
      newRows.push({
        floor_plan: plan.id,
        item_code: `WALL-${idx + 1 + baseItemIndex}`,
        description: w.id.startsWith("manual") ? "[Manual] Drawn Wall" : "[AI] Detected Wall",
        no_of_items: "1",
        length: lengthUnits.toFixed(2),
        width: "",
        depth_height: "",
        gross_qty: lengthUnits.toFixed(2),
        is_deduction: false,
        net_qty: lengthUnits.toFixed(2),
        unit: unitSystem === "metric" ? "m" : "ft",
        trace_data: {
          start: w.start,
          end: w.end,
          lengthPixels: w.lengthPixels
        }
      });
    });

    // Add Rooms (Area = AreaPixels / scale^2)
    const currentRoomsCount = existingEstimations.filter(e => e.item_code.startsWith('ROOM')).length;
    detectedRooms.forEach((r, idx) => {
      const areaUnits = r.areaPixels / (scale * scale);
      newRows.push({
        floor_plan: plan.id,
        item_code: `ROOM-${idx + 1 + currentRoomsCount}`,
        description: r.id.startsWith("manual") ? "[Manual] Defined Area" : "[AI] Detected Room",
        no_of_items: "1",
        length: areaUnits.toFixed(2), // Trick the auto-calculation in TakeOffTab
        width: "1",
        depth_height: "",
        gross_qty: areaUnits.toFixed(2),
        is_deduction: false,
        net_qty: areaUnits.toFixed(2),
        unit: unitSystem === "metric" ? "m²" : "ft²",
        trace_data: {
          polygon: r.polygon,
          areaPixels: r.areaPixels,
          center: r.center
        }
      });
    });

    onAIDataExtracted(newRows);
    setDetectedWalls([]);
    setDetectedRooms([]);
    setDrawingAreaPoints([]);
    setCalibrationLength("");
    setToolMode('idle');
    setForceRecalibrate(false);
  };

  return (
    <div 
      ref={containerRef} 
      className={`bg-surface-900 relative overflow-hidden transition-all duration-300 w-full flex items-center justify-center ${isExpanded ? 'h-[800px]' : 'h-[400px]'}`}
    >
      <Script 
        src="https://docs.opencv.org/4.8.0/opencv.js" 
        onLoad={() => setCvLoaded(true)} 
        strategy="lazyOnload"
      />

      <div className="w-full h-full overflow-auto flex items-center justify-center relative">
        <canvas 
          ref={canvasRef} 
          className={`max-w-full max-h-full object-contain drop-shadow-lg shadow-black/50 ${toolMode === 'draw' || toolMode === 'draw-area' ? 'cursor-crosshair' : toolMode === 'delete' ? 'cursor-not-allowed' : activeHandle ? 'cursor-grabbing' : 'cursor-default'}`}
          style={{ width: "auto", height: "100%" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { 
            setIsDrawing(false); 
            setDrawingStart(null); 
            setDrawingEnd(null); 
            setActiveHandle(null); 
          }}
        />
      </div>

      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-auto z-50">
        {detectedWalls.length === 0 && detectedRooms.length === 0 ? (
          <button
            onClick={handleAIAnalyze}
            disabled={isProcessing || !cvLoaded}
            className="bg-accent hover:bg-accent/90 disabled:bg-surface-700 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 font-black uppercase tracking-widest text-xs transition-all"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
            {isProcessing ? "Processing..." : "🤖 Auto-Detect Take-Offs"}
          </button>
        ) : (
          <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-2xl w-80 animate-in slide-in-from-top-4 duration-300">
            {existingScale && !forceRecalibrate ? (
              <>
                <div className="flex items-center gap-2 text-gray-900 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <h4 className="text-sm font-black uppercase tracking-widest">Review Traces</h4>
                </div>
                <p className="text-xs text-gray-500 font-medium mb-5 leading-relaxed">
                  Scale inferred from previous take-offs. Review the {detectedWalls.length} new walls and {detectedRooms.length} new areas.
                </p>
                <button
                  onClick={() => handleApplyCalibration(existingScale)}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white mt-2 px-5 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Apply & Generate
                </button>
                <button
                  onClick={() => setForceRecalibrate(true)}
                  className="w-full text-gray-400 hover:text-gray-600 mt-3 text-[10px] font-bold uppercase tracking-widest transition-all text-center"
                >
                  Force Re-Calibrate
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-gray-900 mb-3">
                  <Ruler className="w-5 h-5 text-emerald-500" />
                  <h4 className="text-sm font-black uppercase tracking-widest">Step 2: Calibrate</h4>
                </div>
                <p className="text-xs text-gray-500 font-medium mb-5 leading-relaxed">
                  Verify the AI Auto-Scale or manually calibrate by selecting a reference wall length.
                </p>
                
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Reference Wall</label>
                    <select 
                      value={calibrationWallIndex} 
                      onChange={(e) => setCalibrationWallIndex(Number(e.target.value))}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm font-bold rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    >
                      {detectedWalls.map((_, idx) => (
                        <option key={idx} value={idx}>Wall {idx + 1}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Actual Length ({unitSystem === 'metric' ? 'm' : 'ft'})</label>
                    <input 
                      type="number"
                      value={calibrationLength}
                      onChange={(e) => setCalibrationLength(e.target.value)}
                      placeholder={`e.g. ${unitSystem === 'metric' ? '4.5' : '15'}`}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm font-bold rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>

                  <button
                    onClick={() => handleApplyCalibration()}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white mt-2 px-5 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Apply & Generate
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {(detectedWalls.length > 0 || detectedRooms.length > 0) && (
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-white p-2 rounded-2xl shadow-xl border border-gray-200 z-50 animate-in slide-in-from-top-4 duration-300">
          <button 
             onClick={() => { setToolMode('idle'); setDrawingAreaPoints([]); }}
             className={`p-2.5 rounded-xl transition-all ${toolMode === 'idle' ? 'bg-emerald-100 text-emerald-600 shadow-sm' : 'hover:bg-gray-100 text-gray-500'}`}
             title="Select & Adjust"
          ><MousePointer2 className="w-5 h-5"/></button>
          
          <div className="w-px h-8 bg-gray-200 mx-1"></div>

          <button 
             onClick={() => { setToolMode('draw'); setDrawingAreaPoints([]); }}
             className={`p-2.5 rounded-xl transition-all ${toolMode === 'draw' ? 'bg-blue-100 text-blue-600 shadow-sm' : 'hover:bg-gray-100 text-gray-500'}`}
             title="Draw Manual Wall (Line)"
          ><Pencil className="w-5 h-5"/></button>

          <button 
             onClick={() => setToolMode('draw-area')}
             className={`p-2.5 rounded-xl transition-all ${toolMode === 'draw-area' ? 'bg-purple-100 text-purple-600 shadow-sm' : 'hover:bg-gray-100 text-gray-500'}`}
             title="Draw Manual Area (Polygon)"
          ><Hexagon className="w-5 h-5"/></button>
          
          <div className="w-px h-8 bg-gray-200 mx-1"></div>

          <button 
             onClick={() => { setToolMode('delete'); setDrawingAreaPoints([]); }}
             className={`p-2.5 rounded-xl transition-all ${toolMode === 'delete' ? 'bg-red-100 text-red-600 shadow-sm' : 'hover:bg-gray-100 text-gray-500'}`}
             title="Delete Wall/Area"
          ><Eraser className="w-5 h-5"/></button>

          <div className="w-px h-8 bg-gray-200 mx-1"></div>
          
          <button 
             onClick={() => { setDetectedWalls([]); setDetectedRooms([]); setDrawingAreaPoints([]); setToolMode('idle'); }}
             className="p-2.5 rounded-xl hover:bg-red-50 text-red-500 transition-all"
             title="Clear All & Restart"
          ><Trash2 className="w-5 h-5"/></button>
        </div>
      )}

      {isProcessing && (
        <div className="absolute top-4 left-4 bg-surface-900/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-surface-700 text-emerald-400 text-[10px] font-black uppercase tracking-widest animate-pulse z-50">
          {processingStatus}
        </div>
      )}
      {!cvLoaded && (
        <div className="absolute top-4 left-4 bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-lg border border-amber-500/20 text-[9px] font-bold uppercase tracking-widest z-50">
          Loading AI Engine...
        </div>
      )}

      <div className="absolute bottom-4 right-4 flex items-center gap-2 pointer-events-auto">
        <button 
          onClick={onToggleExpand}
          className="bg-surface-800 text-white hover:bg-surface-700 px-4 py-2 rounded-lg shadow-sm text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
        >
          <Maximize2 className="w-3 h-3" />
          {isExpanded ? 'Collapse View' : 'Expand View'}
        </button>
      </div>
    </div>
  );
}
