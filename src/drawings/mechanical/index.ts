import type { DrawingSheet } from '@onigam/lab-kit/drawings';
import { makeBom } from './bom';
import { chamberSectionSheet } from './chamber-section';
import { generalArrangement } from './general-arrangement';
import { seatConeDetail } from './seat-detail';
import { wasteValveAssembly } from './valve-assembly';
import { wasteValveParts } from './valve-parts';

const DRAWN: DrawingSheet[] = [
  generalArrangement,
  wasteValveAssembly,
  wasteValveParts,
  seatConeDetail,
  chamberSectionSheet,
];

/** Mechanical sheets (groups `ram` and `valve`) in reading order: D01 … D06. */
export const MECHANICAL_SHEETS: DrawingSheet[] = [...DRAWN, makeBom(DRAWN)];
