import { configureDrawings } from '@onigam/lab-kit/drawings';
import { strL } from '@onigam/lab-kit/i18n';
import { h, icon, ICONS, type AppContext, type LabDefinition } from '@onigam/lab-kit/ui';
import { ASSEMBLY } from './data/assembly';
import { CHAPTERS } from './data/chapters';
import { INSTALL } from './data/install';
import { PARTS } from './data/parts';
import { num, t, type UiKey } from './i18n/ui';
import { SimPanel } from './panels/sim';
import { RamSim } from './sim/engine';
import type { AlarmKey } from './sim/types';
import { createRamScene, createSiteScene } from './three';

// The lab described to the kit. Edit the content here and in src/data, src/three, src/sim, src/drawings;
// the kit supplies the whole application frame (see BRIEF.md: the frame is locked).

configureDrawings({ project: { fr: 'LABO DU BÉLIER HYDRAULIQUE', en: 'HYDRAULIC RAM LAB' } });

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

/** The "Sources" panel: notice, warnings, credits and links, chapters of the main video. */
function about(ctx: AppContext<RamSim>): HTMLElement[] {
  const fr = document.documentElement.lang !== 'en';
  const link = (href: string, label: string) => h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, label);
  const li = (href: string, label: string, note: string) => h('li', {}, link(href, label), ' — ', note);
  return [
    h('div', { class: 'callout callout--tip' }, h('span', {}, t('disclaimer'))),
    h('div', { class: 'callout callout--tip' }, h('span', {}, t('genericRam'))),
    h('div', { class: 'callout callout--warn' }, icon(ICONS.warn, 16), h('span', {}, t('safety'))),
    h('div', { class: 'callout callout--warn' }, icon(ICONS.warn, 16), h('span', {}, t('legal'))),
    h(
      'p',
      {},
      fr ? 'Source principale : ' : 'Main source: ',
      link(
        'https://www.youtube.com/watch?v=mc0gq5rObcM',
        '« Création clapet de choc pour que notre bélier hydraulique ne s’arrête plus »',
      ),
      fr
        ? ' — L’énergie partout (2024), qui remercie Didier Nebreda pour ses conseils sur les béliers. Aucune image de la vidéo n’est reprise.'
        : ' — L’énergie partout (2024), who thanks Didier Nebreda for his advice on rams. No footage from the video is reused.',
    ),
    h('h3', { class: 'section-title' }, t('chapters')),
    h(
      'ul',
      { class: 'chapters' },
      ...CHAPTERS.map(([ts, f, e]) => h('li', {}, link(ctx.videoUrl(ts), ts), ' ', fr ? f : e)),
    ),
    h(
      'ul',
      { class: 'links' },
      li(
        'https://www.youtube.com/watch?v=_6331LAYAA0',
        'Bernard Le Poder',
        fr
          ? 'un bélier de potager (5 m³ par jour à 15 m), trois clapets en 1″'
          : 'a vegetable-garden ram (5 m³ a day at 15 m), three 1″ valves',
      ),
      li(
        'https://www.youtube.com/watch?v=WMldjNyxNWk',
        'Média24',
        fr ? 'le principe, les pièces, l’invention' : 'the principle, the parts, the invention',
      ),
      li(
        'https://content.ces.ncsu.edu/hydraulic-ram-pumps',
        'NC State Extension',
        fr
          ? 'formule de refoulement, conduite motrice, tableau de dimensionnement'
          : 'delivery formula, drive pipe, sizing table',
      ),
      li(
        'https://fmc-nitk.vlabs.ac.in/exp/hydraulic-ram/theory.html',
        'NITK virtual labs',
        fr ? 'rendements d’Aubuisson et de Rankine' : 'D’Aubuisson and Rankine efficiencies',
      ),
      li(
        fr ? 'https://fr.wikipedia.org/wiki/B%C3%A9lier_hydraulique' : 'https://en.wikipedia.org/wiki/Hydraulic_ram',
        'Wikipedia',
        fr ? 'histoire et ordres de grandeur' : 'history and orders of magnitude',
      ),
    ),
    h('p', { class: 'hint' }, 'Three.js · TypeScript · Vite — MIT'),
  ];
}

export const lab: LabDefinition<RamSim> = {
  id: 'ram-pump-lab',
  brand: {
    title: { fr: 'LABO DU BÉLIER HYDRAULIQUE', en: 'HYDRAULIC RAM LAB' },
    tagline: strL('tagline'),
    icon: './favicon.svg',
  },
  sim: new RamSim(),
  defaultScene: 'site',
  video: { id: 'mc0gq5rObcM' },
  parts: PARTS,
  scenes: [
    {
      id: 'site',
      label: strL('sceneSite'),
      module: createSiteScene(),
      cutaway: false,
      xrayNeedsSelection: true,
      stepFrame: { padding: 1.5, minRadius: 4 },
      overview: {
        title: { fr: 'Un bélier hydraulique, à quoi ça sert ?', en: 'What is a hydraulic ram for?' },
        text: {
          fr: 'Un **bélier hydraulique** remonte l’eau d’une source jusqu’à une maison ou un potager situés bien plus haut, **sans électricité, sans carburant et sans moteur** : l’énergie vient de la chute de l’eau elle-même. Ici, l’installation d’une ferme : 7,5 m de chute, 65 m de dénivelé à remonter, environ 500 L d’eau par jour.\n\nSur cette page : le **site** et le **bélier** en 3D (éclaté, coupe, flux, rayons X), le **montage** pièce par pièce, le guide d’**installation**, la **simulation** (clapet, course, débit de la source, hauteur) et le **catalogue** des pièces, avec ses **sources**.',
          en: 'A **hydraulic ram** lifts spring water to a house or a vegetable garden much higher up, **with no electricity, no fuel and no motor**: the energy comes from the falling water itself. Here, a farm installation: 7.5 m of fall, 65 m of lift, about 500 L of water a day.\n\nOn this page: the **site** and the **ram** in 3D (explode, section, flows, X-ray), the part-by-part **assembly**, the **installation** guide, the **simulation** (valve, stroke, spring flow, head) and the **parts catalogue**, with its **sources**.',
        },
        actions: [{ label: strL('goRam'), scene: 'ram', primary: true }],
      },
    },
    {
      id: 'ram',
      label: strL('sceneRam'),
      module: createRamScene(),
      partPadding: 2.2,
      stepFrame: { padding: 1.6, minRadius: 0.07 },
      // the shells that X-ray makes transparent while nothing is selected, so the valves and the water show
      xrayShell: (id) => ['ram', 'air-chamber', 'base-plate', 'waste-valve'].includes(id),
      overview: {
        title: { fr: 'Le bélier hydraulique', en: 'The hydraulic ram' },
        text: {
          fr: 'Un **clapet de choc** qui claque, un **clapet anti-retour**, une **cloche à air** : l’eau de la conduite motrice, stoppée net, pousse une petite partie d’elle-même beaucoup plus haut. Lancez la simulation pour voir le cycle.',
          en: 'A **waste valve** that slams shut, a **delivery check valve**, an **air chamber**: water in the drive pipe, stopped dead, pushes a small part of itself much higher. Run the simulation to watch the cycle.',
        },
        actions: [{ label: strL('goSite'), scene: 'site' }],
      },
    },
  ],
  partLinks: {
    'ram-pit': { scene: 'ram', label: strL('goRam') },
  },
  guides: {
    assembly: { scene: 'ram', steps: ASSEMBLY },
    install: { scene: 'site', steps: INSTALL },
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
  about,
};
