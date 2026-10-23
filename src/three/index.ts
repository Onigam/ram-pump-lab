import type { SceneModule } from '@onigam/lab-kit/three';
import type { RamState } from '../sim/types';
import { placeholderScene } from './placeholder';

// The lab's two 3D worlds (see docs/research.md §4). Wave 2 replaces the placeholders.
export const createSiteScene = (): SceneModule<RamState> => placeholderScene('site');
export const createRamScene = (): SceneModule<RamState> => placeholderScene('ram');
