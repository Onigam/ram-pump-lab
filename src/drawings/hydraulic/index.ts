import type { DrawingSheet } from '@onigam/lab-kit/drawings';
import { principleDiagram } from './d07-principle';
import { cycleDiagram } from './d08-cycle';
import { performanceChart } from './d09-performance';
import { sizingTable } from './d10-sizing';
import { sitePlan } from './d11-site-plan';
import { siteProfile } from './d12-site-profile';
import { catchmentLayout } from './d13-catchment';

/** Hydraulic and site sheets (groups `hydraulic` and `site`): diagrams, cycle, performance, sizing, plan, profile. */
export const HYDRAULIC_SHEETS: DrawingSheet[] = [
  principleDiagram,
  cycleDiagram,
  performanceChart,
  sizingTable,
  sitePlan,
  siteProfile,
  catchmentLayout,
];
