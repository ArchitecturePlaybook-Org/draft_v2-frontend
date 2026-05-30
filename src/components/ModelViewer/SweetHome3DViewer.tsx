'use client';

import React from 'react';

interface SweetHome3DViewerProps {
  modelUrl: string; // URL to the .sh3d file
}

export default function SweetHome3DViewer({ modelUrl }: SweetHome3DViewerProps) {
  return (
    <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-gray-100 rounded-md overflow-hidden relative">
      <iframe
        src={`/sh3d/index.html?defaultHome=${encodeURIComponent(modelUrl)}`}
        className="w-full h-full border-none outline-none absolute inset-0"
        title="Sweet Home 3D Viewer"
        allowFullScreen
      />
    </div>
  );
}
