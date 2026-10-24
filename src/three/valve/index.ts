import type { SceneModule } from '@onigam/lab-kit/three';
import type { RamState } from '../../sim/types';
import { placeholderScene } from '../placeholder';

// The `valve` world: the video's waste valve at workshop scale (placeholder until the 3D role delivers it).
export const createValveScene = (): SceneModule<RamState> => placeholderScene('valve');
