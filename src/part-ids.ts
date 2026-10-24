// The frozen part ids of every world, with their category (docs/research.md §4 and §11). THE CONTRACT between the roles:
// the catalogue (src/data/parts/*), the 3D registries (src/three/*), the guides, the lessons and the drawings all use
// these ids. Only the lead edits this file; a role that thinks an id is missing or wrong reports it, it never adds one.
import type { PartCategory } from '@onigam/lab-kit/content';

export type WorldId = 'site' | 'catchment' | 'ram' | 'valve';

export const PART_CATEGORIES: Record<WorldId, Record<string, PartCategory>> = {
  // the farm: spring, tank, pipes, ram pit, tower, house
  site: {
    spring: 'site',
    'buffer-tank': 'hydraulic',
    'drive-pipe': 'hydraulic',
    'ram-pit': 'structure',
    'waste-drain': 'hydraulic',
    'delivery-pipe': 'hydraulic',
    'water-tower': 'structure',
    house: 'site',
  },
  // detail of the spring box and the buffer tank (reached from `spring` and `buffer-tank`)
  catchment: {
    'spring-box': 'structure',
    'gravel-filter': 'hydraulic',
    'feed-pipe': 'hydraulic',
    'tank-shell': 'structure',
    'tank-lid': 'structure',
    'overflow-pipe': 'hydraulic',
    'intake-screen': 'hydraulic',
    'drive-gate-valve': 'hydraulic',
    'tank-drain': 'hydraulic',
  },
  // the generic 1" ram; `waste-valve` is the whole waste valve, detailed in the `valve` world
  ram: {
    ram: 'hydraulic',
    'inlet-flange': 'hydraulic',
    'inlet-valve': 'hydraulic',
    strainer: 'hydraulic',
    'waste-valve': 'hydraulic',
    'delivery-valve': 'hydraulic',
    'air-chamber': 'hydraulic',
    snifter: 'hydraulic',
    gauge: 'hydraulic',
    'delivery-union': 'hydraulic',
    'outlet-valve': 'hydraulic',
    'drain-valve': 'hydraulic',
    foundation: 'structure',
  },
  // the video's waste valve at workshop scale (reached from `waste-valve`)
  valve: {
    'base-plate': 'structure',
    'valve-socket': 'mechanical',
    'valve-reducer': 'mechanical',
    'valve-nipple': 'hydraulic',
    'valve-sleeve': 'mechanical',
    'valve-seat': 'mechanical',
    'valve-head': 'mechanical',
    'valve-stem': 'mechanical',
    'stem-sleeves': 'mechanical',
    'valve-guide': 'mechanical',
    'valve-fins': 'mechanical',
    counterweight: 'mechanical',
    'stroke-nut': 'mechanical',
    'lock-nut': 'mechanical',
  },
};

export const WORLDS = Object.keys(PART_CATEGORIES) as WorldId[];

/** Ids of one world, in catalogue order. */
export const partIds = (world: WorldId): string[] => Object.keys(PART_CATEGORIES[world]);

/** World that owns an id. */
export const worldOf = (id: string): WorldId | undefined => WORLDS.find((w) => id in PART_CATEGORIES[w]);
