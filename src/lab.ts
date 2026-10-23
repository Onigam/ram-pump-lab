import { configureDrawings } from '@onigam/lab-kit/drawings';
import { strL } from '@onigam/lab-kit/i18n';
import { h, type AppContext, type LabDefinition } from '@onigam/lab-kit/ui';
import { ASSEMBLY } from './data/guide';
import { LESSONS } from './data/lessons';
import { PARTS } from './data/parts';
import { SHEETS } from './drawings';
import { num, t, type UiKey } from './i18n/ui';
import { SimPanel } from './panels/sim';
import { RamSim } from './sim/engine';
import type { AlarmKey } from './sim/types';
import { createDeviceScene } from './three/device';

// The lab described to the kit. Edit the content here and in src/data, src/three, src/sim, src/drawings;
// the kit supplies the whole application frame (see BRIEF.md: the frame is locked).

configureDrawings({ project: { fr: 'RAM PUMP LAB — dispositif', en: 'RAM PUMP LAB — device' } });

const SEVERE_ALARMS = new Set<AlarmKey>(['stalledTank', 'stalledStuck', 'noDelivery', 'valveOpen']);

/** Text of an alarm chip, with the figure that triggers it when there is one. */
function alarmLabel(sim: RamSim, key: AlarmKey): string {
  const s = sim.state;
  const text = t(`alarm_${key}` as UiKey);
  switch (key) {
    case 'pipeShort':
      return `${text} (L/h = ${num(s.lengthRatio, 1)})`;
    case 'headHigh':
      return `${text} (H/h = ${num(s.liftRatio, 1)})`;
    case 'tankLow':
      return `${text} (${num(Math.ceil(s.hoursToEmpty))} h)`;
    default:
      return text;
  }
}

export const lab: LabDefinition<RamSim> = {
  id: 'ram-pump-lab',
  brand: { title: 'RAM PUMP LAB', tagline: strL('tagline'), icon: './favicon.svg' },
  sim: new RamSim(),
  defaultScene: 'device',
  parts: PARTS,
  scenes: [
    {
      id: 'device',
      label: strL('sceneDevice'),
      module: createDeviceScene(),
      // text shown in the side panel while nothing is selected in this world
      overview: {
        title: { fr: 'Le dispositif', en: 'The device' },
        text: {
          fr: 'Un **volant** monté sur un **axe**, porté par un **socle** : cliquez une pièce pour l’étudier.',
          en: 'A **wheel** on an **axle**, carried by a **base**: click a part to study it.',
        },
      },
    },
  ],
  guides: { assembly: { scene: 'device', steps: ASSEMBLY } },
  lessons: { items: LESSONS, intro: strL('lessonsIntro') },
  plans: {
    sheets: SHEETS,
    groups: [{ id: 'device', label: strL('groupDevice') }],
    intro: strL('plansIntro'),
  },
  simPanel: (ctx: AppContext<RamSim>) => new SimPanel(ctx),
  strip: {
    values: (sim) => {
      const s = sim.state;
      return [
        { label: t('liveRate'), value: num(s.strokesPerMin), unit: t('unitPerMin') },
        { label: t('liveDeliveredStrip'), value: num(s.deliveredPerDay), unit: t('unitPerDay'), cls: 'live--water' },
        { label: t('liveEfficiency'), value: num(s.etaD * 100), unit: '%' },
        { label: t('liveTankStrip'), value: num(s.tankLevel * 100), unit: '%', cls: 'live--water' },
        { label: t('liveDriveStrip'), value: num(s.driveFlow, 1), unit: 'L/min' },
      ];
    },
    // the simulated time of day (the run starts at 08:00) and the day
    clock: (sim) => {
      const s = sim.state;
      const hour = Math.floor(s.hour);
      const minute = Math.floor((s.hour - hour) * 60);
      return {
        time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        sub: `${t('clockDay')} ${s.day + 1}`,
      };
    },
    alarms: (sim) =>
      sim.state.alarms.map((key) => ({
        key,
        label: alarmLabel(sim, key),
        severe: SEVERE_ALARMS.has(key),
      })),
  },
  about: () => [h('div', { class: 'callout callout--tip' }, h('span', {}, t('disclaimer')))],
};
