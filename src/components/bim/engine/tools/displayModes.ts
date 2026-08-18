import * as THREE from "three";
import { state } from "../core/state";
import { wakeRenderer } from "../core/viewer";

export function setDisplayMode(mode: "default" | "wireframe" | "xray" | "ghost" | "transparent" | "solid") {
  if (!state.currentModel) return;

  state.currentModel.traverse((child: any) => {
    if (child.isMesh && child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat: any) => {
        switch (mode) {
          case "wireframe":
            mat.wireframe = true;
            mat.transparent = false;
            mat.opacity = 1.0;
            break;
          case "xray":
          case "transparent":
            mat.wireframe = false;
            mat.transparent = true;
            mat.opacity = 0.35;
            mat.depthWrite = false;
            break;
          case "ghost":
            mat.wireframe = false;
            mat.transparent = true;
            mat.opacity = 0.15;
            mat.depthWrite = false;
            break;
          case "solid":
          case "default":
          default:
            mat.wireframe = false;
            mat.transparent = mat.opacity < 0.95;
            mat.depthWrite = !mat.transparent;
            break;
        }
        mat.needsUpdate = true;
      });
    }
  });

  wakeRenderer();
}
