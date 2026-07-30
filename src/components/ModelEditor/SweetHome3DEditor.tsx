'use client';
import React, { useEffect, useRef } from 'react';
import { toast } from "sonner";

import { projectsApi } from '@/domains/projects/api';
import { resolveAssetFileUrl } from '@/lib/resolveAssetFileUrl';
import { invalidateBffCache, withCacheBuster } from '@/lib/bffCache';

interface SweetHome3DEditorProps {
  projectId: string;
  projectUid: string;
  assetId?: string;
  isNew?: boolean;
  onSaveComplete?: (asset: any) => void;
}

interface PendingSavePayload {
  sh3dBlob: Blob;
  thumbnailBlob?: Blob | null;
  name: string;
  asRevision?: boolean;
  isSaveAs?: boolean;
}

export default function SweetHome3DEditor({ projectId, projectUid, assetId, isNew, onSaveComplete }: SweetHome3DEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const modelBlobUrlRef = useRef<string | null>(null);
  const assetIdRef = useRef<string | undefined>(assetId);
  const saveInProgressRef = useRef(false);
  const saveQueueRef = useRef<PendingSavePayload[]>([]);
  const initSentRef = useRef(false);

  useEffect(() => {
    assetIdRef.current = assetId;
    initSentRef.current = false;
  }, [assetId]);

  const processSaveQueue = async () => {
    if (saveInProgressRef.current) return;
    const next = saveQueueRef.current.shift();
    if (!next) return;

    saveInProgressRef.current = true;

    try {
      if (!next.sh3dBlob || next.sh3dBlob.size === 0) {
        throw new Error('Generated model file was empty');
      }

      const sh3dFile = next.sh3dBlob instanceof File
        ? next.sh3dBlob
        : new File([next.sh3dBlob], next.name || 'model.sh3d', { type: 'application/octet-stream' });

      const thumbnailFile = next.thumbnailBlob && next.thumbnailBlob.size > 0
        ? (next.thumbnailBlob instanceof File
          ? next.thumbnailBlob
          : new File([next.thumbnailBlob], 'thumbnail.png', { type: 'image/png' }))
        : null;

      const currentAssetId = assetIdRef.current;
      console.log('[SH3D] Uploading save...', next.name, 'bytes:', sh3dFile.size, 'asset:', currentAssetId);

      const result = await projectsApi.saveSH3DProject(projectUid, {
        sh3dFile,
        thumbnailFile,
        name: next.name || sh3dFile.name,
        assetId: next.isSaveAs ? undefined : currentAssetId,
        asRevision: next.asRevision,
      });

      if (!result?.id || Number(result.size) <= 0) {
        throw new Error('Server did not confirm the saved file');
      }

      const savedCanonicalUid = String(result.canonical_uid || result.sh3d_asset?.canonical_uid || '');
      if (savedCanonicalUid) {
        assetIdRef.current = savedCanonicalUid;
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.set('assetId', savedCanonicalUid);
          url.searchParams.delete('isNew');
          window.history.replaceState({}, '', url.toString());
        }
      }

      await invalidateBffCache(
        '/api/v1/projects/assets/by-canonical/',
        `/api/v1/projects/projects/${projectUid}`,
        '/api/v1/proxy-asset',
        savedCanonicalUid ? `/by-canonical/${savedCanonicalUid}` : '',
      );

      let freshAsset = result;
      if (savedCanonicalUid) {
        try {
          freshAsset = await projectsApi.getAssetByCanonicalUid(savedCanonicalUid);
        } catch {
          // use save response if re-fetch fails
        }
      }

      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({
          type: 'SH3D_SAVE_ACK',
          assetId: freshAsset.id,
          assetPk: freshAsset.id,
          canonicalUid: freshAsset.canonical_uid || savedCanonicalUid,
          size: freshAsset.size,
          updatedAt: freshAsset.updated_at,
        }, '*');
      }

      onSaveComplete?.(freshAsset);
    } catch (error: any) {
      console.error('Failed to save SH3D model to backend:', error);
      toast.error(error.message || 'Failed to save model');
      iframeRef.current?.contentWindow?.postMessage({
        type: 'SH3D_SAVE_ERROR',
        error: error.message || 'Unknown error',
      }, '*');
    } finally {
      saveInProgressRef.current = false;
      if (saveQueueRef.current.length > 0) {
        void processSaveQueue();
      }
    }
  };

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;

      if (event.data?.type === 'SH3D_SAVE_COMPLETE') {
        const { sh3dBlob, thumbnailBlob, name, asRevision, isSaveAs } = event.data;
        // Keep only the latest queued save — each entry is a full snapshot
        saveQueueRef.current = [{ sh3dBlob, thumbnailBlob, name, asRevision, isSaveAs }];
        void processSaveQueue();
        return;
      }

      if (event.data?.type === 'SH3D_SYNC_PLAN') {
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
          toast.success('Floor plans synced successfully!');

          try {
            const bc = new BroadcastChannel('sh3d_updates');
            bc.postMessage({ type: 'SH3D_MODEL_SAVED', projectUid });
            bc.close();
          } catch {
            console.warn('BroadcastChannel not supported');
          }
        } catch (err: any) {
          console.error('Failed to sync plans', err);
          toast.error('Failed to sync floor plans.');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [projectUid, onSaveComplete]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const initEditor = async () => {
      if (initSentRef.current) return;
      initSentRef.current = true;

      const target = iframe.contentWindow;
      if (!target) {
        initSentRef.current = false;
        return;
      }

      let modelBlobUrl: string | null = null;
      let assetPk: number | undefined;
      let modelExt = '.sh3d';
      let startBlank = isNew || !assetId;
      const loadAssetId = assetIdRef.current;

      if (loadAssetId) {
        try {
          const asset = await projectsApi.getAssetByCanonicalUid(loadAssetId);
          assetPk = asset.id;

          const hasLoadableFile = Boolean(asset.file) && Number(asset.size) > 0;
          if (hasLoadableFile) {
            const extMatch = asset.file.match(/\.(sh3d|sh3x)(\?|$)/i);
            if (extMatch) modelExt = extMatch[0].split('?')[0];

            const fileUrl = withCacheBuster(
              resolveAssetFileUrl(asset.file),
              asset.updated_at || asset.id,
            );
            const res = await fetch(fileUrl, {
              credentials: 'include',
              cache: 'no-store',
            });
            if (!res.ok) {
              throw new Error(`Failed to fetch model file (${res.status})`);
            }

            const blob = await res.blob();
            if (blob.size > 0) {
              if (modelBlobUrlRef.current) {
                URL.revokeObjectURL(modelBlobUrlRef.current);
              }
              modelBlobUrl = URL.createObjectURL(blob);
              modelBlobUrlRef.current = modelBlobUrl;
              startBlank = false;
            } else {
              startBlank = true;
            }
          } else {
            startBlank = true;
          }
        } catch (error) {
          console.error('Failed to load 3D model asset:', error);
          toast.error('Could not load the saved model. Starting with a blank canvas.');
          startBlank = true;
        }
      }

      target.postMessage({
        type: 'SH3D_INIT',
        projectId,
        assetId: loadAssetId,
        assetPk,
        isNew: startBlank,
        modelBlobUrl,
        modelExt,
      }, '*');
    };

    iframe.addEventListener('load', initEditor);
    if (iframe.contentDocument?.readyState === 'complete') {
      void initEditor();
    }

    return () => {
      iframe.removeEventListener('load', initEditor);
      if (modelBlobUrlRef.current) {
        URL.revokeObjectURL(modelBlobUrlRef.current);
        modelBlobUrlRef.current = null;
      }
    };
  }, [projectId, projectUid, assetId, isNew]);

  const src = `/sh3d/index.html?projectId=${projectId}&deferLoad=1&embedded=1`;

  return (
    <div className="w-full h-full min-h-0 flex flex-col relative overflow-hidden bg-white">
      <iframe
        ref={iframeRef}
        src={src}
        className="w-full h-full min-h-0 border-none outline-none flex-1 block"
        title="Sweet Home 3D Editor"
        allowFullScreen
      />
    </div>
  );
}
