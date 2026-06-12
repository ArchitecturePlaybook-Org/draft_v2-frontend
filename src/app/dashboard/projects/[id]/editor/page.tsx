import React from 'react';
import { Metadata } from 'next';
import EditorClient from './EditorClient';

export const metadata: Metadata = {
  title: '3D Editor | Architecture Playbook',
  description: 'Sweet Home 3D Plan Editor',
};

export default function EditorPage() {
  // Using a fullscreen layout, so we hide standard dashboard headers/sidebars if possible.
  // Next.js app router allows doing this via a custom layout in the /editor folder, or using CSS overrides.
  // Assuming the main dashboard layout doesn't override absolute positioning if we break out.
  
  return <EditorClient />;
}
