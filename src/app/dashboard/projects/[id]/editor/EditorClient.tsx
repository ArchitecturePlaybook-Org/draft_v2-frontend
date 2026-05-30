'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { projectsApi } from '@/domains/projects/api';

const SweetHome3DEditor = dynamic(
  () => import('@/components/ModelEditor/SweetHome3DEditor'),
  { ssr: false, loading: () => <div className="flex items-center justify-center w-full h-full bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div> }
);

export default function EditorClient({ projectId }: { projectId: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* We use fixed inset-0 to cover the whole screen, overlaying any existing dashboard layout */}
      <div className="absolute top-4 left-4 z-[60]">
        <a href={`/dashboard/projects/${projectId}`} className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700 transition">
          &larr; Back to Project
        </a>
      </div>
      <SweetHome3DEditor 
        projectId={projectId}
        onSave={async (file) => {
          console.log('Saving model to backend...', file.name);
          try {
            await projectsApi.uploadProjectAsset(
              parseInt(projectId), 
              '3D_MODEL', 
              file, 
              'Sweet Home 3D Plan'
            );
            alert('Saved successfully!');
          } catch (e) {
            console.error('Failed to save SH3D model', e);
            alert('Failed to save to backend.');
          }
        }}
      />
    </div>
  );
}
