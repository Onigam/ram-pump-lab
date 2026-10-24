import * as THREE from 'three';
import type { SceneModule, ViewOpts } from '@onigam/lab-kit/three';
import { RamSim } from '../sim/engine';
import type { RamState } from '../sim/types';

// Helpers of the 3D tests: view options, simulation states, bounding boxes of the registered parts.

export const view = (patch: Partial<ViewOpts> = {}): ViewOpts => ({
  slowMo: 1,
  cutaway: false,
  schematic: false,
  time: 1,
  ...patch,
});

export function runningState(steps = 400): RamState {
  const sim = new RamSim();
  sim.applyPreset('valve-1');
  for (let i = 0; i < steps; i++) sim.step(1 / 60);
  return { ...sim.state };
}

export function stalledState(): RamState {
  const sim = new RamSim();
  sim.applyPreset('valve-3');
  sim.set({ timeScale: 3600 });
  for (let i = 0; i < 60 * 40; i++) sim.step(1 / 60);
  return { ...sim.state };
}

export const sceneBoxes = (mod: SceneModule<RamState>): Map<string, THREE.Box3> => {
  mod.scene.updateMatrixWorld(true);
  const out = new Map<string, THREE.Box3>();
  for (const id of mod.registry.ids()) out.set(id, mod.registry.bounds(id));
  return out;
};

export const touches = (a: THREE.Box3, b: THREE.Box3, tol: number): boolean =>
  a.clone().expandByScalar(tol).intersectsBox(b);
