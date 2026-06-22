'use client';
import React, { useEffect, useRef } from 'react';
import { toast } from "sonner";

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
        const { sh3dBlob, thumbnailBlob, name, asRevision, isSaveAs } = event.data;
        
        try {
          console.log('Sending SH3D model to backend via BFF...', name);
          
          const result = await projectsApi.saveSH3DProject(projectUid, {
            sh3dFile: sh3dBlob,
            thumbnailFile: thumbnailBlob,
            name: name,
            assetId: isSaveAs ? undefined : assetId,
            asRevision: asRevision
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
      } else if (event.data && event.data.type === 'SH3D_SYNC_PLAN') {
        const { levels } = event.data;
        if (!levels || levels.length === 0) return;
        
        toast.info(`Syncing ${levels.length} floor plan(s)...`);
        
        try {
          const projectData = await projectsApi.getProjectDetails(projectUid);
          const assets = projectData.assets || [];
          const planAssets = assets.filter(a => a.category === '2d_plan');

          for (const lvl of levels) {
            const { levelName, blob } = lvl;
            const newTitle = levelName.toLowerCase().includes('plan') ? levelName : `Floor Plan - ${levelName}`;
            const assetToUpdate = planAssets.find(a => a.title === newTitle || a.title === levelName);

            const file = new File([blob], `${newTitle}.png`, { type: 'image/png' });

            if (assetToUpdate) {
              await projectsApi.uploadRevision(assetToUpdate.id, file, 'Synced from 3D Model', blob);
            } else {
              await projectsApi.uploadProjectAsset(projectData.id, '2d_plan', file, newTitle, blob);
            }
          }
          toast.success("Floor plans synced successfully!");
          
          try {
            const bc = new BroadcastChannel('sh3d_updates');
            bc.postMessage({ type: 'SH3D_MODEL_SAVED', projectUid });
            bc.close();
          } catch (e) {
            console.warn('BroadcastChannel not supported', e);
          }
        } catch (err: any) {
          console.error("Failed to sync plans", err);
          toast.error("Failed to sync floor plans.");
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
