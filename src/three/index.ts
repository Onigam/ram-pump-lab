import type { SceneModule } from '@onigam/lab-kit/three';
import type { RamState } from '../sim/types';
import { createRamScene as ramScene } from './ram/scene';
import { createSiteScene as siteScene } from './site/scene';

// The lab's two 3D worlds (see docs/research.md §4).
export const createSiteScene = (): SceneModule<RamState> => siteScene();
export const createRamScene = (): SceneModule<RamState> => ramScene();
