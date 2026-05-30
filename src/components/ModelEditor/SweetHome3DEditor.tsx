'use client';

import React, { useEffect, useRef } from 'react';

interface SweetHome3DEditorProps {
  projectId: string;
  onSave?: (file: File) => void;
}

export default function SweetHome3DEditor({ projectId, onSave }: SweetHome3DEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Optionally listen for messages from the iframe if we inject custom JS to emit events on save
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SH3D_SAVE') {
        const fileBlob = event.data.blob;
        const fileName = event.data.name || 'Plan.sh3d';
        
        // Convert Blob to File
        const file = new File([fileBlob], fileName, { type: 'application/octet-stream' });
        
        // Call the parent handler
        if (onSave) {
          onSave(file);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onSave]);

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-white">
      <iframe
        ref={iframeRef}
        src="/sh3d/index.html"
        className="w-full h-full border-none outline-none flex-1"
        title="Sweet Home 3D Editor"
        allowFullScreen
      />
    </div>
  );
}
