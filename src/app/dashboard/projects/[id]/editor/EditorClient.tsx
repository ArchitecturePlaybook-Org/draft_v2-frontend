'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useParams, useSearchParams } from 'next/navigation';
import { projectsApi } from '@/domains/projects/api';

const SweetHome3DEditor = dynamic(
  () => import('@/components/ModelEditor/SweetHome3DEditor'),
  { ssr: false, loading: () => <div className="flex items-center justify-center w-full h-full bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div> }
);

export default function EditorClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params?.id as string;
  const assetId = searchParams?.get('assetId') || undefined;
  const isNew = searchParams?.get('isNew') === 'true';

  if (!projectId) return null;

  return (
    <div className="w-full h-full min-h-0 overflow-hidden bg-surface-100">
      <SweetHome3DEditor 
        projectId={projectId}
        projectUid={projectId} // The URL param "id" is actually the project UID
        assetId={assetId}
        isNew={isNew}
        onSaveComplete={(asset) => {
          console.log('Save completed in editor:', asset);
          // We can notify the parent via a broadcast channel or localStorage so the main project page refreshes without reloading.
          try {
            const bc = new BroadcastChannel('sh3d_updates');
            bc.postMessage({ type: 'SH3D_MODEL_SAVED', projectUid: projectId });
            bc.close();
          } catch (e) {
            console.warn('BroadcastChannel not supported', e);
          }
        }}
      />
    </div>
  );
}
