"use client";

import { useLoader } from '@react-three/fiber';
import { OBJLoader } from 'three-stdlib';

interface ObjModelProps {
  url: string;
}

export default function ObjModel({ url }: ObjModelProps) {
  const obj = useLoader(OBJLoader, url);
  return <primitive object={obj} dispose={null} />;
}
