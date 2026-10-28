import '@onigam/lab-kit/styles.css';
import { mountLab } from '@onigam/lab-kit/ui';
import { lab } from './lab';
import { panelPatches } from './panels/model';

mountLab(lab, {
  app: document.getElementById('app')!,
  viewport: document.getElementById('viewport')!,
  expose: import.meta.env.DEV, // window.__lab = { stage, engine, store } for debugging and tests
});

// the simulation panel's curves are solved in idle moments after the start, so they are ready when it opens
lab.sim.prefetch(panelPatches());
