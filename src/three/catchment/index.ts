import type { SceneModule } from '@onigam/lab-kit/three';
import type { RamState } from '../../sim/types';
import { placeholderScene } from '../placeholder';

// The `catchment` world: spring box and buffer tank (placeholder until the 3D role delivers it).
export const createCatchmentScene = (): SceneModule<RamState> => placeholderScene('catchment');
