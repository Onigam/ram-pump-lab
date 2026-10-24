import type { PartInfo } from '@onigam/lab-kit/content';
import type { AppContext } from '@onigam/lab-kit/ui';
import type { RamSim } from './sim/engine';

/** Extra buttons on a part sheet ("test" actions that put the simulation in the state the part is about). */
export function partActions(_ctx: AppContext<RamSim>, _info: PartInfo): HTMLElement[] {
  return [];
}
