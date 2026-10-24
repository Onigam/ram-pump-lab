import * as THREE from 'three';
import type { PartRegistry } from '@onigam/lab-kit/three';
import type { CutKit } from '../cut';

// What the part builders of the ram share: the registry (null for the unregistered instance standing in the site's
// pit), the section tool, the explode offsets and the handles the animation needs.

export interface Rig {
  /** Check valve disc and spring. */
  disc?: THREE.Object3D;
  spring?: THREE.Object3D;
  /** Gauge needle pivot. */
  needle?: THREE.Object3D;
  /** Snifter pin. */
  snifterPin?: THREE.Object3D;
  /** Water in the air chamber: the level plane (frame of the ram root) and the free surface disc. */
  levelPlane?: THREE.Plane;
  surface?: THREE.Mesh;
  /** Water volumes of the body, the check valve and the chamber (hidden while the model is exploded or incomplete). */
  water?: THREE.Group;
  /** Anchors of the hotspots, by part id. */
  anchors: Record<string, THREE.Object3D>;
  /** Interior of the air chamber (heights above the bottom of the straight shell). */
  chamberInner?: { yBottom: number; height: number; radiusAt(y: number): number };
}

export interface RamCtx {
  /** Root of the model: every registered part ends up here (or inside its parent assembly). */
  root: THREE.Group;
  reg: PartRegistry | null;
  cut: CutKit;
  rig: Rig;
  add(id: string, obj: THREE.Object3D, explode: THREE.Vector3 | [number, number, number]): THREE.Object3D;
  /** Hotspot anchor at a position of the part's frame. */
  anchor(id: string, parent: THREE.Object3D, x: number, y: number, z: number): THREE.Object3D;
}

export const v3 = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
