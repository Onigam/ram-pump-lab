import { describe, expect, it, vi } from 'vitest';
import type { GuideStep, PartInfo } from '@onigam/lab-kit/content';
import type { L } from '@onigam/lab-kit/i18n';
import { PART_CATEGORIES, partIds } from '../part-ids';
import { RamSim } from '../sim/engine';
import { WAVE_SPEED, minClosingVelocity } from '../sim/physics';
import { VALVE_SETTINGS } from '../sim/presets';
import { CHAMBER, CHECK_VALVE, FITTINGS, FOUNDATION, INLET, RAM, SITE, VALVE } from '../three/dims';
import { ASSEMBLY } from './assembly';
import { DERIVED, MODEL, RAM_PARTS } from './parts/ram';
import { VALVE_DERIVED, VALVE_PARTS } from './parts/valve';
import { mm, mmBox } from './units';

// The kit's built i18n module (dist/i18n/index.js) imports './lang' without an extension, which Node cannot resolve
// when vitest leaves node_modules outside the bundler. These tests only need `l`, so the module is replaced by the
// same faithful miniature as in data.test.ts.
vi.mock('@onigam/lab-kit/i18n', () => ({
  l: (fr: string, en: string) => ({ fr, en }),
  registerStrings: () => undefined,
  tx: (key: string) => key,
  strL: (key: string) => ({ fr: key, en: key }),
  getLang: () => 'fr',
  colon: () => ' :',
}));

// Content checks of the data-A role (wave 3a): the 27 sheets of the `ram` (13) and `valve` (14) worlds and the assembly
// guide. The lead's data.test.ts runs the common checks (frozen ids, FR/EN parity, tags) on the whole catalogue; here are
// the checks that belong to these two worlds.
//
// CONVENTION of `maintenance` (the kit renders **bold**), the same labels as the site and catchment sheets: « **Panne à
// prévoir.** … **À vérifier.** … **Entretien.** … » in French and « **Typical failure.** … **How to check.** …
// **Upkeep.** … » in English: the typical failure of the part, a check a visitor could do (listen, look, measure, feel),
// then the routine upkeep, in this order. Every sheet follows it.

const SHEETS: PartInfo[] = [...RAM_PARTS, ...VALVE_PARTS];
const RAM_IDS = partIds('ram');
const VALVE_IDS = partIds('valve');
const VIDEO_SECONDS = 19 * 60 + 57;

const isL = (v: unknown): v is L => typeof v === 'object' && v !== null && 'fr' in v && 'en' in v;
const seconds = (ts: string): number => {
  const [m, s] = ts.split(':').map(Number);
  return (m ?? 0) * 60 + (s ?? 0);
};

/** Numbers of a text, normalised so that the French and English spellings compare equal (7,5 / 7.5, 5 700 / 5,700). */
function figures(text: string, lang: 'fr' | 'en'): string[] {
  let t = text.replace(/[−–]/g, '-');
  if (lang === 'fr') t = t.replace(/(\d) (\d{3})(?!\d)/g, '$1$2').replace(/(\d),(\d)/g, '$1.$2');
  else t = t.replace(/(\d),(\d{3})(?!\d)/g, '$1$2');
  return (t.match(/\d+(?:\.\d+)?/g) ?? []).sort();
}

/** Number of sentences: a full stop, ? or ! followed by a space and a capital (decimals and "n°1." do not count). */
function sentences(text: string): number {
  const plain = text.replace(/\*\*/g, '');
  return plain.split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Þ«“])/).length;
}

function sheetTexts(p: PartInfo): [string, L][] {
  const out: [string, L][] = [
    ['name', p.name],
    ['short', p.short],
    ['description', p.description],
    ['material', p.material],
  ];
  if (p.maintenance) out.push(['maintenance', p.maintenance]);
  if (p.tip) out.push(['tip', p.tip]);
  if (p.design) out.push(['design', p.design]);
  p.specs.forEach((s, i) => {
    out.push([`specs[${i}].label`, s.label]);
    if (isL(s.value)) out.push([`specs[${i}].value`, s.value]);
  });
  return out;
}

function stepTexts(s: GuideStep): [string, L][] {
  const out: [string, L][] = [
    ['title', s.title],
    ['text', s.text],
  ];
  if (s.tip) out.push(['tip', s.tip]);
  if (s.warning) out.push(['warning', s.warning]);
  s.tools?.forEach((t, i) => out.push([`tools[${i}]`, t]));
  return out;
}

const specValue = (p: PartInfo, labelFr: string): L => {
  const spec = p.specs.find((s) => s.label.fr === labelFr);
  expect(spec, `${p.id}: no spec "${labelFr}"`).toBeDefined();
  const v = spec!.value;
  return isL(v) ? v : { fr: v, en: v };
};
const byId = (id: string): PartInfo => {
  const p = SHEETS.find((s) => s.id === id);
  expect(p, id).toBeDefined();
  return p!;
};

describe('the 27 sheets of the ram and valve worlds', () => {
  it('are exactly the frozen ids of the two worlds, each once, in the world and category of src/part-ids.ts', () => {
    expect(RAM_PARTS.map((p) => p.id).sort()).toEqual([...RAM_IDS].sort());
    expect(VALVE_PARTS.map((p) => p.id).sort()).toEqual([...VALVE_IDS].sort());
    expect(SHEETS.length).toBe(27);
    for (const p of RAM_PARTS) {
      expect(p.scene, p.id).toBe('ram');
      expect(p.category, p.id).toBe(PART_CATEGORIES.ram[p.id]);
    }
    for (const p of VALVE_PARTS) {
      expect(p.scene, p.id).toBe('valve');
      expect(p.category, p.id).toBe(PART_CATEGORIES.valve[p.id]);
    }
  });

  it('list the parts in the catalogue order of src/part-ids.ts, which is the physical order of the valve build', () => {
    expect(RAM_PARTS.map((p) => p.id)).toEqual(RAM_IDS);
    expect(VALVE_PARTS.map((p) => p.id)).toEqual(VALVE_IDS);
  });

  it('have a non-empty French and English text everywhere, different in the two languages', () => {
    for (const p of SHEETS) {
      expect(p.maintenance, `${p.id}: maintenance`).toBeDefined();
      expect(p.tip, `${p.id}: tip`).toBeDefined();
      expect(p.design, `${p.id}: design`).toBeDefined();
      for (const [label, v] of sheetTexts(p)) {
        expect(v.fr.trim().length, `${p.id}.${label} fr`).toBeGreaterThan(0);
        expect(v.en.trim().length, `${p.id}.${label} en`).toBeGreaterThan(0);
        if (['short', 'description', 'maintenance', 'tip', 'design'].includes(label)) {
          expect(v.fr, `${p.id}.${label}`).not.toBe(v.en);
        }
      }
    }
  });

  it('keep the same figures in French and English in every text', () => {
    for (const p of SHEETS) {
      for (const [label, v] of sheetTexts(p)) {
        expect(figures(v.fr, 'fr'), `${p.id}.${label}`).toEqual(figures(v.en, 'en'));
      }
    }
  });

  it('write the maintenance as « Panne / Contrôle / Entretien » in this order, each part with some substance', () => {
    const marks: Record<'fr' | 'en', [string, string, string]> = {
      fr: ['**Panne à prévoir.**', '**À vérifier.**', '**Entretien.**'],
      en: ['**Typical failure.**', '**How to check.**', '**Upkeep.**'],
    };
    for (const p of SHEETS) {
      for (const lang of ['fr', 'en'] as const) {
        const text = p.maintenance![lang];
        const at = marks[lang].map((m) => text.indexOf(m));
        expect(
          at.every((i) => i >= 0),
          `${p.id} ${lang}: missing a label in "${text.slice(0, 60)}…"`,
        ).toBe(true);
        expect(at[0], `${p.id} ${lang}: order`).toBe(0);
        expect(at[0]! < at[1]! && at[1]! < at[2]!, `${p.id} ${lang}: order`).toBe(true);
        expect(text.slice(at[0]!, at[1]!).length, `${p.id} ${lang}: failure too short`).toBeGreaterThan(50);
        expect(text.slice(at[1]!, at[2]!).length, `${p.id} ${lang}: check too short`).toBeGreaterThan(50);
        expect(text.slice(at[2]!).length, `${p.id} ${lang}: upkeep too short`).toBeGreaterThan(40);
        for (const m of marks[lang]) expect(text.split(m).length - 1, `${p.id} ${lang}: ${m} once`).toBe(1);
      }
    }
  });

  it('give a check a visitor can do: a verb of listening, looking, measuring or feeling', () => {
    const fr =
      /(écout|regard|compt|mesur|tâte|touche|pos(é|ez|e )|plac(é|ez)|roul|secou|essay|soulev|tapot|compar|glisse|passez|tracez|enroulez|fermez|ouvrez|faites|lisez|lisez)/i;
    const en =
      /(listen|look|watch|count|measure|feel|put|lay|roll|shake|try|lift|tap|compare|slide|pass|draw|wrap|close|open|make|hold|see|check)/i;
    for (const p of SHEETS) {
      const check = (lang: 'fr' | 'en') => {
        const t = p.maintenance![lang];
        const marks = lang === 'fr' ? ['**À vérifier.**', '**Entretien.**'] : ['**How to check.**', '**Upkeep.**'];
        return t.slice(t.indexOf(marks[0]!), t.indexOf(marks[1]!));
      };
      expect(check('fr'), p.id).toMatch(fr);
      expect(check('en'), p.id).toMatch(en);
    }
  });

  it('keep the design to one to three sentences and the overview to two to five', () => {
    const wrong: string[] = [];
    for (const p of SHEETS) {
      for (const lang of ['fr', 'en'] as const) {
        const d = sentences(p.design![lang]);
        if (d < 1 || d > 3) wrong.push(`${p.id} design ${lang}: ${d}`);
        const o = sentences(p.description[lang]);
        if (o < 2 || o > 5) wrong.push(`${p.id} description ${lang}: ${o}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('give video timestamps as sorted mm:ss within the 19:57 video, for the parts the video shows', () => {
    for (const p of SHEETS) {
      const ts = p.video ?? [];
      for (const t of ts) {
        expect(t, p.id).toMatch(/^\d{2}:[0-5]\d$/);
        expect(seconds(t), `${p.id} ${t}`).toBeLessThanOrEqual(VIDEO_SECONDS);
      }
      expect(ts, `${p.id}: sorted`).toEqual([...ts].sort((a, b) => seconds(a) - seconds(b)));
      expect(new Set(ts).size, `${p.id}: duplicates`).toBe(ts.length);
    }
    // the parts of the waste valve that the video builds and discusses all carry timestamps
    for (const id of VALVE_IDS) expect(byId(id).video?.length ?? 0, id).toBeGreaterThan(0);
    for (const id of ['waste-valve', 'ram', 'delivery-valve', 'air-chamber']) {
      expect(byId(id).video?.length ?? 0, id).toBeGreaterThan(0);
    }
    // the generic parts are not in the video: no timestamp that would pretend so
    for (const id of [
      'inlet-flange',
      'inlet-valve',
      'strainer',
      'snifter',
      'gauge',
      'delivery-union',
      'outlet-valve',
      'drain-valve',
      'foundation',
    ]) {
      expect(byId(id).video, id).toBeUndefined();
    }
  });

  it('have at least five specs with non-empty values, and the quantity of the stem sleeves', () => {
    for (const p of SHEETS) {
      expect(p.specs.length, p.id).toBeGreaterThanOrEqual(5);
      for (const s of p.specs) {
        const v = isL(s.value) ? s.value.fr + s.value.en : s.value;
        expect(v.trim().length, `${p.id} ${s.label.fr}`).toBeGreaterThan(0);
      }
    }
    expect(byId('stem-sleeves').qty).toBe(2);
    for (const p of SHEETS) if (p.id !== 'stem-sleeves') expect(p.qty, p.id).toBeUndefined();
  });

  it('tag every dimension of the 3D model as an estimate or a derived figure, in both languages', () => {
    for (const p of SHEETS) {
      for (const s of p.specs) {
        if (!/\(3D\)/.test(s.label.fr)) continue;
        expect(isL(s.value), `${p.id} ${s.label.fr}`).toBe(true);
        const v = s.value as L;
        expect(v.fr, `${p.id} ${s.label.fr}`).toMatch(/\((estimation|dérivé)\)/);
        expect(v.en, `${p.id} ${s.label.en}`).toMatch(/\((estimate|derived)\)/);
      }
    }
  });

  it('say which sheets stand on the video and which are the lab’s generic additions', () => {
    for (const id of [
      'inlet-flange',
      'inlet-valve',
      'strainer',
      'snifter',
      'gauge',
      'delivery-union',
      'outlet-valve',
      'drain-valve',
    ]) {
      const p = byId(id);
      expect(p.description.fr, id).toMatch(/pas montré(e)?s? dans la vidéo|ne (le |la |les )?montre pas/);
      expect(p.description.en, id).toMatch(/not shown in the video|does not show/);
    }
    const foundation = byId('foundation');
    expect(foundation.description.fr).toMatch(/ne montre pas/);
    expect(foundation.description.fr).toMatch(/sans valeur de dimensionnement/);
    expect(foundation.description.en).toMatch(/with no design value/);
  });

  it('say that the ram is generic, and keep the safety cues of the waste valve', () => {
    const ram = byId('ram');
    expect(ram.description.fr).toMatch(/générique/);
    expect(ram.description.en).toMatch(/generic/);
    const waste = byId('waste-valve');
    expect(waste.maintenance!.fr).toMatch(/jamais avec les doigts/);
    expect(waste.maintenance!.en).toMatch(/never with your fingers/);
    // the gauge is read on the delivery side and never removed under pressure
    expect(byId('gauge').maintenance!.fr).toMatch(/jamais (.* )?sous pression/);
    expect(byId('gauge').maintenance!.en).toMatch(/never remove it under pressure/i);
    // V2 purges the body only: the chamber keeps the column behind the check valve
    expect(byId('drain-valve').description.fr).toMatch(/ne la purge pas/);
    expect(byId('drain-valve').description.en).toMatch(/does not purge it/);
  });
});

describe('the dimensions quoted in the specs are those of dims.ts', () => {
  // Each row recomputes a spec value from dims.ts and looks for it in the sheet: the sheet and the 3D cannot drift apart.
  const rows: [string, string, () => { fr: string; en: string }][] = [
    [
      'ram',
      'Corps (tube coulé)',
      () => ({ fr: `Ø ${mm(RAM.bodyOuterRadius * 2).fr} extérieur`, en: `Ø ${mm(RAM.bodyOuterRadius * 2).en} outer` }),
    ],
    [
      'ram',
      'Corps (tube coulé)',
      () => ({ fr: `${mm(RAM.bodyLength).fr} mm de long`, en: `${mm(RAM.bodyLength).en} mm long` }),
    ],
    [
      'ram',
      'Brides d’extrémité',
      () => ({
        fr: `Ø ${mm(RAM.flangeDiameter).fr} × ${mm(RAM.flangeThickness).fr} mm`,
        en: `Ø ${mm(RAM.flangeDiameter).en} × ${mm(RAM.flangeThickness).en} mm`,
      }),
    ],
    [
      'ram',
      'Axes des piles (depuis la bride d’arrivée)',
      () => ({ fr: `cloche ${mm(RAM.xDelivery).fr} mm`, en: `chamber ${mm(RAM.xDelivery).en} mm` }),
    ],
    [
      'inlet-flange',
      'Bride soudée sur le tuyau',
      () => ({
        fr: `Ø ${mm(INLET.flangeDiameter).fr} × ${mm(INLET.flangeThickness).fr} mm`,
        en: `Ø ${mm(INLET.flangeDiameter).en} × ${mm(INLET.flangeThickness).en} mm`,
      }),
    ],
    [
      'inlet-flange',
      'Collet de soudure (3D)',
      () => ({ fr: `${mm(INLET.weldCollarHeight).fr} mm`, en: `${mm(INLET.weldCollarHeight).en} mm` }),
    ],
    [
      'inlet-flange',
      'Boulons',
      () => ({
        fr: `cercle de Ø ${mm(INLET.boltCircleRadius * 2).fr} mm, longueur ${mm(INLET.boltLength).fr} mm`,
        en: `circle of Ø ${mm(INLET.boltCircleRadius * 2).en} mm, length ${mm(INLET.boltLength).en} mm`,
      }),
    ],
    ['inlet-valve', 'Longueur', () => ({ fr: `${mm(INLET.valveLength).fr} mm`, en: `${mm(INLET.valveLength).en} mm` })],
    [
      'strainer',
      'Longueur (3D)',
      () => ({ fr: `${mm(INLET.strainerLength).fr} mm`, en: `${mm(INLET.strainerLength).en} mm` }),
    ],
    [
      'waste-valve',
      'Hauteur au-dessus de la platine',
      () => ({
        fr: `${mm(VALVE.guideTop + VALVE.counterweightLength + 2 * VALVE.nutThickness).fr} mm`,
        en: `${mm(VALVE.guideTop + VALVE.counterweightLength + 2 * VALVE.nutThickness).en} mm`,
      }),
    ],
    [
      'delivery-valve',
      'Corps (3D)',
      () => ({
        fr: `${mm(CHECK_VALVE.acrossFlats).fr} mm sur plats × ${mm(CHECK_VALVE.height).fr} mm`,
        en: `${mm(CHECK_VALVE.acrossFlats).en} mm across flats × ${mm(CHECK_VALVE.height).en} mm`,
      }),
    ],
    [
      'delivery-valve',
      'Alésage du siège (3D)',
      () => ({ fr: `${mm(CHECK_VALVE.seatBore).fr} mm`, en: `${mm(CHECK_VALVE.seatBore).en} mm` }),
    ],
    [
      'air-chamber',
      'Virole (3D)',
      () => ({
        fr: `Ø ${mm(CHAMBER.diameter).fr} × ${mm(CHAMBER.shellHeight).fr} mm`,
        en: `Ø ${mm(CHAMBER.diameter).en} × ${mm(CHAMBER.shellHeight).en} mm`,
      }),
    ],
    [
      'air-chamber',
      'Fonds bombés (3D)',
      () => ({ fr: `${mm(CHAMBER.domeHeight).fr} mm`, en: `${mm(CHAMBER.domeHeight).en} mm` }),
    ],
    [
      'snifter',
      'Pièce dessinée en 3D',
      () => ({
        fr: `Ø ${mm(FITTINGS.snifterDiameter).fr} × ${mm(FITTINGS.snifterHeight).fr} mm`,
        en: `Ø ${mm(FITTINGS.snifterDiameter).en} × ${mm(FITTINGS.snifterHeight).en} mm`,
      }),
    ],
    [
      'gauge',
      'Cadran (3D)',
      () => ({ fr: `${mm(FITTINGS.gaugeDiameter).fr} mm`, en: `${mm(FITTINGS.gaugeDiameter).en} mm` }),
    ],
    [
      'delivery-union',
      'Longueur (3D)',
      () => ({ fr: `${mm(FITTINGS.unionLength).fr} mm`, en: `${mm(FITTINGS.unionLength).en} mm` }),
    ],
    [
      'outlet-valve',
      'Longueur (3D)',
      () => ({ fr: `${mm(FITTINGS.smallBallValveLength).fr} mm`, en: `${mm(FITTINGS.smallBallValveLength).en} mm` }),
    ],
    [
      'drain-valve',
      'Longueur (3D)',
      () => ({ fr: `${mm(FITTINGS.smallBallValveLength).fr} mm`, en: `${mm(FITTINGS.smallBallValveLength).en} mm` }),
    ],
    [
      'foundation',
      'Plot (3D)',
      () => ({
        fr: `${mmBox(FOUNDATION.length, FOUNDATION.width, FOUNDATION.thickness).fr} mm`,
        en: `${mmBox(FOUNDATION.length, FOUNDATION.width, FOUNDATION.thickness).en} mm`,
      }),
    ],
    [
      'base-plate',
      'Plaque (3D)',
      () => ({
        fr: `${mmBox(VALVE.basePlateSide, VALVE.basePlateSide, VALVE.basePlateThickness).fr} mm`,
        en: `${mmBox(VALVE.basePlateSide, VALVE.basePlateSide, VALVE.basePlateThickness).en} mm`,
      }),
    ],
    [
      'base-plate',
      'Trous de fixation (3D)',
      () => ({
        fr: `Ø ${mm(VALVE.basePlateHoleDiameter).fr} mm, entraxe ${mm(VALVE.basePlateHoleSpacing).fr} mm`,
        en: `Ø ${mm(VALVE.basePlateHoleDiameter).en} mm, ${mm(VALVE.basePlateHoleSpacing).en} mm apart`,
      }),
    ],
    [
      'base-plate',
      'Passage central',
      () => ({ fr: `Ø ${mm(VALVE.basePlateBore).fr} mm`, en: `Ø ${mm(VALVE.basePlateBore).en} mm` }),
    ],
    [
      'valve-socket',
      'Extérieur (3D)',
      () => ({
        fr: `Ø ${mm(VALVE.weldedFittingDiameter).fr} × ${mm(VALVE.weldedFittingHeight).fr} mm`,
        en: `Ø ${mm(VALVE.weldedFittingDiameter).en} × ${mm(VALVE.weldedFittingHeight).en} mm`,
      }),
    ],
    [
      'valve-socket',
      'Alésage taraudé',
      () => ({ fr: `Ø ${mm(VALVE.socketBoreDiameter).fr} mm`, en: `Ø ${mm(VALVE.socketBoreDiameter).en} mm` }),
    ],
    [
      'valve-reducer',
      'Corps (3D)',
      () => ({ fr: `Ø ${mm(VALVE.reductionDiameter).fr} mm`, en: `Ø ${mm(VALVE.reductionDiameter).en} mm` }),
    ],
    [
      'valve-reducer',
      'Sommet au-dessus de la platine (3D)',
      () => ({ fr: `${mm(VALVE.reductionTop).fr} mm`, en: `${mm(VALVE.reductionTop).en} mm` }),
    ],
    [
      'valve-nipple',
      'Lumières (3D)',
      () => ({
        fr: `${VALVE.portCount} × ${mm(VALVE.portWidth).fr} × ${mm(VALVE.portHeight).fr} mm`,
        en: `${VALVE.portCount} × ${mm(VALVE.portWidth).en} × ${mm(VALVE.portHeight).en} mm`,
      }),
    ],
    [
      'valve-nipple',
      'Pied du mamelon au-dessus de la platine (3D)',
      () => ({ fr: `${mm(VALVE.nippleBottom).fr} mm`, en: `${mm(VALVE.nippleBottom).en} mm` }),
    ],
    [
      'valve-nipple',
      'Longueur',
      () => ({ fr: `${mm(VALVE.nippleLength).fr} mm dessinés`, en: `${mm(VALVE.nippleLength).en} mm drawn` }),
    ],
    [
      'valve-sleeve',
      'Extérieur (3D)',
      () => ({
        fr: `Ø ${mm(VALVE.sleeveDiameter).fr} × ${mm(VALVE.sleeveLength).fr} mm`,
        en: `Ø ${mm(VALVE.sleeveDiameter).en} × ${mm(VALVE.sleeveLength).en} mm`,
      }),
    ],
    [
      'valve-sleeve',
      'Pied du manchon au-dessus de la platine (3D)',
      () => ({ fr: `${mm(VALVE.sleeveBottom).fr} mm`, en: `${mm(VALVE.sleeveBottom).en} mm` }),
    ],
    [
      'valve-guide',
      'Tube (3D)',
      () => ({
        fr: `Ø ${mm(VALVE.guideTubeOuterDiameter).fr} extérieur, Ø ${mm(VALVE.guideTubeInnerDiameter).fr} intérieur`,
        en: `Ø ${mm(VALVE.guideTubeOuterDiameter).en} outer, Ø ${mm(VALVE.guideTubeInnerDiameter).en} inner`,
      }),
    ],
    [
      'valve-guide',
      'Collerette (3D)',
      () => ({ fr: `Ø ${mm(VALVE.guideCollarDiameter).fr} mm`, en: `Ø ${mm(VALVE.guideCollarDiameter).en} mm` }),
    ],
    [
      'valve-guide',
      'Longueur du tube (3D)',
      () => ({
        fr: `${mm(VALVE.guideTop - VALVE.guideTubeBottom).fr} mm`,
        en: `${mm(VALVE.guideTop - VALVE.guideTubeBottom).en} mm`,
      }),
    ],
    [
      'valve-guide',
      'Hauteur de la face d’appui du poids (3D)',
      () => ({ fr: `${mm(VALVE.guideTop).fr} mm`, en: `${mm(VALVE.guideTop).en} mm` }),
    ],
    [
      'valve-seat',
      'Épaisseur de l’anneau de portée (3D)',
      () => ({ fr: `${mm(VALVE.seatThickness).fr} mm`, en: `${mm(VALVE.seatThickness).en} mm` }),
    ],
    [
      'valve-head',
      'Tête (3D)',
      () => ({ fr: `Ø ${mm(VALVE.headDiameter).fr} mm`, en: `Ø ${mm(VALVE.headDiameter).en} mm` }),
    ],
    [
      'valve-head',
      'Hauteur du cône',
      () => ({ fr: `${mm(VALVE.headHeight).fr} mm`, en: `${mm(VALVE.headHeight).en} mm` }),
    ],
    [
      'valve-head',
      'Face plate, clapet fermé',
      () => ({ fr: `${mm(VALVE.headClosedY).fr} mm`, en: `${mm(VALVE.headClosedY).en} mm` }),
    ],
    [
      'valve-stem',
      'Tige filetée',
      () => ({ fr: `${mm(VALVE.rodDiameter).fr} mm`, en: `${mm(VALVE.rodDiameter).en} mm` }),
    ],
    [
      'valve-stem',
      'Dépassement au-dessus du contre-écrou (3D)',
      () => ({ fr: `${mm(VALVE.rodTailProud).fr} mm`, en: `${mm(VALVE.rodTailProud).en} mm` }),
    ],
    [
      'stem-sleeves',
      'Diamètre extérieur',
      () => ({ fr: `${mm(VALVE.stemSleeveDiameter).fr} mm`, en: `${mm(VALVE.stemSleeveDiameter).en} mm` }),
    ],
    [
      'stem-sleeves',
      'Alésage du guide à ajuster',
      () => ({ fr: `Ø ${mm(VALVE.guideTubeInnerDiameter).fr} mm`, en: `Ø ${mm(VALVE.guideTubeInnerDiameter).en} mm` }),
    ],
    [
      'stem-sleeves',
      'Longueur de chaque manchon (3D)',
      () => ({ fr: `${mm(VALVE.stemSleeveLength).fr} mm`, en: `${mm(VALVE.stemSleeveLength).en} mm` }),
    ],
    [
      'stem-sleeves',
      'Entraxe des manchons (3D)',
      () => ({ fr: `${mm(VALVE.stemSleeveSpacing).fr} mm`, en: `${mm(VALVE.stemSleeveSpacing).en} mm` }),
    ],
    [
      'valve-fins',
      'Encombrement (3D)',
      () => ({
        fr: `Ø ${mm(VALVE.finsDiameter).fr} × ${mm(VALVE.finsHeight).fr} mm`,
        en: `Ø ${mm(VALVE.finsDiameter).en} × ${mm(VALVE.finsHeight).en} mm`,
      }),
    ],
    [
      'counterweight',
      'Pièce dessinée en 3D',
      () => ({
        fr: `Ø ${mm(VALVE.counterweightDiameter).fr} × ${mm(VALVE.counterweightLength).fr} mm`,
        en: `Ø ${mm(VALVE.counterweightDiameter).en} × ${mm(VALVE.counterweightLength).en} mm`,
      }),
    ],
    [
      'stroke-nut',
      'Écrou (3D)',
      () => ({
        fr: `${mm(VALVE.nutAcrossFlats).fr} mm sur plats × ${mm(VALVE.nutThickness).fr} mm`,
        en: `${mm(VALVE.nutAcrossFlats).en} mm across flats × ${mm(VALVE.nutThickness).en} mm`,
      }),
    ],
    [
      'lock-nut',
      'Écrou (3D)',
      () => ({
        fr: `${mm(VALVE.nutAcrossFlats).fr} mm sur plats × ${mm(VALVE.nutThickness).fr} mm`,
        en: `${mm(VALVE.nutAcrossFlats).en} mm across flats × ${mm(VALVE.nutThickness).en} mm`,
      }),
    ],
  ];

  it.each(rows.map((r, i) => [`${r[0]} · ${r[1]} #${i}`, r] as const))('%s', (_name, [id, label, expected]) => {
    const v = specValue(byId(id), label);
    const e = expected();
    expect(v.fr, `${id} ${label}`).toContain(e.fr);
    expect(v.en, `${id} ${label}`).toContain(e.en);
  });

  it('quote in millimetres, in the 3D-labelled specs, only numbers that dims.ts holds (or that derive from it)', () => {
    // every leaf number of the dims sections used here, in millimetres, plus the derived values the sheets compute
    const allowed = new Set<number>();
    const add = (x: number) => allowed.add(Math.round(x * 1000 * 10) / 10);
    const walk = (o: unknown): void => {
      if (typeof o === 'number') add(o);
      else if (o && typeof o === 'object') Object.values(o).forEach(walk);
    };
    [RAM, INLET, VALVE, CHECK_VALVE, CHAMBER, FITTINGS, FOUNDATION, SITE].forEach(walk);
    add(RAM.bodyOuterRadius * 2);
    add(RAM.bodyInnerRadius * 2);
    add(INLET.boltCircleRadius * 2);
    add(VALVE.guideTop - VALVE.guideTubeBottom);
    add(VALVE.guideTop + VALVE.counterweightLength + 2 * VALVE.nutThickness);
    for (const p of SHEETS) {
      for (const s of p.specs) {
        if (!/\(3D\)|dessinée? en 3D|Plot|Passage central|Alésage taraudé|Bande de contact|Tuyau/.test(s.label.fr))
          continue;
        const v = isL(s.value) ? s.value : { fr: s.value, en: s.value };
        for (const [text, lang] of [
          [v.fr, 'fr'],
          [v.en, 'en'],
        ] as const) {
          const t =
            lang === 'fr'
              ? text.replace(/(\d),(\d)/g, '$1.$2').replace(/(\d) (\d{3})/g, '$1$2')
              : text.replace(/(\d),(\d{3})/g, '$1$2');
          for (const m of t.matchAll(/((?:\d+(?:\.\d+)?\s*×\s*)*\d+(?:\.\d+)?)\s*mm\b/g)) {
            for (const n of m[1]!.split('×').map((x) => parseFloat(x))) {
              // port/stud counts are not lengths: a lone integer before "×" at the start of a list is a count
              if (/^\d+\s*×/.test(m[1]!) && n === parseFloat(m[1]!.split('×')[0]!) && Number.isInteger(n) && n <= 4)
                continue;
              expect(
                allowed.has(Math.round(n * 10) / 10),
                `${p.id} ${s.label.fr} (${lang}): ${n} mm is not in dims.ts`,
              ).toBe(true);
            }
          }
        }
      }
    }
  });
});

describe('the model figures quoted in the sheets are those of the engine', () => {
  const run = (patch: Parameters<RamSim['sweep']>[0] = {}) => new RamSim('valve-1').sweep(patch);

  it('K10, K11 and the cycle of the n°1 valve (preset valve-1)', () => {
    const m = run();
    expect(Math.abs(m.strokesPerMin - MODEL.strokesPerMin)).toBeLessThan(1.5);
    expect(Math.abs(m.driveFlow - MODEL.driveFlow)).toBeLessThan(0.1);
    expect(Math.abs(m.wasteFlow - MODEL.wasteFlow)).toBeLessThan(0.1);
    expect(Math.abs(m.deliveredPerStroke - MODEL.mlPerStroke)).toBeLessThan(0.1);
    expect(Math.abs(m.closingVelocity - MODEL.closingVelocity)).toBeLessThan(0.03);
    expect(Math.abs(m.etaD - MODEL.etaD)).toBeLessThan(0.02);
    expect(Math.abs(m.peakPressure - MODEL.peakBar)).toBeLessThan(0.1);
    expect(Math.abs(-m.minPressure - MODEL.recoilDipBar)).toBeLessThan(0.03);
    expect(Math.abs(m.impactSpeed - MODEL.valveImpactSpeed)).toBeLessThan(0.03);
    expect(Math.abs(m.phaseShare[2] * 100 - MODEL.deliverSharePct)).toBeLessThan(1);
    expect(Math.round(m.deliveredFlow * 1440)).toBeGreaterThan(450);
    expect(Math.round(m.deliveredFlow * 1440)).toBeLessThan(550);
  });

  it('the calibrated stroke, weight and moving mass of the n°1 valve', () => {
    expect(VALVE_SETTINGS[1]).toEqual({ stroke: 2.2, counterweight: 360 });
    expect(DERIVED.movingMassKg).toBeCloseTo(0.42, 6);
    expect(DERIVED.curtainMm2).toBeCloseTo(103.7, 1);
    expect(DERIVED.seatAreaMm2).toBeCloseTo(176.7, 1);
  });

  it('the smallest closing velocity that opens the check valve (K15)', () => {
    expect(
      Math.abs(minClosingVelocity(SITE.fall, SITE.deliveryHead, WAVE_SPEED.steel) - MODEL.minClosingVelocity),
    ).toBeLessThan(0.03);
  });

  it('a water-logged chamber: harsher peak, less delivery', () => {
    const m = run({ waterLogged: true });
    expect(Math.abs(m.peakPressure - MODEL.loggedPeakBar)).toBeLessThan(0.15);
    const drop = (1 - m.deliveredFlow / run().deliveredFlow) * 100;
    expect(Math.abs(drop - MODEL.loggedDeliveryDropPct)).toBeLessThan(5);
  });

  it('the stroke sweep: no delivery at the minimum stroke, the whole spring at 2.3 mm, 3 mm drinks more', () => {
    const min = run({ stroke: MODEL.noDeliveryStroke });
    expect(min.deliveredFlow).toBeLessThan(0.005);
    expect(Math.abs(min.driveFlow - MODEL.minStrokeFlow)).toBeLessThan(0.15);
    const lim = run({ stroke: MODEL.springLimitStroke });
    expect(lim.driveFlow).toBeLessThan(7.5);
    expect(run({ stroke: MODEL.springLimitStroke + 0.1 }).driveFlow).toBeGreaterThan(7.5);
    const long = run({ stroke: 3 });
    expect(Math.abs(long.driveFlow - MODEL.longStrokeFlow)).toBeLessThan(0.3);
    expect(Math.abs(long.deliveredFlow * 1440 - MODEL.longStrokePerDay)).toBeLessThan(25);
  });

  it('the weight sweep: a light weight strikes fast and drinks little, a heavy one slowly and a lot', () => {
    const none = run({ counterweight: 0 });
    expect(Math.abs(none.strokesPerMin - MODEL.noWeightStrokes)).toBeLessThan(4);
    expect(Math.abs(none.driveFlow - MODEL.noWeightFlow)).toBeLessThan(0.15);
    expect(none.deliveredFlow).toBeLessThan(0.005);
    const light = run({ counterweight: 180 });
    expect(Math.abs(light.strokesPerMin - MODEL.lightWeightStrokes)).toBeLessThan(3);
    expect(Math.abs(light.driveFlow - MODEL.lightWeightFlow)).toBeLessThan(0.15);
    const heavy = run({ counterweight: 720 });
    expect(Math.abs(heavy.strokesPerMin - MODEL.heavyWeightStrokes)).toBeLessThan(2);
    expect(Math.abs(heavy.driveFlow - MODEL.heavyWeightFlow)).toBeLessThan(0.3);
    expect(Math.abs(heavy.deliveredFlow * 1440 - MODEL.heavyWeightPerDay)).toBeLessThan(25);
  });

  it('a PVC drive pipe delivers nothing (the rigid-pipe warning)', () => {
    expect(run({ pipeMaterial: 'pvc' }).deliveredFlow).toBeLessThan(0.005);
  });

  it('the derived numbers of the sheets agree with their formulas', () => {
    expect(DERIVED.inletBar).toBeCloseTo(0.736, 2);
    expect(DERIVED.deliveryBar).toBeCloseTo(6.38, 2);
    expect(DERIVED.strokesPerDay).toBe(157000);
    expect(DERIVED.pipeLitres).toBeCloseTo(61.8, 1);
    expect(DERIVED.pipeRefillHours).toBeGreaterThan(2.9);
    expect(DERIVED.pipeRefillHours).toBeLessThan(3.1); // « trois heures » in the texts
    expect(DERIVED.thrustKn).toBeCloseTo(0.373, 2);
    expect(DERIVED.holdForceN).toBeCloseTo(115, 0);
    expect(DERIVED.reopenBar).toBeCloseTo(0.233, 2);
    expect(DERIVED.chamberSwingBar).toBeLessThan(0.02);
    expect(DERIVED.portsMm2).toBeCloseTo(528, 6);
    expect(VALVE_DERIVED.portsRatio).toBeGreaterThan(2.9);
    expect(VALVE_DERIVED.portsRatio).toBeLessThan(3.1); // « trois fois » in the texts
    expect(VALVE_DERIVED.coneGain).toBeCloseTo(Math.SQRT2, 3);
    expect(VALVE_DERIVED.contactBand * 1000).toBeCloseTo(2.55, 1);
    expect(VALVE_DERIVED.fitGap * 1000).toBeCloseTo(0.1, 6); // « 0,1 mm » in the texts
    expect(VALVE_DERIVED.windowTurns).toBeCloseTo(0.8, 6);
    expect(VALVE_DERIVED.portShare).toBeGreaterThan(1 / 3); // « plus d’un tiers du pourtour »
    expect(VALVE_DERIVED.portShare).toBeLessThan(0.5);
    // the sleeve fit written in the texts is the guide bore minus 0.1 mm
    expect(VALVE.guideTubeInnerDiameter - VALVE.stemSleeveDiameter).toBeCloseTo(0.0001, 8);
  });
});

describe('the assembly guide', () => {
  const worldOf = (s: GuideStep): string => s.scene ?? 'valve';
  const installed = ASSEMBLY.flatMap((s) => s.parts);
  const firstRam = ASSEMBLY.findIndex((s) => worldOf(s) === 'ram');

  it('has 17 to 24 steps, starts in the valve world and plays in the valve and ram worlds only', () => {
    expect(ASSEMBLY.length).toBeGreaterThanOrEqual(17);
    expect(ASSEMBLY.length).toBeLessThanOrEqual(24);
    expect(worldOf(ASSEMBLY[0]!)).toBe('valve');
    for (const s of ASSEMBLY) expect(['valve', 'ram'], s.id).toContain(worldOf(s));
    expect(firstRam).toBeGreaterThan(0);
    // the valve is built first, then the ram: the worlds never interleave
    ASSEMBLY.forEach((s, i) => expect(worldOf(s), s.id).toBe(i < firstRam ? 'valve' : 'ram'));
  });

  it('installs the 14 valve ids and the 13 ram ids exactly once, each in the world of its step', () => {
    expect(installed.length).toBe(new Set(installed).size);
    expect([...installed].sort()).toEqual([...VALVE_IDS, ...RAM_IDS].sort());
    for (const s of ASSEMBLY) {
      for (const id of s.parts) {
        const sheet = byId(id);
        expect(sheet.scene, `${s.id}: ${id}`).toBe(worldOf(s));
      }
    }
  });

  it('builds the valve in the physical order of the 3D explode, then the ram from the foundation to the first start', () => {
    const valveOrder = ASSEMBLY.slice(0, firstRam).flatMap((s) => s.parts);
    expect(valveOrder).toEqual(VALVE_IDS);
    const ramOrder = ASSEMBLY.slice(firstRam).flatMap((s) => s.parts);
    expect(ramOrder[0]).toBe('foundation');
    expect(ramOrder[1]).toBe('ram');
    // the whole waste valve goes on the body after every other ram part, then the first start, which installs nothing
    expect(ramOrder[ramOrder.length - 1]).toBe('waste-valve');
    expect(ASSEMBLY[ASSEMBLY.length - 1]!.parts).toEqual([]);
    expect(ASSEMBLY[ASSEMBLY.length - 2]!.parts).toEqual(['waste-valve']);
    // the inlet line goes on the body from the body outwards: V1, strainer, then the drive pipe flange
    expect(ramOrder.indexOf('inlet-valve')).toBeLessThan(ramOrder.indexOf('strainer'));
    expect(ramOrder.indexOf('strainer')).toBeLessThan(ramOrder.indexOf('inlet-flange'));
    // the outlet valve comes before the union on the delivery line, and the gauge after the chamber it is screwed on
    expect(ramOrder.indexOf('outlet-valve')).toBeLessThan(ramOrder.indexOf('delivery-union'));
    expect(ramOrder.indexOf('air-chamber')).toBeLessThan(ramOrder.indexOf('gauge'));
    expect(ramOrder.indexOf('delivery-valve')).toBeLessThan(ramOrder.indexOf('air-chamber'));
  });

  it('has unique kebab-case ids and a non-empty French and English text everywhere, with the same figures', () => {
    expect(new Set(ASSEMBLY.map((s) => s.id)).size).toBe(ASSEMBLY.length);
    for (const s of ASSEMBLY) {
      expect(s.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      for (const [label, v] of stepTexts(s)) {
        expect(v.fr.trim().length, `${s.id}.${label} fr`).toBeGreaterThan(0);
        expect(v.en.trim().length, `${s.id}.${label} en`).toBeGreaterThan(0);
        if (label !== 'title') expect(v.fr, `${s.id}.${label}`).not.toBe(v.en);
        expect(figures(v.fr, 'fr'), `${s.id}.${label}`).toEqual(figures(v.en, 'en'));
      }
      expect((s.text.fr.match(/\*\*/g) ?? []).length % 2, `${s.id} fr bold`).toBe(0);
      expect((s.text.en.match(/\*\*/g) ?? []).length % 2, `${s.id} en bold`).toBe(0);
      if (s.parts.length > 0) {
        expect(s.text.fr, s.id).toMatch(/\*\*[^*]+\*\*/);
        expect(s.text.en, s.id).toMatch(/\*\*[^*]+\*\*/);
      }
      expect(s.tools?.length ?? 0, `${s.id}: tools`).toBeGreaterThan(0);
    }
  });

  it('gives an approximate duration like "30 min" or "4 h", never a torque, and keeps the weight’s hour from the video', () => {
    for (const s of ASSEMBLY) {
      expect(s.duration, s.id).toMatch(/^\d+ (min|h)$/);
      expect(s.torque, s.id).toBeUndefined();
      expect(`${s.text.fr} ${s.tip?.fr ?? ''} ${s.warning?.fr ?? ''}`, s.id).not.toMatch(/N·m|N\.m|\bNm\b/);
    }
    expect(ASSEMBLY.find((s) => s.id === 'weight')!.duration).toBe('1 h');
  });

  it('keeps the legal and safety cues in the right steps', () => {
    const step = (id: string): GuideStep => ASSEMBLY.find((s) => s.id === id)!;
    const all = (s: GuideStep, lang: 'fr' | 'en') =>
      `${s.text[lang]} ${s.tip?.[lang] ?? ''} ${s.warning?.[lang] ?? ''}`;
    // a finger in the waste valve: at the moment it goes on the ram and at the first start
    for (const id of ['waste-valve', 'first-start']) {
      expect(all(step(id), 'fr'), id).toMatch(/Jamais un doigt/);
      expect(all(step(id), 'en'), id).toMatch(/Never put a finger/);
    }
    // the gauge is on the delivery side and never removed under pressure
    expect(all(step('gauge'), 'fr')).toMatch(/côté refoulement/);
    expect(all(step('gauge'), 'en')).toMatch(/delivery side/);
    expect(step('gauge').warning!.fr).toMatch(/jamais le manomètre sous pression/);
    // a rigid drive pipe, in the step that connects it
    expect(step('inlet').warning!.fr).toMatch(/rigide/);
    expect(step('inlet').warning!.en).toMatch(/rigid/);
    // the union drains the pipe: stop the ram first
    expect(step('outlet').warning!.fr).toMatch(/arrêté le bélier/);
    expect(step('outlet').warning!.en).toMatch(/stopping the ram/);
    // the purge of the body leaves the chamber under pressure
    expect(step('drain').warning!.fr).toMatch(/cloche/);
    expect(step('drain').warning!.en).toMatch(/chamber/);
    // the welding step warns about the heat
    expect(step('socket').warning).toBeDefined();
    // the video's failures are told where a visitor could repeat them
    expect(all(step('head'), 'fr')).toMatch(/joint mort en 24 h/);
    expect(all(step('head'), 'fr')).toMatch(/de travers/);
    expect(all(step('weight'), 'fr')).toMatch(/gros écrous/);
    expect(all(step('stem'), 'fr')).toMatch(/0,1 mm|dixième de millimètre/);
    expect(all(step('stroke-nut'), 'fr')).toMatch(/poids qui joue le rôle d’écrou principal/);
  });

  it('has no placeholder text', () => {
    for (const s of ASSEMBLY) {
      for (const [label, v] of stepTexts(s)) {
        expect(v.fr + v.en, `${s.id}.${label}`).not.toMatch(/todo|tbd|lorem|xxx|placeholder/i);
      }
    }
  });
});

describe('the private transcript', () => {
  // docs/transcript.md is git-ignored: when it is present on this machine, no run of seven words of the sheets or the
  // guide may be copied from it (the captions are only used to check facts and find timestamps). Absent in CI: skipped.
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

  it.skipIf(!transcript)('copies no seven-word run of the video captions', () => {
    const body = transcript!.split('## Média24')[0]!.replace(/^\d\d:\d\d:\d\d /gm, '');
    const source = new Set(grams(words(body.replace(/\n/g, ' ')), 7));
    const texts: [string, string][] = [];
    for (const p of SHEETS) for (const [label, v] of sheetTexts(p)) texts.push([`${p.id}.${label}`, v.fr]);
    for (const s of ASSEMBLY) for (const [label, v] of stepTexts(s)) texts.push([`${s.id}.${label}`, v.fr]);
    const copied = texts.flatMap(([where, text]) =>
      grams(words(text), 7)
        .filter((g) => source.has(g))
        .map((g) => `${where}: "${g}"`),
    );
    expect(copied).toEqual([]);
  });
});
