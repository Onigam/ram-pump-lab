import type { DrawingSheet } from '@onigam/lab-kit/drawings';
import { HYDRAULIC_SHEETS } from './hydraulic';
import { MECHANICAL_SHEETS } from './mechanical';

/** Every drawing of the "Plans" mode, in reading order. */
export const SHEETS: DrawingSheet[] = [...MECHANICAL_SHEETS, ...HYDRAULIC_SHEETS];
