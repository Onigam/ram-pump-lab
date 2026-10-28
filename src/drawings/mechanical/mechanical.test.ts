import { beforeAll, describe, expect, it, vi } from 'vitest';
import { setLang, tr } from '@onigam/lab-kit/i18n';
import dimsSource from '../../three/dims.ts?raw';
import { PARTS } from '../../data/parts';
import { MODEL, DERIVED } from '../../data/parts/ram';
import { VALVE_DERIVED } from '../../data/parts/valve';
import { STROKE, WEIGHT } from '../../data/part-helpers';
import { partIds, worldOf } from '../../part-ids';
import { AIR_FRACTION_NOMINAL } from '../../sim/physics';
import * as DIMS from '../../three/dims';
import { createRamModel } from '../../three/ram/model';
import * as G from '../../three/valve/geo';
import { MECHANICAL_SHEETS } from './index';
import { fakeDocument, FakeXMLSerializer, textBoxes, textExtent } from './test-dom';
import { CH_MM, CONE_TOP, FINS_BOTTOM, NECK_BOTTOM, ROD_BOTTOM, STATUS, V, chamberSection, k, mm, stack } from './geom';
import { ITEM } from './draw';

// The six mechanical sheets by script: frozen ids, numbers, groups and worlds, a render in both languages with no NaN and no
// text on text, the bill of materials against the catalogue, quoted dimensions against dims.ts, the status marks against the
// JSDoc of dims.ts, and the geometry against the 3D builders.

const EXPECTED = [
  { id: 'general-arrangement', number: 'D01', group: 'ram', scene: 'ram' },
  { id: 'waste-valve-assembly', number: 'D02', group: 'valve', scene: 'valve' },
  { id: 'waste-valve-parts', number: 'D03', group: 'valve', scene: 'valve' },
  { id: 'seat-cone-detail', number: 'D04', group: 'valve', scene: 'valve' },
  { id: 'chamber-section', number: 'D05', group: 'ram', scene: 'ram' },
  { id: 'bom', number: 'D06', group: 'ram', scene: 'ram' },
] as const;

type Lang = 'fr' | 'en';
const svgs: Record<Lang, Record<string, string>> = { fr: {}, en: {} };

beforeAll(() => {
  vi.stubGlobal('document', fakeDocument);
  vi.stubGlobal('XMLSerializer', FakeXMLSerializer);
  for (const lang of ['fr', 'en'] as const) {
    setLang(lang);
    for (const s of MECHANICAL_SHEETS) svgs[lang][s.id] = s.render().serialize();
  }
  setLang('fr');
});

const texts = (lang: Lang, id: string): string[] => textBoxes(svgs[lang][id]!).map((t) => t.content);

describe('the six sheets', () => {
  it('exist in reading order with the frozen ids, numbers, groups and worlds', () => {
    expect(MECHANICAL_SHEETS.map((s) => ({ id: s.id, number: s.number, group: s.group, scene: s.scene }))).toEqual(
      EXPECTED.map((e) => ({ ...e })),
    );
  });

  it('show only frozen ids of their own world', () => {
    for (const s of MECHANICAL_SHEETS) {
      expect(s.parts?.length, s.id).toBeGreaterThan(0);
      expect(new Set(s.parts).size, `${s.id} lists a part twice`).toBe(s.parts!.length);
      for (const id of s.parts!) expect(worldOf(id), `${s.id}: ${id}`).toBe(s.scene);
    }
  });

  it('have a title and a 2-4 sentence description, different in French and in English', () => {
    for (const s of MECHANICAL_SHEETS) {
      expect(s.title.fr.length, s.id).toBeGreaterThan(5);
      expect(s.title.en.length, s.id).toBeGreaterThan(5);
      expect(s.title.fr, s.id).not.toBe(s.title.en);
      expect(s.description.fr, s.id).not.toBe(s.description.en);
      for (const lang of ['fr', 'en'] as const) {
        const sentences = s.description[lang].split(/(?<=[.!?])\s+/).filter(Boolean);
        expect(sentences.length, `${s.id} ${lang}`).toBeGreaterThanOrEqual(2);
        expect(sentences.length, `${s.id} ${lang}`).toBeLessThanOrEqual(4);
      }
    }
  });

  it('write numbers the way of each language: decimal comma in French, decimal point in English', () => {
    for (const s of MECHANICAL_SHEETS) {
      const en = texts('en', s.id).filter((t) => !/^D\d\d$/.test(t));
      const fr = texts('fr', s.id);
      expect(
        en.filter((t) => /\d,\d{1,2}(?!\d)/.test(t)),
        `${s.id} en`,
      ).toEqual([]);
      expect(
        fr.filter((t) => /\d\.\d/.test(t) && !/\d{4}-\d{2}-\d{2}/.test(t)),
        `${s.id} fr`,
      ).toEqual([]);
    }
  });

  it('keep the scale of the title block short enough for its cell', () => {
    for (const s of MECHANICAL_SHEETS) {
      const m = /<text[^>]*>([^<]*)<\/text>/g;
      const scale = [...svgs.fr[s.id]!.matchAll(m)].map((x) => x[1]!).find((_t, i, all) => all[i - 1] === 'Échelle');
      expect(scale, s.id).toBeDefined();
      expect(scale!.length, s.id).toBeLessThanOrEqual(11);
    }
  });

  it('render in both languages without NaN, Infinity, undefined or empty text', () => {
    for (const lang of ['fr', 'en'] as const) {
      for (const s of MECHANICAL_SHEETS) {
        const svg = svgs[lang][s.id]!;
        expect(svg.length, `${s.id} ${lang}`).toBeGreaterThan(20000);
        expect(svg, `${s.id} ${lang}`).not.toMatch(/NaN|Infinity|undefined|\[object/);
        const boxes = textBoxes(svg);
        expect(boxes.length, `${s.id} ${lang}`).toBeGreaterThan(40);
        for (const t of boxes) {
          expect(t.content.trim(), `${s.id} ${lang}`).not.toBe('');
          expect(Number.isFinite(t.x) && Number.isFinite(t.y) && t.size > 0, `${s.id} ${lang}: ${t.content}`).toBe(
            true,
          );
        }
        expect(svg, s.id).toContain(s.number);
      }
    }
  });

  it('say the same things in both languages (same number of texts, none identical except figures)', () => {
    for (const s of MECHANICAL_SHEETS) {
      const fr = texts('fr', s.id);
      const en = texts('en', s.id);
      // the same drawing: texts differ in language only, so the counts match within the few strings that split differently
      expect(Math.abs(fr.length - en.length) / fr.length, s.id).toBeLessThan(0.08);
      const words = (t: string): boolean => /[a-zéèêàùç]{5,}/i.test(t);
      const cognates = new Set(['guide', 'sleeve', 'cône', 'cone']);
      const sameWords = fr.filter(
        (t, i) => words(t) && t === en[i] && !/^[A-Z0-9 .,·-]+$/.test(t) && !cognates.has(t) && !(t in ITEM),
      );
      expect(sameWords.slice(0, 5), `${s.id}: untranslated?`).toEqual([]);
    }
  });

  it('keep every text inside the frame and never lay a text on another text', () => {
    for (const lang of ['fr', 'en'] as const) {
      for (const s of MECHANICAL_SHEETS) {
        const boxes = textBoxes(svgs[lang][s.id]!).filter((t) => !t.rotated);
        const ext = boxes.map((t) => ({ t, e: textExtent(t) }));
        for (const { t, e } of ext) {
          expect(e.x0, `${s.id} ${lang}: "${t.content}"`).toBeGreaterThan(8);
          expect(e.x1, `${s.id} ${lang}: "${t.content}"`).toBeLessThan(412);
          expect(e.y0, `${s.id} ${lang}: "${t.content}"`).toBeGreaterThan(8);
          expect(e.y1, `${s.id} ${lang}: "${t.content}"`).toBeLessThan(289);
        }
        const clashes: string[] = [];
        for (let i = 0; i < ext.length; i++) {
          for (let j = i + 1; j < ext.length; j++) {
            const a = ext[i]!;
            const b = ext[j]!;
            // shrink a little: the width estimate is pessimistic
            const sx = (e: ReturnType<typeof textExtent>): number => (e.x1 - e.x0) * 0.08;
            const sy = (e: ReturnType<typeof textExtent>): number => (e.y1 - e.y0) * 0.2;
            const ox = Math.min(a.e.x1 - sx(a.e), b.e.x1 - sx(b.e)) - Math.max(a.e.x0 + sx(a.e), b.e.x0 + sx(b.e));
            const oy = Math.min(a.e.y1 - sy(a.e), b.e.y1 - sy(b.e)) - Math.max(a.e.y0 + sy(a.e), b.e.y0 + sy(b.e));
            if (ox > 0.2 && oy > 0.2) clashes.push(`"${a.t.content}" / "${b.t.content}"`);
          }
        }
        expect(clashes, `${s.id} ${lang}`).toEqual([]);
      }
    }
  });
});

describe('the dimensions quoted are the ones of dims.ts', () => {
  const has = (lang: Lang, id: string, label: string): void => {
    expect(texts(lang, id), `${id} ${lang}: ${label}`).toContain(label);
  };
  const fr = (x: number, d = 0): string => x.toFixed(d).replace('.', ',');
  const en = (x: number, d = 0): string => x.toFixed(d);

  it('D01 draws the stack axes, the foundation and the heights of the model', () => {
    for (const lang of ['fr', 'en'] as const) {
      const f = lang === 'fr' ? fr : en;
      has(lang, 'general-arrangement', `${f(mm(DIMS.RAM.xWaste))}*`);
      has(lang, 'general-arrangement', `${f(mm(DIMS.RAM.xSnifter - DIMS.RAM.xWaste))}*`);
      has(lang, 'general-arrangement', `${f(mm(DIMS.RAM.xDelivery - DIMS.RAM.xSnifter))}*`);
      has(lang, 'general-arrangement', `${f(mm(DIMS.RAM.bodyLength - DIMS.RAM.xDelivery))}*`);
      has(lang, 'general-arrangement', `${f(mm(DIMS.FOUNDATION.length))}*`);
      has(lang, 'general-arrangement', `${f(mm(DIMS.FOUNDATION.width))}*`);
      has(lang, 'general-arrangement', `${f(mm(DIMS.INLET.strainerLength))}*`);
      has(lang, 'general-arrangement', `${f(mm(DIMS.INLET.valveLength))}*`);
    }
  });

  it('D02 and D03 quote the valve of the video: the thread of the 15×21 is unmarked, a value derived from a figure of the video is †, every other one is an estimate (*)', () => {
    for (const lang of ['fr', 'en'] as const) {
      const f = lang === 'fr' ? fr : en;
      // the 21 of the 15×21 fitting is the video's; the 15 of the seat is read from the fitting's name (†)
      has(lang, 'waste-valve-parts', `Ø${f(mm(DIMS.VALVE.threadDiameter))}`);
      has(lang, 'waste-valve-parts', `Ø${f(mm(DIMS.VALVE.seatBore[1]))}†`);
      // 7–8 cm and 30–32 mm are ranges of the video: the mid-points the lab picked are estimates (F23)
      has(lang, 'waste-valve-parts', `${f(mm(DIMS.VALVE.nippleLength))}*`);
      has(lang, 'waste-valve-parts', `Ø${f(mm(DIMS.VALVE.counterweightDiameter))}*`);
      // a length computed from the calibrated mass, or from other estimated lengths, is an estimate too (F16)
      has(lang, 'waste-valve-parts', `${f(mm(DIMS.VALVE.counterweightLength))}*`);
      has(lang, 'waste-valve-parts', `Ø${f(mm(DIMS.VALVE.headDiameter), 1)}*`);
      has(lang, 'waste-valve-parts', `Ø${f(mm(DIMS.VALVE.guideCollarDiameter))}*`);
      has(lang, 'waste-valve-assembly', `${f(mm(DIMS.VALVE.guideTop))}*`);
      has(lang, 'waste-valve-assembly', `${f(mm(DIMS.VALVE.reductionTop))}*`);
      // the pitch of the M6 rod comes from the video's M6 alone: derived
      expect(texts(lang, 'waste-valve-assembly').some((t) => t === `M6 · ${lang === 'fr' ? 'pas' : 'pitch'} 1†`)).toBe(
        true,
      );
    }
    expect(texts('fr', 'waste-valve-parts').some((t) => t.includes('Ø9,9*'))).toBe(true);
    expect(texts('en', 'waste-valve-parts').some((t) => t.includes('Ø9.9*'))).toBe(true);
  });

  it('D04 draws the calibrated stroke, the seat bore read from the fitting and the contact band (an estimate)', () => {
    for (const lang of ['fr', 'en'] as const) {
      const f = lang === 'fr' ? fr : en;
      has(lang, 'seat-cone-detail', `${f(STROKE, 1)}*`);
      has(lang, 'seat-cone-detail', `Ø${f(mm(DIMS.VALVE.seatBore[1]))}†`);
      has(lang, 'seat-cone-detail', `Ø${f(mm(DIMS.VALVE.headDiameter), 1)}*`);
      expect(texts(lang, 'seat-cone-detail').some((t) => t.includes(`${f(k(VALVE_DERIVED.contactBand), 2)} mm*`))).toBe(
        true,
      );
      expect(
        texts(lang, 'seat-cone-detail').some((t) =>
          t.startsWith(`${f(MODEL.noDeliveryStroke, 1)}${lang === 'fr' ? ' :' : ':'}`),
        ),
      ).toBe(true);
    }
  });

  it('D05 draws the chamber, the lift of the disc and the level of the model at rest', () => {
    const ch = chamberSection();
    const level = CH_MM.shellBottom + ch.level(AIR_FRACTION_NOMINAL);
    for (const lang of ['fr', 'en'] as const) {
      const f = lang === 'fr' ? fr : en;
      has(lang, 'chamber-section', `Ø${f(mm(DIMS.CHAMBER.diameter))}*`);
      has(lang, 'chamber-section', `${f(Math.round(level))}*`);
      has(lang, 'chamber-section', `${f(mm(DIMS.CHECK_VALVE.lift))}*`);
      has(lang, 'chamber-section', `Ø${f(mm(DIMS.CHECK_VALVE.seatBore), 1)}*`);
    }
  });

  it('the stroke, the weight and the model figures on the sheets are those of the catalogue', () => {
    expect(STROKE).toBe(2.2);
    expect(WEIGHT).toBe(360);
    const flat = (id: string): string =>
      texts('fr', id)
        .join(' ')
        .replace(/\u00a0/g, ' ');
    expect(flat('bom')).toContain(`${WEIGHT} g (calibré)`.slice(0, 5));
    expect(flat('bom')).toContain('calibré');
    expect(flat('chamber-section')).toContain(`${DERIVED.airLitres.toFixed(1).replace('.', ',')} L d’air`);
  });
});

describe('D06 bill of materials', () => {
  const ids = [...partIds('ram'), ...partIds('valve')];

  it('lists the 27 parts of the ram and valve worlds, each once, in the order of the frozen ids', () => {
    expect(ids).toHaveLength(27);
    expect(Object.keys(ITEM)).toEqual(ids);
    // the item column reads 1 to 27 in that order, once each (the raw ids of the 3D parts are not shown to the visitor)
    for (const lang of ['fr', 'en'] as const) {
      const boxes = textBoxes(svgs[lang].bom!).filter((t) => t.bold && /^\d{1,2}$/.test(t.content) && t.x < 30);
      expect(
        boxes.map((t) => Number(t.content)),
        lang,
      ).toEqual(Array.from({ length: 27 }, (_, i) => i + 1));
      const all = texts(lang, 'bom');
      for (const id of ids) expect(all, `${lang}: the id ${id} must not be shown`).not.toContain(id);
    }
  });

  it('takes names, materials and quantities from the catalogue, in both languages', () => {
    for (const lang of ['fr', 'en'] as const) {
      setLang(lang);
      const all = textBoxes(svgs[lang].bom!).map((t) => t.content.replace(/ /g, ' '));
      const blob = all.join(' ');
      for (const id of ids) {
        const part = PARTS.find((p) => p.id === id)!;
        // names are short: they sit on one or two lines of the table
        const firstWord = tr(part.name).replace(/ /g, ' ').split(' ')[0]!;
        expect(blob, `${lang} ${id} name`).toContain(firstWord);
        const mat = tr(part.material).replace(/ /g, ' ').split(' ')[0]!;
        expect(blob, `${lang} ${id} material`).toContain(mat);
      }
    }
    setLang('fr');
    // the quantity column: 26 ones and the two stem sleeves
    const q = PARTS.filter((p) => ids.includes(p.id)).map((p) => p.qty ?? 1);
    expect(q.reduce((a, b) => a + b, 0)).toBe(28);
    expect(PARTS.find((p) => p.id === 'stem-sleeves')!.qty).toBe(2);
  });

  it('the item numbers of the sheets are those of the bill: 1 to 13 for the ram, 14 to 27 for the valve', () => {
    expect(partIds('ram').map((id) => ITEM[id])).toEqual(Array.from({ length: 13 }, (_, i) => i + 1));
    expect(partIds('valve').map((id) => ITEM[id])).toEqual(Array.from({ length: 14 }, (_, i) => i + 14));
  });

  it('says that no source gives a torque and that the ram is generic, and shows no torque value', () => {
    for (const lang of ['fr', 'en'] as const) {
      const blob = texts(lang, 'bom').join(' ');
      expect(blob).toMatch(lang === 'fr' ? /couple de serrage/ : /tightening torque/);
      expect(blob).toMatch(lang === 'fr' ? /Walton n° ?3/ : /Walton No\. ?3/);
      expect(blob).not.toMatch(/\d\s?N·m|\bNm\b/);
    }
  });
});

describe('every sheet that draws the ram says that it is generic and that the dimensions are estimates', () => {
  it('has the legend of the marks', () => {
    for (const s of MECHANICAL_SHEETS) {
      const fr = texts('fr', s.id).join(' ');
      expect(fr, s.id).toContain('123*');
      expect(fr, s.id).toContain('123†');
    }
  });
  it('D01, D05 and D06 name the Walton n°3', () => {
    for (const id of ['general-arrangement', 'chamber-section', 'bom']) {
      for (const lang of ['fr', 'en'] as const)
        expect(texts(lang, id).join(' '), `${id} ${lang}`).toMatch(lang === 'fr' ? /Walton n° ?3/ : /Walton No\. ?3/);
    }
  });
});

// ------------------------------------------------------------------------------------------------ status marks vs dims.ts

/** Status of every constant of the sections of dims.ts the sheets read, from its JSDoc: the first of the three words wins. */
function jsdocStatus(): Record<string, 'R' | 'D' | 'E'> {
  const out: Record<string, 'R' | 'D' | 'E'> = {};
  const sections = ['RAM', 'FOUNDATION', 'INLET', 'VALVE', 'CHECK_VALVE', 'CHAMBER', 'FITTINGS', 'SITE'];
  for (const name of sections) {
    const start = dimsSource.indexOf(`export const ${name} = {`);
    const end = dimsSource.indexOf('\n} as const;', start);
    const body = dimsSource.slice(start, end);
    for (const m of body.matchAll(/\/\*\*([\s\S]*?)\*\/\s*(\w+):/g)) {
      const doc = m[1]!;
      const first = /\b(reported|derived|estimate)\b/.exec(doc);
      out[`${name}.${m[2]}`] = first ? (first[1] === 'reported' ? 'R' : first[1] === 'derived' ? 'D' : 'E') : 'E';
    }
  }
  return out;
}

describe('the marks (reported, derived, estimate) agree with the JSDoc of dims.ts', () => {
  const doc = jsdocStatus();
  it('reads the sections', () => {
    expect(Object.keys(doc).length).toBeGreaterThan(120);
  });
  it('lists as reported or derived exactly the constants whose JSDoc says so, and every other one is an estimate', () => {
    const wrong: string[] = [];
    for (const [key, status] of Object.entries(doc)) {
      const [section, name] = key.split('.') as [keyof typeof DIMS, string];
      // only lengths: a record such as VALVE.seatBore is read key by key
      if (typeof (DIMS[section] as unknown as Record<string, unknown>)[name!] !== 'number') continue;
      const mine = STATUS[key] ?? 'E';
      if (mine !== status) wrong.push(`${key}: sheets say ${mine}, dims.ts says ${status}`);
    }
    for (const key of Object.keys(STATUS)) if (!(key in doc)) wrong.push(`${key}: not in dims.ts`);
    expect(wrong).toEqual([]);
  });
});

// ------------------------------------------------------------------------------------------------ geometry vs the 3D builders

describe('the drawn geometry is the 3D geometry', () => {
  it('the waste valve heights and radii equal those of three/valve/geo.ts', () => {
    const pairs: [string, number, number][] = [
      ['nippleTop', V.nippleTop, G.NIPPLE_TOP],
      ['nippleBottom', V.nippleBottom, G.NIPPLE_BOTTOM],
      ['seatTop', V.seatTop, G.SEAT_TOP],
      ['sleeveBottom', V.sleeveBottom, G.SLEEVE_BOTTOM],
      ['sleeveTop', V.sleeveTop, G.SLEEVE_TOP],
      ['tubeBottom', V.tubeBottom, G.TUBE_BOTTOM],
      ['guideTop', V.guideTop, G.GUIDE_TOP],
      ['headBase', V.headBase, G.HEAD_BASE],
      ['neckBottom', NECK_BOTTOM, G.NECK_BOTTOM],
      ['coneTop', CONE_TOP, G.CONE_TOP],
      ['finsBottom', FINS_BOTTOM, G.FINS_BOTTOM],
      ['rodBottom', ROD_BOTTOM, G.ROD_BOTTOM],
      ['threadR', V.threadR, G.NIPPLE_R],
      ['headR', V.headR, G.HEAD_R],
      ['collarR', V.collarR, G.COLLAR_R],
      ['socketR', V.socketR, G.SOCKET_R],
      ['redTop', V.redTop, G.RED_TOP],
    ];
    for (const [name, mine, theirs] of pairs) expect(mine, name).toBeCloseTo(theirs * 1000, 6);
  });

  it('the stack on the rod is the 3D one: stroke nut on the guide, the weight on the nut, the lock nut on the weight', () => {
    // with no stroke the sheets' stack is the 3D closed stack (the 3D adds its own exaggerated travel)
    const st = stack(0);
    expect(st.nut0, 'stroke nut bottom').toBeCloseTo(G.STROKE_NUT_Y * 1000, 6);
    expect(st.weight0, 'weight bottom').toBeCloseTo(G.WEIGHT_Y * 1000, 6);
    expect(st.weight1, 'lock nut bottom').toBeCloseTo(G.LOCK_NUT_Y * 1000, 6);
    expect(st.lock1, 'stack top').toBeCloseTo(G.STACK_TOP * 1000, 6);
    expect(st.nut0, 'rests on the guide').toBeCloseTo(V.guideTop, 6);
    expect(st.nut0).toBeCloseTo(k(DIMS.VALVE.strokeNutBottom), 6);
    expect(st.weight0).toBeCloseTo(k(DIMS.VALVE.counterweightBottom), 6);
    expect(st.weight1).toBeCloseTo(k(DIMS.VALVE.lockNutBottom), 6);
    expect(st.lock1).toBeCloseTo(k(DIMS.VALVE.stackTop), 6);
    // with the stroke, the whole stack stands that much higher
    expect(stack(2.2).nut0 - stack(0).nut0).toBeCloseTo(2.2, 9);
    expect(stack(2.2).rodTop - stack(0).rodTop).toBeCloseTo(2.2, 9);
  });

  it('the chamber vessel (bottom of the interior and height) equals the one of the 3D ram', () => {
    const model = createRamModel(null);
    const inner = model.rig.chamberInner!;
    const ch = chamberSection();
    expect(ch.yBottom).toBeCloseTo(inner.yBottom * 1000, 6);
    expect(ch.height).toBeCloseTo(inner.height * 1000, 6);
    // the water level of the sheet follows the same rule as the 3D view: yBottom + (1 - air share) * height
    expect(ch.level(AIR_FRACTION_NOMINAL)).toBeCloseTo(
      (inner.yBottom + (1 - AIR_FRACTION_NOMINAL) * inner.height) * 1000,
      6,
    );
  });

  it('the stroke drawn is the real stroke, not the 3D exaggeration', () => {
    expect(DIMS.VALVE.strokeVisualScale).toBeGreaterThan(1);
    expect(STROKE).toBeLessThan(5);
  });
});
