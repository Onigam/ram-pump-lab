import * as THREE from 'three';
import { aimOnDraw, fitShadow, newFit, type CameraPose, type FitOptions } from '../shadow-fit';
import type { SkyRig } from './sky';
import type { Terrain } from './terrain';

// The sun's shadow map of the site follows what the camera looks at (see shadow-fit.ts): a box of 10 m half size at the ram,
// up to 320 m over the whole hillside, 0.55 times the distance to the ground the middle of the picture shows.

export const SITE_SHADOW: FitOptions = {
  near: 2,
  far: 600,
  growth: 1.06,
  halfPerMetre: 0.55,
  halfMin: 10,
  halfMax: 320,
  // five rows of three over the middle of the picture: a crest of the hills the view comes down over is met row by row
  rows: [-8, -4, 0, 4, 8],
  columns: [-10, 0, 10],
  // and each ray a fan of ±1 degree: a crest is passed over in 2 degrees of tilt
  soft: 1,
};

/**
 * Aim the sun's box at what the camera of each draw looks at. Returns `aim()`, which re-aims at the last camera seen (the scene
 * calls it in `update`, after the sun has moved with the hour); every draw re-aims at its own camera before the shadow pass.
 */
export function createShadowAim(scene: THREE.Scene, terrain: Terrain, sky: SkyRig): () => void {
  const pose: CameraPose = {
    position: new THREE.Vector3(-57, 58, 120),
    direction: new THREE.Vector3(85, -38, -190).normalize(),
    right: new THREE.Vector3(1, 0, 0),
    up: new THREE.Vector3(0, 1, 0),
  };
  pose.right.crossVectors(pose.direction, pose.up).normalize();
  pose.up.crossVectors(pose.right, pose.direction).normalize();
  const fit = newFit();
  const ground = (x: number, z: number) => terrain.surfaceY(x, z);
  const aim = () => {
    fitShadow(pose.position, pose.direction, pose.right, pose.up, ground, SITE_SHADOW, fit);
    sky.focusShadow(fit.focus, fit.half);
  };
  aimOnDraw(scene, pose, aim);
  return aim;
}
