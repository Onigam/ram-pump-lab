import { PartRegistry } from '@onigam/lab-kit/three';
import type { SceneModule } from '@onigam/lab-kit/three';
import * as THREE from 'three';
import type { RamState } from '../sim/types';

/** Empty world so the lab compiles and mounts while the real scenes are being built (wave 2 replaces it). */
export function placeholderScene(id: string): SceneModule<RamState> {
  const scene = new THREE.Scene();
  scene.name = id;
  scene.background = new THREE.Color(0xece6da);
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x8d8273, 0.85));
  return {
    id,
    scene,
    registry: new PartRegistry(),
    hotspots: [],
    home: { position: new THREE.Vector3(3, 2, 3), target: new THREE.Vector3(0, 0.5, 0) },
    minDistance: 0.5,
    maxDistance: 50,
    update() {},
  };
}
