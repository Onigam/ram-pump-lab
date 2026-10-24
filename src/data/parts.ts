import type { PartInfo } from '@onigam/lab-kit/content';
import { CATCHMENT_PARTS } from './parts/catchment';
import { RAM_PARTS } from './parts/ram';
import { SITE_PARTS } from './parts/site';
import { VALVE_PARTS } from './parts/valve';

// The parts catalogue: one entry per selectable 3D part, one file per world in ./parts (ids: src/part-ids.ts).
export const PARTS: PartInfo[] = [...SITE_PARTS, ...RAM_PARTS, ...VALVE_PARTS, ...CATCHMENT_PARTS];
