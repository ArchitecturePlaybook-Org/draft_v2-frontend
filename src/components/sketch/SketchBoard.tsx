"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

import "@excalidraw/excalidraw/index.css";

// Dynamically import Excalidraw to prevent SSR issues
const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
  {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center bg-surface-50">
      <Spinner label="Calibrating sketching engine..." />
    </div>,
  }
);

// We need to import the utilities
let serializeAsJSON: any;
let exportToBlob: any;
if (typeof window !== "undefined") {
  import("@excalidraw/excalidraw").then((mod) => {
    serializeAsJSON = mod.serializeAsJSON;
    exportToBlob = mod.exportToBlob;
  });
}

interface SketchBoardProps {
  onSave: (json: string, title: string, thumbnail?: Blob) => void;
  onClose: () => void;
  initialData?: any;
  sketchId?: string;
}

export const SketchBoard: React.FC<SketchBoardProps> = ({ onSave, onClose, initialData, sketchId = "global-sketch" }) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [title, setTitle] = useState("Concept Sketch " + new Date().toLocaleDateString());

  // Yjs Collaboration Refs
  const yDocRef = React.useRef<any>(null);
  const wsProviderRef = React.useRef<any>(null);
  const yElementsRef = React.useRef<any>(null);
  const isUpdatingFromYjs = React.useRef(false);

  useEffect(() => {
    if (!excalidrawAPI) return;
    
    let active = true;
    Promise.all([
      import("yjs"),
      import("y-websocket")
    ]).then(([Y, { WebsocketProvider }]) => {
      if (!active) return;
      const doc = new Y.Doc();
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";
      const provider = new WebsocketProvider(wsUrl, `sketch-${sketchId}`, doc);
      const yElements = doc.getMap('elements');
      
      yDocRef.current = doc;
      wsProviderRef.current = provider;
      yElementsRef.current = yElements;

      // Handle element updates from peers
      yElements.observe(() => {
        if (!excalidrawAPI) return;
        isUpdatingFromYjs.current = true;
        
        // Retrieve elements and sort them if necessary, but updateScene handles merge
        const elementsArray = Array.from(yElements.values());
        excalidrawAPI.updateScene({ elements: elementsArray });
        
        // Prevent echo loop
        setTimeout(() => { isUpdatingFromYjs.current = false; }, 100);
      });

      // Handle live cursors (awareness)
      provider.awareness.on("change", () => {
        if (!excalidrawAPI) return;
        const states = provider.awareness.getStates();
        const collaborators = new Map();
        
        states.forEach((state: any, clientId: number) => {
          if (clientId !== provider.awareness.clientID && state.user) {
            collaborators.set(clientId.toString(), {
              pointer: state.user.pointer,
              button: state.user.button,
              username: state.user.name || "Architect",
              selectedElementIds: state.user.selectedElementIds,
            });
          }
        });
        excalidrawAPI.updateScene({ collaborators });
      });
    });

    return () => {
      active = false;
      if (wsProviderRef.current) wsProviderRef.current.destroy();
      if (yDocRef.current) yDocRef.current.destroy();
    };
  }, [excalidrawAPI, sketchId]);

  const handleSave = async () => {
    if (!excalidrawAPI || !serializeAsJSON) {
      alert("Sketching engine not yet fully initialized. Please wait a moment.");
      return;
    }
    
    const elements = excalidrawAPI.getSceneElements();
    if (!elements || elements.length === 0) {
      alert("Please create a sketch before committing.");
      return;
    }

    const json = serializeAsJSON(
      elements,
      excalidrawAPI.getAppState(),
      excalidrawAPI.getFiles(),
      "local"
    );

    let thumbnailBlob: Blob | undefined;
    try {
      thumbnailBlob = await exportToBlob({
        elements,
        mimeType: "image/png",
        appState: {
          ...excalidrawAPI.getAppState(),
          exportWithBlurryBackground: false,
          exportBackground: true,
        },
        files: excalidrawAPI.getFiles(),
      });
    } catch (err) {
      console.error("Failed to generate thumbnail:", err);
    }
    
    onSave(json, title, thumbnailBlob);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-surface-100 flex flex-col animate-in fade-in zoom-in-95 duration-300">
      {/* Sketch Header */}
      <div className="h-16 border-b border-surface-200 flex justify-between items-center px-8 bg-surface-100 shrink-0 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-xl">✏️</div>
          <div className="w-64">
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-transparent border-none outline-none font-bold text-primary text-sm w-full focus:ring-1 focus:ring-accent/20 rounded"
              placeholder="Sketch Title..."
            />
            <p className="text-[9px] font-bold text-surface-400 uppercase tracking-widest">Architectural Conceptualization Module</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onClose} className="h-10 text-[9px] uppercase font-bold tracking-widest">Discard</Button>
          <Button onClick={handleSave} className="h-10 text-[9px] uppercase font-bold tracking-widest bg-accent">Commit to Hub</Button>
        </div>
      </div>

      {/* Drawing Area */}
      <div className="flex-1 bg-surface-50 relative overflow-hidden h-full">
        <Excalidraw 
          excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
          initialData={initialData}
          onChange={(elements: readonly any[], appState: any) => {
            if (isUpdatingFromYjs.current || !yElementsRef.current || !yDocRef.current) return;
            
            const yElements = yElementsRef.current;
            yDocRef.current.transact(() => {
              elements.forEach(el => {
                const existing = yElements.get(el.id);
                if (!existing || existing.version < el.version) {
                  yElements.set(el.id, el);
                }
              });
            });

            // Update local selection state for peers
            if (wsProviderRef.current?.awareness) {
              const currentState = wsProviderRef.current.awareness.getLocalState()?.user || {};
              wsProviderRef.current.awareness.setLocalStateField("user", {
                ...currentState,
                selectedElementIds: appState.selectedElementIds,
              });
            }
          }}
          onPointerUpdate={(payload: any) => {
            if (wsProviderRef.current?.awareness) {
              const currentState = wsProviderRef.current.awareness.getLocalState()?.user || {};
              wsProviderRef.current.awareness.setLocalStateField("user", {
                ...currentState,
                pointer: payload.pointer,
                button: payload.button,
                name: "You",
              });
            }
          }}
          UIOptions={{
            canvasActions: {
              toggleTheme: true,
              export: {
                saveFileToDisk: false,
              },
              loadScene: false,
            },
          }}
        />
      </div>
    </div>
  );
};
