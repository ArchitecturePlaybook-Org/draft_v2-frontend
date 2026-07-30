"use client";

import React, { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { OBJLoader } from 'three-stdlib';
import * as THREE from 'three';

interface ObjModelProps {
  url: string;
}

export default function ObjModel({ url }: ObjModelProps) {
  const obj = useLoader(OBJLoader, url);

  const processedObj = useMemo(() => {
    if (!obj) return null;
    const clone = obj.clone(true);

    // Compute bounding box to center geometry to pivot point
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    clone.position.sub(center);

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.computeVertexNormals();
        }

        // Apply fallback standard material if missing or completely black
        if (!mesh.material || (Array.isArray(mesh.material) && mesh.material.length === 0)) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            roughness: 0.4,
            metalness: 0.2,
            side: THREE.DoubleSide,
          });
        } else if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map(m => {
            if (m) {
              m.side = THREE.DoubleSide;
              if ((m as any).color && (m as any).color.getHex() === 0x000000) {
                (m as any).color.setHex(0x94a3b8);
              }
            }
            return m;
          });
        } else if (mesh.material) {
          mesh.material.side = THREE.DoubleSide;
          if ((mesh.material as any).color && (mesh.material as any).color.getHex() === 0x000000) {
            (mesh.material as any).color.setHex(0x94a3b8);
          }
        }
      }
    });

    return clone;
  }, [obj]);

  if (!processedObj) return null;
  return <primitive object={processedObj} dispose={null} />;
}
