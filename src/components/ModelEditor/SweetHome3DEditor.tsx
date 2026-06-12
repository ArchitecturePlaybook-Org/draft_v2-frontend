'use client';
import React, { useEffect, useRef } from 'react';

import { projectsApi } from '@/domains/projects/api';

interface SweetHome3DEditorProps {
  projectId: string;
  projectUid: string;
  assetId?: string;
  isNew?: boolean;
  onSaveComplete?: (asset: any) => void;
}

export default function SweetHome3DEditor({ projectId, projectUid, assetId, isNew, onSaveComplete }: SweetHome3DEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Listen for messages from the iframe SH3D application
    const handleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'SH3D_SAVE_COMPLETE') {
        const { sh3dBlob, thumbnailBlob, name } = event.data;
        
        try {
          console.log('Sending SH3D model to backend via BFF...', name);
          
          const result = await projectsApi.saveSH3DProject(projectUid, {
            sh3dFile: sh3dBlob,
            thumbnailFile: thumbnailBlob,
            name: name
          });
          
          console.log('Backend save success:', result);
          
          // Acknowledge back to iframe with new IDs
          if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
              type: 'SH3D_SAVE_ACK',
              assetId: result.sh3d_asset?.id || result.id,
              assetPk: result.sh3d_asset?.id || result.id,
              canonicalUid: result.sh3d_asset?.canonical_uid || result.canonical_uid
            }, '*');
          }
          
          if (onSaveComplete) {
            onSaveComplete(result);
          }
        } catch (error: any) {
          console.error('Failed to save SH3D model to backend:', error);
          if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
              type: 'SH3D_SAVE_ERROR',
              error: error.message || 'Unknown error'
            }, '*');
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [projectUid, onSaveComplete]);

  const src = `/sh3d/index.html?projectId=${projectId}${assetId ? `&assetId=${assetId}` : ''}${isNew ? '&isNew=true' : ''}`;

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-white">
      <iframe
        ref={iframeRef}
        src={src}
        className="w-full h-full border-none outline-none flex-1"
        title="Sweet Home 3D Editor"
        allowFullScreen
      />
    </div>
  );
}
