import type { DrawingSheet } from '@onigam/lab-kit/drawings';
import { HYDRAULIC_SHEETS } from './hydraulic';
import { warmPerformanceData } from './hydraulic/model';
import { MECHANICAL_SHEETS } from './mechanical';

/**
 * Opening a sheet starts, in the idle time of the browser and after the sheet is drawn, the sweeps of the model that the
 * performance charts (D09) need: their first visit is the only one that would otherwise hold up the page.
 */
const warming = (s: DrawingSheet): DrawingSheet => ({
  ...s,
  render() {
    const d = s.render();
    warmPerformanceData();
    return d;
  },
});

/** Every drawing of the "Plans" mode, in reading order. */
export const SHEETS: DrawingSheet[] = [...MECHANICAL_SHEETS, ...HYDRAULIC_SHEETS].map(warming);
