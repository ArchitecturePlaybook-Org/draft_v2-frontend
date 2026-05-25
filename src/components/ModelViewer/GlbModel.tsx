"use client";

import { useGLTF } from '@react-three/drei';

interface GlbModelProps {
  url: string;
}

export default function GlbModel({ url }: GlbModelProps) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}
