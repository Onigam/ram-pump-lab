import { describe, expect, it, vi } from 'vitest';
import type { GuideStep, PartInfo } from '@onigam/lab-kit/content';
import type { L } from '@onigam/lab-kit/i18n';
import { PART_CATEGORIES, partIds } from '../part-ids';
import { RamSim } from '../sim/engine';
import { CATCHMENT, HOUSE, PIT, SITE, SPRING, TANK, TOWER } from '../three/dims';
import { INSTALL } from './install';
import { CATCHMENT_PARTS } from './parts/catchment';
import { DELIVERY_FILL, FIG, MODEL, SITE_PARTS } from './parts/site';
import { nEn, nFr } from './units';

// Same miniature of the kit's i18n module as in data.test.ts (the built module cannot be resolved by Node outside the
// bundler); the sheets only need `l`.
vi.mock('@onigam/lab-kit/i18n', () => ({
  l: (fr: string, en: string) => ({ fr, en }),
  registerStrings: () => undefined,
  tx: (key: string) => key,
  strL: (key: string) => ({ fr: key, en: key }),
  getLang: () => 'fr',
  colon: () => ' :',
}));

// Checks of the `site` (8) and `catchment` (9) sheets and of the installation guide (Data-B). The shared checks (frozen
// ids, parity, tags, timestamps) are in data.test.ts; these are the ones that belong to the site and catchment content.
//
// CONVENTION OF THE MAINTENANCE TAB (stated here, applied to the 17 sheets): ONE paragraph with three bold labels in this
// order, « **Panne à prévoir.** … **À vérifier.** … **Entretien.** » in French and « **Typical failure.** … **How to
// check.** … **Upkeep.** » in English: what typically goes wrong with the part, how a visitor can check it (look, listen,
// measure; never taste spring water), the routine upkeep. The other worlds may follow the same convention.

const SHEETS: PartInfo[] = [...SITE_PARTS, ...CATCHMENT_PARTS];
const VIDEO_SECONDS = 19 * 60 + 57;
/** The five status tags of part-helpers.ts, as written in French. */
const TAGS = ['(estimation)', '(dérivé)', '(résultat du modèle)', '(hypothèse du modèle)', '(calibré sur la vidéo)'];
const isL = (v: unknown): v is L => typeof v === 'object' && v !== null && 'fr' in v && 'en' in v;
const seconds = (ts: string): number => {
  const [m, s] = ts.split(':').map(Number);
  return (m ?? 0) * 60 + (s ?? 0);
};
const sentences = (text: string): number => text.split(/[.!?](?:\s|$)/).filter((s) => s.trim().length > 0).length;

/** Numbers of a text, normalised so that the French and English spellings compare equal (same rule as data.test.ts). */
function figures(text: string, lang: 'fr' | 'en'): string[] {
  let t = text.replace(/[−–]/g, '-');
  if (lang === 'fr') t = t.replace(/(\d) (\d{3})(?!\d)/g, '$1$2').replace(/(\d),(\d)/g, '$1.$2');
  else t = t.replace(/(\d),(\d{3})(?!\d)/g, '$1$2');
  return (t.match(/\d+(?:\.\d+)?/g) ?? []).sort();
}

/** Every bilingual text of a sheet, with a label for the failure message. */
function texts(p: PartInfo): [string, L][] {
  const out: [string, L][] = [
    ['name', p.name],
    ['short', p.short],
    ['description', p.description],
    ['material', p.material],
  ];
  for (const key of ['maintenance', 'tip', 'design'] as const) {
    const v = p[key];
    if (v) out.push([key, v]);
  }
  p.specs.forEach((s, i) => {
    out.push([`specs[${i}].label`, s.label]);
    if (isL(s.value)) out.push([`specs[${i}].value`, s.value]);
  });
  return out;
}

const value = (v: L | string, lang: 'fr' | 'en'): string => (isL(v) ? v[lang] : v);
const spec = (p: PartInfo, labelFr: string) => {
  const s = p.specs.find((x) => x.label.fr === labelFr);
  expect(s, `${p.id}: no spec « ${labelFr} »`).toBeDefined();
  return s!;
};
const sheet = (id: string): PartInfo => {
  const p = SHEETS.find((x) => x.id === id);
  expect(p, id).toBeDefined();
  return p!;
};

describe('site and catchment sheets: catalogue', () => {
  it('has the 8 site and the 9 catchment ids of the contract, each once, with the frozen world and category', () => {
    expect(SITE_PARTS.map((p) => p.id).sort()).toEqual([...partIds('site')].sort());
    expect(CATCHMENT_PARTS.map((p) => p.id).sort()).toEqual([...partIds('catchment')].sort());
    expect(SHEETS).toHaveLength(17);
    for (const p of SITE_PARTS) {
      expect(p.scene, p.id).toBe('site');
      expect(p.category, p.id).toBe(PART_CATEGORIES.site[p.id]);
    }
    for (const p of CATCHMENT_PARTS) {
      expect(p.scene, p.id).toBe('catchment');
      expect(p.category, p.id).toBe(PART_CATEGORIES.catchment[p.id]);
    }
  });

  it('has a non-empty French and English text everywhere, with a tip, a design note and a maintenance on every sheet', () => {
    for (const p of SHEETS) {
      expect(p.tip, `${p.id} tip`).toBeDefined();
      expect(p.design, `${p.id} design`).toBeDefined();
      expect(p.maintenance, `${p.id} maintenance`).toBeDefined();
      for (const [label, v] of texts(p)) {
        expect(v.fr.trim().length, `${p.id}.${label} fr`).toBeGreaterThan(0);
        expect(v.en.trim().length, `${p.id}.${label} en`).toBeGreaterThan(0);
        if (['short', 'description', 'maintenance', 'tip', 'design'].includes(label)) {
          expect(v.fr, `${p.id}.${label}`).not.toBe(v.en);
        }
      }
    }
  });

  it('keeps the descriptions to 2–5 sentences and the design notes to 1–3 (the kit asks for it)', () => {
    for (const p of SHEETS) {
      for (const lang of ['fr', 'en'] as const) {
        const d = sentences(p.description[lang]);
        expect(d, `${p.id} description ${lang}`).toBeGreaterThanOrEqual(2);
        expect(d, `${p.id} description ${lang}`).toBeLessThanOrEqual(5);
        const n = sentences(p.design![lang]);
        expect(n, `${p.id} design ${lang}`).toBeGreaterThanOrEqual(1);
        expect(n, `${p.id} design ${lang}`).toBeLessThanOrEqual(3);
      }
    }
  });

  it('has at least four specs per sheet, none empty', () => {
    for (const p of SHEETS) {
      expect(p.specs.length, p.id).toBeGreaterThanOrEqual(4);
      for (const s of p.specs) {
        expect(value(s.value, 'fr').trim().length, `${p.id} ${s.label.fr} fr`).toBeGreaterThan(0);
        expect(value(s.value, 'en').trim().length, `${p.id} ${s.label.fr} en`).toBeGreaterThan(0);
      }
    }
  });

  it('writes the same figures in French and in English everywhere', () => {
    for (const p of SHEETS) {
      for (const [label, v] of texts(p)) {
        expect(figures(v.fr, 'fr'), `${p.id}.${label}`).toEqual(figures(v.en, 'en'));
      }
    }
  });

  it('leaves no unfilled {placeholder}', () => {
    for (const p of SHEETS) {
      for (const [label, v] of texts(p)) expect(v.fr + v.en, `${p.id}.${label}`).not.toMatch(/[{}]/);
    }
    for (const s of INSTALL) {
      for (const text of [s.title, s.text, s.tip, s.warning, ...(s.tools ?? [])]) {
        if (text) expect(text.fr + text.en, s.id).not.toMatch(/[{}]/);
      }
    }
  });
});

describe('site and catchment sheets: what goes wrong and how to check it', () => {
  const FR = /^\*\*Panne à prévoir\.\*\* (.+) \*\*À vérifier\.\*\* (.+) \*\*Entretien\.\*\* (.+)$/s;
  const EN = /^\*\*Typical failure\.\*\* (.+) \*\*How to check\.\*\* (.+) \*\*Upkeep\.\*\* (.+)$/s;

  it('puts a typical failure, a way to check it and the upkeep in every maintenance tab, in that order', () => {
    for (const p of SHEETS) {
      for (const [re, lang] of [
        [FR, 'fr'],
        [EN, 'en'],
      ] as const) {
        const m = re.exec(p.maintenance![lang]);
        expect(m, `${p.id} maintenance ${lang}`).not.toBeNull();
        for (const part of [m![1], m![2], m![3]]) expect(part!.trim().length, `${p.id} ${lang}`).toBeGreaterThan(25);
      }
    }
  });

  it('never tells the visitor to taste spring water, and says so where the water is checked', () => {
    for (const p of SHEETS) {
      expect(p.maintenance!.fr + p.tip!.fr, p.id).not.toMatch(/goûtez-la|buvez|à boire sans/i);
    }
    for (const id of ['spring', 'spring-box', 'house']) {
      expect(sheet(id).maintenance!.fr, id).toMatch(/Ne (la )?goûtez pas/);
      expect(sheet(id).maintenance!.en, id).toMatch(/Do not taste/);
    }
    for (const id of ['spring', 'house']) {
      expect(sheet(id).maintenance!.fr, id).toMatch(/potable/);
      expect(sheet(id).maintenance!.en, id).toMatch(/potable/);
    }
  });

  it('gives a measurement a visitor can make for the parts whose failure empties the tank or stops the ram', () => {
    // bucket and stopwatch, a level, a gauge: the check names an instrument or a quantity
    const measured = [
      'spring',
      'buffer-tank',
      'waste-drain',
      'feed-pipe',
      'overflow-pipe',
      'tank-shell',
      'water-tower',
    ];
    for (const id of measured) {
      expect(sheet(id).maintenance!.fr, id).toMatch(/seau|chronom|niveau|manomètre|récipient/i);
      expect(sheet(id).maintenance!.en, id).toMatch(/bucket|stopwatch|level|gauge|container/i);
    }
  });
});

describe('site and catchment sheets: sources, estimates and honesty', () => {
  it('gives video timestamps as mm:ss within the 19:57 video, in order', () => {
    for (const p of SHEETS) {
      let previous = -1;
      for (const ts of p.video ?? []) {
        expect(ts, p.id).toMatch(/^\d{2}:[0-5]\d$/);
        expect(seconds(ts), `${p.id} ${ts}`).toBeLessThanOrEqual(VIDEO_SECONDS);
        expect(seconds(ts), `${p.id} ${ts} order`).toBeGreaterThan(previous);
        previous = seconds(ts);
      }
    }
  });

  it('has timestamps where the video shows or discusses the part, and none where it does not', () => {
    const inVideo = [
      'spring',
      'buffer-tank',
      'drive-pipe',
      'ram-pit',
      'delivery-pipe',
      'water-tower',
      'house',
      'tank-shell',
    ];
    for (const p of SHEETS) {
      if (inVideo.includes(p.id)) expect(p.video?.length ?? 0, p.id).toBeGreaterThan(0);
      else expect(p.video, `${p.id}: the video does not show it`).toBeUndefined();
    }
  });

  it('says in every catchment sheet what the video does not give, and where the practice comes from', () => {
    for (const p of CATCHMENT_PARTS) {
      expect(p.description.fr, p.id).toMatch(/vidéo/);
      expect(p.description.en, p.id).toMatch(/video/);
      expect(p.description.fr, p.id).toMatch(/pratique courante|Oxfam|Practical Action|estimation|modèle/);
      expect(p.description.en, p.id).toMatch(/common practice|Oxfam|Practical Action|estimate|model/);
    }
  });

  it('tags every figure that no source reports (estimate, derived, model result, assumption, calibrated)', () => {
    // figures that are reported by S1, S4 or by the source named in the value itself: the only ones without a tag
    const REPORTED_FR = new Set([
      '7,5 à 7,8 L/min',
      '10 L/min',
      '7,5 m',
      '65 m',
      '≈ 20 m',
      '≈ 300 m',
      '100 à 110 coups/min',
      '≈ 10 h avec le clapet n°3',
      '≈ 17 L/min (estimation de l’auteur)',
      '≈ 500 L/jour avec le clapet n°1',
      '≈ 500 L/jour, jugés suffisants',
      '≥ 5 × la chute (NC State) ; 3 à 7 × (Practical Action)',
      '≈ ½″ pour un bélier de 1″ (NC State)',
      'toute la source, 7,5 à 7,8 L/min',
      '≈ 0,62 L/s pour 20 à 50 cm de long et 5 cm de charge',
    ]);
    for (const p of SHEETS) {
      for (const s of p.specs) {
        const fr = value(s.value, 'fr');
        if (!/\d/.test(fr)) continue;
        const ok = TAGS.some((t) => fr.includes(t)) || REPORTED_FR.has(fr);
        expect(ok, `${p.id} « ${s.label.fr} » = ${fr}: neither tagged nor a reported figure`).toBe(true);
      }
    }
  });

  it('never calls an estimated dimension reported: the catchment world has no figure without a tag but the flows', () => {
    for (const p of CATCHMENT_PARTS) {
      for (const s of p.specs) {
        const fr = value(s.value, 'fr');
        if (/\d/.test(fr) && /\b(mm|cm|m|t)\b/.test(fr) && !/L\/(s|min)/.test(fr)) {
          expect(
            TAGS.some((t) => fr.includes(t)),
            `${p.id} ${s.label.fr} = ${fr}`,
          ).toBe(true);
        }
      }
    }
  });

  it('keeps the model results quoted in the texts equal to what the simulation gives', () => {
    const v1 = new RamSim('valve-1').averages;
    expect(v1.driveFlow).toBeCloseTo(MODEL.drive1, 1);
    expect(v1.wasteFlow).toBeCloseTo(MODEL.waste1, 1);
    expect(v1.deliveredFlow).toBeCloseTo(MODEL.delivered1, 2);
    expect(v1.strokesPerMin).toBeCloseTo(MODEL.strokes1, -1);
    expect(v1.peakPressure).toBeCloseTo(MODEL.peak1, 1);
    const sim3 = new RamSim('valve-3');
    expect(sim3.averages.driveFlow).toBeCloseTo(MODEL.drive3, 1);
    expect(sim3.averages.wasteFlow).toBeCloseTo(MODEL.waste3, 1);
    sim3.step(0.01);
    expect(sim3.state.hoursToEmpty).toBeCloseTo(MODEL.hours3, 0);
    const at30 = new RamSim('valve-1').sweep({ deliveryHead: 30 });
    expect(at30.driveFlow).toBeCloseTo(MODEL.drive30, 0);
    expect(at30.deliveredFlow).toBeCloseTo(MODEL.delivered30, 1);
    // the other model results written by hand in the texts
    expect(new RamSim('valve-1').sweep({ waterLogged: true }).peakPressure).toBeCloseTo(MODEL.peakWaterLogged, 1);
    expect(new RamSim('valve-1').sweep({ driveLength: 8 }).strokesPerMin).toBeCloseTo(259, -1);
    const dry = new RamSim('valve-1');
    dry.set({ sourceFlow: FIG.spring6[0] });
    dry.step(0.01);
    expect(dry.state.hoursToEmpty / 24).toBeCloseTo(FIG.days6[0], 0);
  });

  it('derives the quoted figures from their sources and from dims.ts', () => {
    expect(FIG.tankL[0]).toBe(TANK.volumeL);
    expect(FIG.tankL[0]).toBeCloseTo((FIG.drawN3[0] - FIG.source[0]) * FIG.hoursN3[0] * 60, 6);
    expect(FIG.fall[0]).toBe(SITE.fall);
    expect(FIG.driveLen[0]).toBe(SITE.driveLength);
    expect(FIG.lift[0]).toBe(SITE.deliveryHead);
    expect(FIG.deliveryLen[0]).toBe(SITE.deliveryLength);
    expect(FIG.source[0]).toBe(SITE.sourceFlowLpm);
    expect(Math.round((SITE.driveLength / SITE.fall) * 10) / 10).toBe(2.7); // « 2,7 fois la chute »
    expect(Math.round((SITE.deliveryHead / SITE.fall) * 10) / 10).toBe(8.7); // « 8,7 fois la chute »
    expect(DELIVERY_FILL).toEqual({ litres: 60, hours: 3 }); // 61.8 L at 500 L/day
    expect(FIG.tankRiseCm[0]).toBe(16);
    expect(FIG.tankHoursSpring[0]).toBe(12.7);
    expect(FIG.surplus1[0]).toBe(0.8);
    expect(FIG.margin1Pct[0]).toBe(11);
    expect(FIG.oxfamOverflowLpm[0]).toBe(37);
    expect(FIG.oxfamOverflowTimes[0]).toBe(5);
  });
});

describe('site and catchment sheets: dimensions are those of dims.ts', () => {
  // The expected texts are built here from the numbers of dims.ts, by another path than the helpers of the sheets, so a
  // wrong constant (the tank wall for its height) or a retyped value is caught.
  const mmOf = (m: number): number => Math.round(m * 1000);
  const est = (fr: string, en = fr): [string, string] => [`${fr} (estimation)`, `${en} (estimate)`];
  const der = (fr: string, en = fr): [string, string] => [`${fr} (dérivé)`, `${en} (derived)`];
  const tankSize = est(
    `Ø ${nFr(TANK.diameter, 1)} m × ${nFr(TANK.height, 0)} m`,
    `Ø ${nEn(TANK.diameter, 1)} m × ${nEn(TANK.height, 0)} m`,
  );
  const box3 = est(
    `${nFr(SPRING.basinLength, 1)} × ${nFr(SPRING.basinWidth, 1)} × ${nFr(SPRING.basinDepth, 2)} m`,
    `${nEn(SPRING.basinLength, 1)} × ${nEn(SPRING.basinWidth, 1)} × ${nEn(SPRING.basinDepth, 2)} m`,
  );

  it('quotes the dimensions of the 3D model, formatted in both languages', () => {
    const table: [string, string, [string, string]][] = [
      // [sheet, French label, [French value, English value]]
      ['buffer-tank', 'Cuve dessinée en 3D', tankSize],
      ['tank-shell', 'Dimensions intérieures', tankSize],
      ['tank-shell', 'Épaisseur de paroi', est(`${mmOf(TANK.wall)} mm`)],
      [
        'tank-shell',
        'Cerclage',
        est(
          `3 cercles d’acier galvanisé de ${mmOf(TANK.hoopWidth)} mm`,
          `3 galvanised steel hoops of ${mmOf(TANK.hoopWidth)} mm`,
        ),
      ],
      ['tank-shell', 'Départ de la conduite au-dessus du fond', est(`${mmOf(TANK.outletAboveFloor)} mm`)],
      ['tank-shell', 'Boue au fond (3D)', est(`${mmOf(CATCHMENT.sludgeDepth)} mm`)],
      ['tank-shell', 'Dalle sous la cuve', est(`${mmOf(TANK.slabThickness)} mm`)],
      ['tank-lid', 'Épaisseur du couvercle', est(`${mmOf(TANK.lidThickness)} mm`)],
      ['tank-lid', 'Débord sur la paroi', est(`${mmOf(TANK.lidOverhang)} mm`)],
      ['tank-lid', 'Vide d’air sous le couvercle', est(`${mmOf(TANK.freeboard)} mm`)],
      ['tank-lid', 'Trou d’homme', est(`Ø ${mmOf(CATCHMENT.manholeDiameter)} mm`)],
      [
        'tank-lid',
        'Aération',
        est(
          `tuyau Ø ${mmOf(CATCHMENT.ventDiameter)} mm, grillagé, col de cygne ${mmOf(CATCHMENT.ventRise)} mm au-dessus du couvercle`,
          `pipe Ø ${mmOf(CATCHMENT.ventDiameter)} mm, screened, goose-neck ${mmOf(CATCHMENT.ventRise)} mm above the lid`,
        ),
      ],
      [
        'overflow-pipe',
        'Niveau de déversement au-dessus du fond',
        est(`${nFr(TANK.height, 0)} m`, `${nEn(TANK.height, 0)} m`),
      ],
      ['overflow-pipe', 'Tuyau', est(`PVC Ø ${mmOf(CATCHMENT.overflowDiameter)} mm`)],
      [
        'overflow-pipe',
        'Bouche',
        est(
          `libre, ${mmOf(CATCHMENT.overflowDischargeHeight)} mm au-dessus du fond, au-dessus d’un caniveau`,
          `free, ${mmOf(CATCHMENT.overflowDischargeHeight)} mm above the floor level, over a gutter`,
        ),
      ],
      ['intake-screen', 'Hauteur au-dessus du fond', est(`${mmOf(TANK.outletAboveFloor)} mm`)],
      [
        'intake-screen',
        'Panier, diamètre × longueur',
        est(`${mmOf(CATCHMENT.screenDiameter)} × ${mmOf(CATCHMENT.screenLength)} mm`),
      ],
      ['intake-screen', 'Perforations', est(`Ø ${mmOf(CATCHMENT.screenHole)} mm`)],
      [
        'intake-screen',
        'Plaque anti-tourbillon',
        est(
          `Ø ${mmOf(CATCHMENT.vortexDiameter)} mm, à ${mmOf(CATCHMENT.vortexGap)} mm au-dessus du panier`,
          `Ø ${mmOf(CATCHMENT.vortexDiameter)} mm, ${mmOf(CATCHMENT.vortexGap)} mm above the basket`,
        ),
      ],
      [
        'drive-gate-valve',
        'Corps, longueur × diamètre',
        est(`${mmOf(CATCHMENT.gateBodyLength)} × ${mmOf(CATCHMENT.gateBodyDiameter)} mm`),
      ],
      ['drive-gate-valve', 'Tige au-dessus du chapeau, vanne ouverte', est(`${mmOf(CATCHMENT.gateStemRise)} mm`)],
      ['drive-gate-valve', 'Volant, diamètre', est(`${mmOf(CATCHMENT.gateWheelDiameter)} mm`)],
      ['drive-gate-valve', 'Départ à partir de la paroi', est(`${mmOf(TANK.outletLength)} mm`)],
      ['tank-drain', 'Tuyau', est(`PVC Ø ${mmOf(CATCHMENT.drainDiameter)} mm`)],
      ['tank-drain', 'Axe au-dessus du fond', est(`${mmOf(CATCHMENT.drainAxisHeight)} mm`)],
      ['tank-drain', 'Longueur de la vanne', est(`${mmOf(CATCHMENT.drainValveLength)} mm`)],
      ['spring-box', 'Bassin intérieur (3D)', box3],
      ['spring-box', 'Épaisseur des murs', est(`${mmOf(SPRING.basinWall)} mm`)],
      ['spring-box', 'Dalle de fond', est(`${mmOf(SPRING.boxFloor)} mm`)],
      ['spring-box', 'Margelle au-dessus du sol', est(`${mmOf(SPRING.boxRim)} mm`)],
      [
        'spring-box',
        'Trop-plein du regard',
        est(
          `tuyau Ø ${mmOf(CATCHMENT.boxOverflowDiameter)} mm à clapet anti-animaux, axe à ${mmOf(CATCHMENT.boxOverflowHeight)} mm du fond`,
          `pipe Ø ${mmOf(CATCHMENT.boxOverflowDiameter)} mm with an animal flap, axis ${mmOf(CATCHMENT.boxOverflowHeight)} mm above the floor`,
        ),
      ],
      [
        'spring-box',
        'Bouchon de vidange',
        est(
          `Ø ${mmOf(CATCHMENT.boxWashoutDiameter)} mm, dans le fond, sur chaîne`,
          `Ø ${mmOf(CATCHMENT.boxWashoutDiameter)} mm, in the floor, on a chain`,
        ),
      ],
      [
        'spring-box',
        'Orifices d’entrée',
        est(
          `${CATCHMENT.boxPortCount} × Ø ${mmOf(CATCHMENT.boxPortDiameter)} mm, à ${mmOf(CATCHMENT.boxPortHeight)} mm du fond`,
          `${CATCHMENT.boxPortCount} × Ø ${mmOf(CATCHMENT.boxPortDiameter)} mm, ${mmOf(CATCHMENT.boxPortHeight)} mm above the floor`,
        ),
      ],
      [
        'spring-box',
        'Sortie au-dessus du fond',
        der(
          `${mmOf(CATCHMENT.boxOutletHeight)} mm : le fond en dessous piège les sédiments`,
          `${mmOf(CATCHMENT.boxOutletHeight)} mm: the bottom below it traps the sediment`,
        ),
      ],
      [
        'spring-box',
        'Couvercle',
        est(
          `acier galvanisé, ${mmOf(CATCHMENT.boxLidThickness)} mm`,
          `galvanised steel, ${mmOf(CATCHMENT.boxLidThickness)} mm`,
        ),
      ],
      [
        'spring-box',
        'Aération',
        est(
          `tuyau Ø ${mmOf(CATCHMENT.boxVentDiameter)} mm, ${mmOf(CATCHMENT.boxVentRise)} mm au-dessus de la margelle`,
          `pipe Ø ${mmOf(CATCHMENT.boxVentDiameter)} mm, ${mmOf(CATCHMENT.boxVentRise)} mm above the rim`,
        ),
      ],
      [
        'gravel-filter',
        'Longueur × largeur (3D)',
        est(
          `${nFr(CATCHMENT.filterLength, 1)} × ${nFr(CATCHMENT.filterWidth, 1)} m`,
          `${nEn(CATCHMENT.filterLength, 1)} × ${nEn(CATCHMENT.filterWidth, 1)} m`,
        ),
      ],
      [
        'gravel-filter',
        'Grains, du côté roche au côté regard (3D)',
        est(
          `${mmOf(CATCHMENT.grainFine)}, ${mmOf(CATCHMENT.grainMedium)} puis ${mmOf(CATCHMENT.grainCoarse)} mm`,
          `${mmOf(CATCHMENT.grainFine)}, ${mmOf(CATCHMENT.grainMedium)} then ${mmOf(CATCHMENT.grainCoarse)} mm`,
        ),
      ],
      [
        'gravel-filter',
        'Part de la longueur de chaque zone (3D)',
        est(
          `${CATCHMENT.filterZones.map((z) => Math.round(z * 100)).join(' / ')} %`,
          `${CATCHMENT.filterZones.map((z) => Math.round(z * 100)).join(' / ')}%`,
        ),
      ],
      ['gravel-filter', 'Bordure de pierres', est(`${mmOf(CATCHMENT.filterKerb)} mm`)],
      ['feed-pipe', 'Tube', est(`${mmOf(SPRING.feedPipeDiameter)} × ${mmOf(CATCHMENT.feedPipeWall)} mm, PE`)],
      [
        'feed-pipe',
        'Longueur le long de la pente',
        est(`${nFr(SPRING.distanceToTank, 1)} m`, `${nEn(SPRING.distanceToTank, 1)} m`),
      ],
      ['feed-pipe', 'Pente', est(`${nFr(CATCHMENT.feedFall * 100)} %`, `${nEn(CATCHMENT.feedFall * 100)}%`)],
      ['feed-pipe', 'Extrémité au-dessus du trop-plein', der(`${mmOf(CATCHMENT.feedEnd - TANK.height)} mm`)],
      [
        'ram-pit',
        'Dimensions intérieures (3D)',
        est(
          `${nFr(PIT.innerLength, 1)} × ${nFr(PIT.innerWidth, 1)} m`,
          `${nEn(PIT.innerLength, 1)} × ${nEn(PIT.innerWidth, 1)} m`,
        ),
      ],
      ['ram-pit', 'Épaisseur des parois', est(`${mmOf(PIT.wall)} mm`)],
      ['ram-pit', 'Margelle au-dessus du sol', est(`${mmOf(PIT.curb)} mm`)],
      ['ram-pit', 'Épaisseur du couvercle', est(`${mmOf(PIT.lidThickness)} mm`)],
      ['ram-pit', 'Fond sous l’axe du bélier', est(`${mmOf(-PIT.floorY)} mm`)],
      [
        'waste-drain',
        'Diamètre traversant la paroi',
        est(`Ø ${mmOf(PIT.drainDiameter)} mm, vers l’aval`, `Ø ${mmOf(PIT.drainDiameter)} mm, downhill`),
      ],
      [
        'water-tower',
        'Cuve dessinée en 3D',
        est(
          `Ø ${nFr(TOWER.tankDiameter, 0)} m × ${nFr(TOWER.tankHeight, 0)} m`,
          `Ø ${nEn(TOWER.tankDiameter, 0)} m × ${nEn(TOWER.tankHeight, 0)} m`,
        ),
      ],
      ['water-tower', 'Hauteur du support', est(`${nFr(TOWER.standHeight, 0)} m`, `${nEn(TOWER.standHeight, 0)} m`)],
      [
        'water-tower',
        'Bout du tuyau au-dessus du couvercle',
        est(`${nFr(TOWER.pipeEndAboveLid, 2)} m`, `${nEn(TOWER.pipeEndAboveLid, 2)} m`),
      ],
      [
        'house',
        'Emprise (3D)',
        est(`${nFr(HOUSE.length, 0)} × ${nFr(HOUSE.width, 1)} m`, `${nEn(HOUSE.length, 0)} × ${nEn(HOUSE.width, 1)} m`),
      ],
      [
        'drive-pipe',
        'Diamètre intérieur',
        [
          `${mmOf(SITE.driveBore)} mm, bélier de 1″ (hypothèse du modèle)`,
          `${mmOf(SITE.driveBore)} mm, 1″ ram (model assumption)`,
        ],
      ],
      [
        'delivery-pipe',
        'Diamètre intérieur',
        der(
          `${nFr(SITE.deliveryBore * 1000, 1)} mm, soit 0,6 × la conduite motrice`,
          `${nEn(SITE.deliveryBore * 1000, 1)} mm, that is 0.6 × the drive pipe`,
        ),
      ],
    ];
    for (const [id, label, [fr, en]] of table) {
      const s = spec(sheet(id), label);
      expect(isL(s.value), `${id} ${label}`).toBe(true);
      expect(value(s.value, 'fr'), `${id} ${label} fr`).toBe(fr);
      expect(value(s.value, 'en'), `${id} ${label} en`).toBe(en);
    }
  });

  it('finds in dims.ts every number of an estimated spec of the catchment world (nothing is retyped from elsewhere)', () => {
    // a spec tagged « estimation » without « ≈ » (a computed value) gives a dimension of dims.ts, in mm, in m or as a count
    const dimsNumbers = new Set<number>();
    const collect = (o: unknown): void => {
      if (typeof o === 'number') {
        for (const n of [o, o * 1000, o * 100, o * 10]) dimsNumbers.add(Math.round(n * 100) / 100);
      } else if (Array.isArray(o)) o.forEach(collect);
      else if (o && typeof o === 'object') Object.values(o).forEach(collect);
    };
    collect([SITE, TANK, SPRING, CATCHMENT, PIT, TOWER, HOUSE]);
    collect([CATCHMENT.feedEnd - TANK.height, -PIT.floorY]);
    let checked = 0;
    for (const p of CATCHMENT_PARTS) {
      for (const s of p.specs) {
        const fr = value(s.value, 'fr');
        if (!fr.includes('(estimation)') || fr.includes('≈')) continue;
        const numbers = (fr.replace('(estimation)', '').match(/\d+(?:,\d+)?/g) ?? []).map((x) =>
          Number(x.replace(',', '.')),
        );
        for (const n of numbers) {
          expect(dimsNumbers.has(n), `${p.id} « ${s.label.fr} »: ${n} is not a value of dims.ts`).toBe(true);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(30);
  });

  it('grades the gravel bed as dims.ts does: fine near the rock, coarse near the box wall, in the sheet and in the guide', () => {
    expect(CATCHMENT.grainFine).toBeLessThan(CATCHMENT.grainMedium);
    expect(CATCHMENT.grainMedium).toBeLessThan(CATCHMENT.grainCoarse);
    const gravel = sheet('gravel-filter');
    for (const text of [gravel.description, gravel.tip!, sheet('spring-box').description]) {
      expect(text.fr).not.toMatch(/grossier côté roche|gros côté roche|du gros vers le fin/);
      expect(text.en).not.toMatch(/coarse on the rock side|from coarse to fine/);
    }
    const guide = INSTALL.find((x) => x.id === 'catch-spring')!;
    expect(guide.text.fr).toMatch(/fin près de la roche et gros contre le mur du regard/);
    expect(guide.text.en).toMatch(/fine near the rock and coarse against the box wall/);
    expect(guide.text.fr).not.toMatch(/grossier côté roche/);
  });

  it('has the same inner diameter of the drive pipe in the intake screen sheet as in the drive pipe sheet', () => {
    expect(value(spec(sheet('intake-screen'), 'Diamètre intérieur de la conduite').value, 'fr')).toBe(
      value(spec(sheet('drive-pipe'), 'Diamètre intérieur').value, 'fr'),
    );
  });

  it('keeps the tank dimensions consistent with the 5 700 L volume they were chosen for', () => {
    const volume = Math.PI * (TANK.diameter / 2) ** 2 * TANK.height * 1000;
    expect(Math.abs(volume / TANK.volumeL - 1)).toBeLessThan(0.01);
  });
});

describe('installation guide of the site and the catchment', () => {
  const worldOf = (s: GuideStep): string => s.scene ?? 'site';
  const all = (s: GuideStep, lang: 'fr' | 'en'): string =>
    [s.title[lang], s.text[lang], s.tip?.[lang] ?? '', s.warning?.[lang] ?? ''].join(' ');
  const step = (id: string): GuideStep => {
    const s = INSTALL.find((x) => x.id === id);
    expect(s, id).toBeDefined();
    return s!;
  };
  const indexOf = (partId: string): number => INSTALL.findIndex((s) => s.parts.includes(partId));

  it('has 9 to 13 steps that start and end in the site, with the catchment steps in one block in between', () => {
    expect(INSTALL.length).toBeGreaterThanOrEqual(9);
    expect(INSTALL.length).toBeLessThanOrEqual(13);
    expect(worldOf(INSTALL[0]!)).toBe('site');
    expect(worldOf(INSTALL[INSTALL.length - 1]!)).toBe('site');
    const catchment = INSTALL.map((s, i) => (worldOf(s) === 'catchment' ? i : -1)).filter((i) => i >= 0);
    expect(catchment.length).toBeGreaterThanOrEqual(3);
    expect(catchment.length).toBeLessThanOrEqual(5);
    expect(catchment[catchment.length - 1]! - catchment[0]! + 1, 'the catchment steps are contiguous').toBe(
      catchment.length,
    );
    expect(catchment[0]).toBeGreaterThan(0);
  });

  it('begins with a survey and ends with the first start, neither installing a part', () => {
    expect(INSTALL[0]!.id).toBe('survey');
    expect(INSTALL[0]!.parts).toEqual([]);
    expect(INSTALL[INSTALL.length - 1]!.id).toBe('first-start');
    expect(INSTALL[INSTALL.length - 1]!.parts).toEqual([]);
  });

  it('installs each of the 9 catchment parts exactly once, in a catchment step', () => {
    for (const id of partIds('catchment')) {
      const where = INSTALL.filter((s) => s.parts.includes(id));
      expect(where.length, `${id} installed ${where.length} times`).toBe(1);
      expect(worldOf(where[0]!), id).toBe('catchment');
    }
  });

  it('installs the site parts once each, except the spring, the buffer tank (the farm has them) and nothing else', () => {
    for (const id of partIds('site')) {
      const n = INSTALL.filter((s) => s.parts.includes(id)).length;
      if (['spring', 'buffer-tank'].includes(id)) expect(n, id).toBe(0);
      else expect(n, id).toBe(1);
    }
    const everything = INSTALL.flatMap((s) => s.parts);
    expect(new Set(everything).size).toBe(everything.length);
    expect(everything.length).toBe(9 + 6);
  });

  it('follows the order in which the work is done', () => {
    const before = (a: string, b: string) => expect(indexOf(a), `${a} before ${b}`).toBeLessThan(indexOf(b));
    before('spring-box', 'tank-shell'); // the box and its pipe, then the tank
    before('tank-shell', 'intake-screen'); // the wall fittings, then the outlet
    expect(indexOf('spring-box')).toBe(indexOf('feed-pipe'));
    expect(indexOf('spring-box')).toBe(indexOf('gravel-filter'));
    expect(indexOf('tank-shell')).toBe(indexOf('overflow-pipe'));
    expect(indexOf('tank-shell')).toBe(indexOf('tank-drain'));
    expect(indexOf('intake-screen')).toBe(indexOf('drive-gate-valve'));
    before('intake-screen', 'tank-lid'); // the lid closes the tank last
    before('tank-lid', 'drive-pipe');
    before('drive-pipe', 'waste-drain');
    before('waste-drain', 'ram-pit'); // the drain sets the level of the pit floor
    before('ram-pit', 'delivery-pipe');
    before('delivery-pipe', 'water-tower');
    expect(indexOf('water-tower')).toBe(indexOf('house'));
  });

  it('keeps the legal note, the potability note and the rigid-pipe warning', () => {
    const survey = step('survey');
    expect(survey.warning!.fr).toMatch(/DDT/);
    expect(survey.warning!.fr).toMatch(/OFB/);
    expect(survey.warning!.en).toMatch(/DDT/);
    expect(survey.warning!.en).toMatch(/OFB/);
    expect(survey.warning!.fr + survey.warning!.en).toMatch(/potable/);
    expect(step('catch-spring').warning!.fr).toMatch(/DDT/);
    const potable = INSTALL.filter((s) => /potable/.test(all(s, 'fr')) && /potable/.test(all(s, 'en')));
    expect(potable.length, 'steps that mention potability').toBeGreaterThanOrEqual(4);
    expect(step('drive-pipe').warning!.fr).toMatch(/rigide/);
    expect(step('drive-pipe').warning!.fr).toMatch(/plastique/i);
    expect(step('drive-pipe').warning!.en).toMatch(/Rigid/);
    expect(step('drive-pipe').warning!.en).toMatch(/plastic/i);
  });

  it('gives the first start real content: fill time, what to listen for, the manual restart, the tank level', () => {
    const s = step('first-start');
    const fr = s.text.fr;
    const en = s.text.en;
    // the delivery pipe volume and fill time of the model (derived from dims.ts and the 500 L/day of the video)
    expect(fr).toContain(`≈ ${nFr(DELIVERY_FILL.litres)} L`);
    expect(fr).toContain(`≈ ${nFr(DELIVERY_FILL.hours)} h`);
    expect(en).toContain(`≈ ${nEn(DELIVERY_FILL.litres)} L`);
    expect(en).toContain(`≈ ${nEn(DELIVERY_FILL.hours)} h`);
    // what to listen for: the strokes per minute of the video
    expect(fr).toMatch(/100 à 110 coups/);
    expect(en).toMatch(/100–110 strokes/);
    // the restart by hand: the video only says someone had to restart the ram, the gesture is marked as practice
    expect(fr).toMatch(/à la main/);
    expect(fr).toMatch(/pratique courante/);
    expect(en).toMatch(/by hand/);
    expect(en).toMatch(/common practice/);
    // the tank level to watch, with the model's figure
    expect(fr).toMatch(/niveau de la cuve/);
    expect(en).toMatch(/tank level/);
    expect(fr).toContain(`≈ ${nFr(FIG.drive30[0], FIG.drive30[1])} L/min`);
    expect(en).toContain(`≈ ${nEn(FIG.drive30[0], FIG.drive30[1])} L/min`);
    // the checklist when it stalls covers the catchment and the drain
    expect(s.tip!.fr).toMatch(/crépine/);
    expect(s.tip!.fr).toMatch(/évacuation/);
    expect(s.tip!.en).toMatch(/screen/);
    expect(s.tip!.en).toMatch(/drain/);
    // the safety lines the shared test also looks for
    expect(s.warning!.fr).toMatch(/Jamais un doigt/);
    expect(s.warning!.fr).toMatch(/côté refoulement/);
    expect(s.warning!.en).toMatch(/Never put a finger/);
    expect(s.warning!.en).toMatch(/delivery side/);
  });

  it('uses the same numbers in French and English in every text of every step', () => {
    for (const s of INSTALL) {
      const texts: [string, L | undefined][] = [
        ['title', s.title],
        ['text', s.text],
        ['tip', s.tip],
        ['warning', s.warning],
        ...(s.tools ?? []).map((t, i): [string, L] => [`tools[${i}]`, t]),
      ];
      for (const [label, v] of texts) {
        if (!v) continue;
        expect(v.fr.trim().length, `${s.id}.${label}`).toBeGreaterThan(0);
        expect(v.en.trim().length, `${s.id}.${label}`).toBeGreaterThan(0);
        expect(figures(v.fr, 'fr'), `${s.id}.${label}`).toEqual(figures(v.en, 'en'));
      }
    }
  });

  it('has a duration in hours or minutes, tools, a tip or a warning, and no torque', () => {
    for (const s of INSTALL) {
      expect(s.duration, s.id).toMatch(/^\d+ (min|h)$/);
      expect(s.torque, s.id).toBeUndefined();
      expect(s.tools?.length ?? 0, s.id).toBeGreaterThan(0);
      expect(Boolean(s.tip) || Boolean(s.warning), s.id).toBe(true);
    }
  });

  it('puts in bold the parts of the step, in both languages', () => {
    for (const s of INSTALL) {
      for (const lang of ['fr', 'en'] as const) {
        const n = (s.text[lang].match(/\*\*/g) ?? []).length;
        expect(n % 2, `${s.id} ${lang}`).toBe(0);
        if (s.parts.length > 0) expect(n / 2, `${s.id} ${lang}`).toBeGreaterThanOrEqual(s.parts.length - 1);
      }
    }
  });

  it('says in the catchment steps that the video does not show the work, and leaves no step without a source', () => {
    for (const s of INSTALL.filter((x) => worldOf(x) === 'catchment')) {
      expect(s.text.fr + (s.warning?.fr ?? ''), s.id).toMatch(/vidéo|pratique courante|Oxfam|dérivé/);
      expect(s.text.en + (s.warning?.en ?? ''), s.id).toMatch(/video|common practice|Oxfam|derived/);
    }
  });
});

describe('the private transcript', () => {
  // docs/transcript.md is git-ignored: when it is present on this machine, no run of six words of the site and
  // catchment sheets or of the installation guide may be copied from it (the captions are only used to check facts and to
  // find timestamps). Absent in CI: skipped.
  const files = import.meta.glob('../../docs/transcript.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
  const transcript = Object.values(files)[0];

  const words = (t: string): string[] =>
    t
      .toLowerCase()
      .replace(/\*\*/g, '')
      .replace(/’/g, "'")
      .replace(/[^a-zàâäçéèêëîïôöùûüÿœ0-9' ]+/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  const grams = (w: string[], n: number): string[] => {
    const out: string[] = [];
    for (let i = 0; i + n <= w.length; i++) out.push(w.slice(i, i + n).join(' '));
    return out;
  };

  it.skipIf(!transcript)('copies no six-word run of the video captions', () => {
    const body = transcript!.split('## Média24')[0]!.replace(/^\d\d:\d\d:\d\d /gm, '');
    const source = new Set(grams(words(body.replace(/\n/g, ' ')), 6));
    const found: [string, string][] = [];
    for (const p of SHEETS) for (const [label, v] of texts(p)) found.push([`${p.id}.${label}`, v.fr]);
    for (const st of INSTALL) {
      for (const [label, v] of [
        ['title', st.title],
        ['text', st.text],
        ['tip', st.tip],
        ['warning', st.warning],
        ...(st.tools ?? []).map((t, i): [string, L] => [`tools[${i}]`, t]),
      ] as [string, L | undefined][]) {
        if (v) found.push([`${st.id}.${label}`, v.fr]);
      }
    }
    expect(found.length).toBeGreaterThan(100);
    for (const [where, t] of found) {
      for (const g of grams(words(t), 6)) expect(source.has(g), `${where}: "${g}"`).toBe(false);
    }
  });
});
