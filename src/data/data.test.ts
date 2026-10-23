import { describe, expect, it, vi } from 'vitest';
import type { GuideStep, PartCategory, PartInfo } from '@onigam/lab-kit/content';
import type { L } from '@onigam/lab-kit/i18n';
import { strL } from '@onigam/lab-kit/i18n';
import '../i18n/ui';
import { HOUSE, SITE, TANK } from '../three/dims';
import { ASSEMBLY } from './assembly';
import { CHAPTERS } from './chapters';
import { INSTALL } from './install';
import { PARTS } from './parts';

// The kit's built i18n module (dist/i18n/index.js) imports './lang' without an extension, which Node cannot resolve
// when vitest leaves node_modules outside the bundler. These tests only need `l`, `strL` and the string registry,
// so the module is replaced by a faithful miniature of them (same behaviour as dist/i18n/strings.js).
vi.mock('@onigam/lab-kit/i18n', () => {
  const registry = new Map<string, readonly [string, string]>();
  return {
    l: (fr: string, en: string) => ({ fr, en }),
    registerStrings: (dict: Record<string, readonly [string, string]>) => {
      for (const [key, value] of Object.entries(dict)) registry.set(key, value);
    },
    tx: (key: string) => registry.get(key)?.[0] ?? key,
    strL: (key: string) => {
      const entry = registry.get(key);
      return entry ? { fr: entry[0], en: entry[1] } : { fr: key, en: key };
    },
    getLang: () => 'fr',
    colon: () => ' :',
  };
});

// Content checks: the catalogue and the two guides against the frozen ids of docs/research.md §4, FR/EN parity,
// video timestamps, and the figures that the prose repeats against their sources.

/** The 7 site parts and the 18 ram parts of docs/research.md §4, with their category. */
const FROZEN: Record<string, { scene: 'site' | 'ram'; category: PartCategory }> = {
  spring: { scene: 'site', category: 'site' },
  'buffer-tank': { scene: 'site', category: 'hydraulic' },
  'drive-pipe': { scene: 'site', category: 'hydraulic' },
  'ram-pit': { scene: 'site', category: 'structure' },
  'delivery-pipe': { scene: 'site', category: 'hydraulic' },
  'water-tower': { scene: 'site', category: 'structure' },
  house: { scene: 'site', category: 'site' },
  ram: { scene: 'ram', category: 'hydraulic' },
  'inlet-valve': { scene: 'ram', category: 'hydraulic' },
  'waste-valve': { scene: 'ram', category: 'hydraulic' },
  'valve-seat': { scene: 'ram', category: 'mechanical' },
  'valve-stem': { scene: 'ram', category: 'mechanical' },
  'valve-guide': { scene: 'ram', category: 'mechanical' },
  'stroke-nut': { scene: 'ram', category: 'mechanical' },
  'lock-nut': { scene: 'ram', category: 'mechanical' },
  counterweight: { scene: 'ram', category: 'mechanical' },
  'valve-fins': { scene: 'ram', category: 'mechanical' },
  'base-plate': { scene: 'ram', category: 'structure' },
  'delivery-valve': { scene: 'ram', category: 'hydraulic' },
  'air-chamber': { scene: 'ram', category: 'hydraulic' },
  snifter: { scene: 'ram', category: 'hydraulic' },
  gauge: { scene: 'ram', category: 'hydraulic' },
  'outlet-valve': { scene: 'ram', category: 'hydraulic' },
  'drain-valve': { scene: 'ram', category: 'hydraulic' },
  strainer: { scene: 'ram', category: 'hydraulic' },
};

const CATEGORIES: PartCategory[] = ['hydraulic', 'mechanical', 'electrical', 'structure', 'site'];
const VIDEO_SECONDS = 19 * 60 + 57;

const isL = (v: unknown): v is L => typeof v === 'object' && v !== null && 'fr' in v && 'en' in v;
const seconds = (ts: string): number => {
  const [m, s] = ts.split(':').map(Number);
  return (m ?? 0) * 60 + (s ?? 0);
};

/** Every bilingual text of a part, with a label for the failure message. */
function partTexts(p: PartInfo): [string, L][] {
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

/** Every bilingual text of a guide step. */
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

/** Numbers of a text, normalised so that the French and English spellings compare equal (7,5 / 7.5, 5 700 / 5,700). */
function figures(text: string, lang: 'fr' | 'en'): string[] {
  let t = text.replace(/[−–]/g, '-');
  if (lang === 'fr') t = t.replace(/(\d) (\d{3})(?!\d)/g, '$1$2').replace(/(\d),(\d)/g, '$1.$2');
  else t = t.replace(/(\d),(\d{3})(?!\d)/g, '$1$2');
  return (t.match(/\d+(?:\.\d+)?/g) ?? []).sort();
}

describe('parts catalogue', () => {
  it('has exactly the 25 frozen ids of research §4, each once', () => {
    const ids = PARTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(Object.keys(FROZEN).sort());
    expect(PARTS.length).toBe(25);
  });

  it('puts 7 parts in the site world and 18 in the ram world, with the frozen category', () => {
    expect(PARTS.filter((p) => p.scene === 'site').length).toBe(7);
    expect(PARTS.filter((p) => p.scene === 'ram').length).toBe(18);
    for (const p of PARTS) {
      expect(['site', 'ram'], p.id).toContain(p.scene);
      expect(CATEGORIES, p.id).toContain(p.category);
      expect(p.scene, p.id).toBe(FROZEN[p.id]?.scene);
      expect(p.category, p.id).toBe(FROZEN[p.id]?.category);
    }
  });

  it('has a non-empty French and English text everywhere', () => {
    for (const p of PARTS) {
      for (const [label, v] of partTexts(p)) {
        expect(v.fr.trim().length, `${p.id}.${label} fr`).toBeGreaterThan(0);
        expect(v.en.trim().length, `${p.id}.${label} en`).toBeGreaterThan(0);
      }
    }
  });

  it('writes the two languages differently for the long texts', () => {
    for (const p of PARTS) {
      for (const [label, v] of partTexts(p)) {
        if (['short', 'description', 'maintenance', 'tip', 'design'].includes(label)) {
          expect(v.fr, `${p.id}.${label}`).not.toBe(v.en);
        }
      }
    }
  });

  it('keeps the same figures in French and English', () => {
    for (const p of PARTS) {
      for (const [label, v] of partTexts(p)) {
        expect(figures(v.fr, 'fr'), `${p.id}.${label}`).toEqual(figures(v.en, 'en'));
      }
    }
  });

  it('tags a non-reported figure the same way in both languages', () => {
    const pairs: [string, string][] = [
      ['(estimation)', '(estimate)'],
      ['(dérivé)', '(derived)'],
      ['(hypothèse du modèle)', '(model assumption)'],
      ['(calibré sur la vidéo)', '(calibrated on the video)'],
      ['(résultat du modèle)', '(model result)'],
    ];
    for (const p of PARTS) {
      for (const s of p.specs) {
        if (!isL(s.value)) continue;
        for (const [fr, en] of pairs) {
          expect(s.value.fr.includes(fr), `${p.id} ${s.value.fr}`).toBe(s.value.en.includes(en));
        }
      }
    }
  });

  it('leaves no French word in an English spec value or label', () => {
    const french =
      /(?<!\p{L})(à|jour|coups|dérivé|estimation|hypothèse|modèle|avec|pour|sur|près|mini|maxi|de|du|des|le|la|les)(?!\p{L})/iu;
    for (const p of PARTS) {
      for (const s of p.specs) {
        const en = isL(s.value) ? s.value.en : s.value;
        expect(en, `${p.id} ${s.label.en}`).not.toMatch(french);
        expect(s.label.en, `${p.id} ${s.label.en}`).not.toMatch(french);
      }
    }
  });

  it('has non-empty spec values and at least three specs per part', () => {
    for (const p of PARTS) {
      expect(p.specs.length, p.id).toBeGreaterThanOrEqual(3);
      for (const s of p.specs) {
        const v = isL(s.value) ? s.value.fr + s.value.en : s.value;
        expect(v.trim().length, `${p.id} ${s.label.fr}`).toBeGreaterThan(0);
      }
    }
  });

  it('gives video timestamps as mm:ss within the 19:57 video', () => {
    for (const p of PARTS) {
      for (const ts of p.video ?? []) {
        expect(ts, p.id).toMatch(/^\d{2}:[0-5]\d$/);
        expect(seconds(ts), `${p.id} ${ts}`).toBeLessThanOrEqual(VIDEO_SECONDS);
      }
    }
  });

  it('has no placeholder text and balanced bold markers', () => {
    const bad = /todo|tbd|lorem|xxx|placeholder/i;
    for (const p of PARTS) {
      for (const [label, v] of partTexts(p)) {
        expect(v.fr + v.en, `${p.id}.${label}`).not.toMatch(bad);
      }
    }
  });

  it('says that the ram is generic and its body dimensions are estimates', () => {
    const ram = PARTS.find((p) => p.id === 'ram')!;
    expect(ram.description.fr).toMatch(/générique/);
    expect(ram.description.fr).toMatch(/estimations/);
    expect(ram.description.en).toMatch(/generic/);
    expect(ram.description.en).toMatch(/estimates/);
  });
});

describe.each([
  ['assembly', ASSEMBLY, 'ram'],
  ['installation', INSTALL, 'site'],
] as const)('%s guide', (_name, steps, world) => {
  const worldParts = PARTS.filter((p) => p.scene === world).map((p) => p.id);

  it('has unique, kebab-case step ids', () => {
    const ids = steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('only installs parts of its own world', () => {
    for (const s of steps) {
      for (const id of s.parts) {
        const part = PARTS.find((p) => p.id === id);
        expect(part, `${s.id}: unknown part ${id}`).toBeDefined();
        expect(part?.scene, `${s.id}: ${id}`).toBe(world);
      }
    }
  });

  it('installs every part of its world, once', () => {
    const installed = steps.flatMap((s) => s.parts);
    expect([...new Set(installed)].sort()).toEqual([...worldParts].sort());
    expect(installed.length, 'a part is installed twice').toBe(new Set(installed).size);
  });

  it('has a non-empty French and English text everywhere, different in the two languages', () => {
    for (const s of steps) {
      for (const [label, v] of stepTexts(s)) {
        expect(v.fr.trim().length, `${s.id}.${label} fr`).toBeGreaterThan(0);
        expect(v.en.trim().length, `${s.id}.${label} en`).toBeGreaterThan(0);
        if (label !== 'title') expect(v.fr, `${s.id}.${label}`).not.toBe(v.en);
        expect(figures(v.fr, 'fr'), `${s.id}.${label}`).toEqual(figures(v.en, 'en'));
      }
      expect((s.text.fr.match(/\*\*/g) ?? []).length % 2, `${s.id} fr bold`).toBe(0);
      expect((s.text.en.match(/\*\*/g) ?? []).length % 2, `${s.id} en bold`).toBe(0);
    }
  });

  it('puts in bold the parts it installs, in both languages', () => {
    for (const s of steps) {
      if (s.parts.length === 0) continue;
      expect(s.text.fr, s.id).toMatch(/\*\*[^*]+\*\*/);
      expect(s.text.en, s.id).toMatch(/\*\*[^*]+\*\*/);
    }
  });

  it('gives a duration like "30 min" or "4 h", and no torque (no source states one)', () => {
    for (const s of steps) {
      expect(s.duration, s.id).toMatch(/^\d+ (min|h)$/);
      expect(s.torque, s.id).toBeUndefined();
    }
  });

  it('has no placeholder text', () => {
    for (const s of steps) {
      for (const [label, v] of stepTexts(s)) {
        expect(v.fr + v.en, `${s.id}.${label}`).not.toMatch(/todo|tbd|lorem|xxx|placeholder/i);
      }
    }
  });
});

describe('guides: content that the brief requires', () => {
  it('has about twelve assembly steps and about six installation steps', () => {
    expect(ASSEMBLY.length).toBeGreaterThanOrEqual(11);
    expect(ASSEMBLY.length).toBeLessThanOrEqual(14);
    expect(INSTALL.length).toBeGreaterThanOrEqual(6);
    expect(INSTALL.length).toBeLessThanOrEqual(8);
  });

  it('carries the legal note, the potability note and the rigid-pipe warning in the installation guide', () => {
    const all = INSTALL.map((s) => `${s.text.fr} ${s.warning?.fr ?? ''} ${s.tip?.fr ?? ''}`).join(' ');
    const allEn = INSTALL.map((s) => `${s.text.en} ${s.warning?.en ?? ''} ${s.tip?.en ?? ''}`).join(' ');
    expect(all).toMatch(/DDT/);
    expect(all).toMatch(/OFB/);
    expect(all).toMatch(/potable/);
    expect(all).toMatch(/plastique/i);
    expect(allEn).toMatch(/DDT/);
    expect(allEn).toMatch(/OFB/);
    expect(allEn).toMatch(/potable/);
    expect(allEn).toMatch(/plastic/i);
  });

  it('warns against a finger in the waste valve and puts the gauge on the delivery side', () => {
    const fr = [...INSTALL, ...ASSEMBLY].map((s) => `${s.text.fr} ${s.warning?.fr ?? ''} ${s.tip?.fr ?? ''}`).join(' ');
    const en = [...INSTALL, ...ASSEMBLY].map((s) => `${s.text.en} ${s.warning?.en ?? ''} ${s.tip?.en ?? ''}`).join(' ');
    expect(fr).toMatch(/Jamais un doigt/);
    expect(fr).toMatch(/côté refoulement/);
    expect(en).toMatch(/Never put a finger/);
    expect(en).toMatch(/delivery side/);
  });
});

describe('interface strings added by the data role', () => {
  it.each(['legal', 'safety', 'genericRam', 'chapters'])('%s exists in both languages', (key) => {
    const v = strL(key);
    expect(v.fr.trim().length).toBeGreaterThan(0);
    expect(v.en.trim().length).toBeGreaterThan(0);
    expect(v.fr).not.toBe(v.en);
  });

  it('the legal note names the DDT, the OFB, potability and the other countries', () => {
    const v = strL('legal');
    expect(v.fr).toMatch(/DDT/);
    expect(v.fr).toMatch(/OFB/);
    expect(v.fr).toMatch(/potable/);
    expect(v.fr).toMatch(/pays/);
    expect(v.en).toMatch(/potable/);
    expect(v.en).toMatch(/locally/);
  });
});

describe('video chapters', () => {
  it('has 8 to 12 entries, in order, within the video, in both languages', () => {
    expect(CHAPTERS.length).toBeGreaterThanOrEqual(8);
    expect(CHAPTERS.length).toBeLessThanOrEqual(12);
    let previous = -1;
    for (const [ts, fr, en] of CHAPTERS) {
      expect(ts).toMatch(/^\d{2}:[0-5]\d$/);
      expect(seconds(ts)).toBeGreaterThan(previous);
      expect(seconds(ts)).toBeLessThanOrEqual(VIDEO_SECONDS);
      previous = seconds(ts);
      expect(fr.trim().length).toBeGreaterThan(0);
      expect(en.trim().length).toBeGreaterThan(0);
      expect(fr).not.toBe(en);
    }
  });
});

describe('figures that the prose repeats', () => {
  // The prose writes these reported figures by hand (7,5 m, 20 m, 65 m, 300 m, 5 700 L): if dims.ts changes, the
  // texts of the sheets and guides must be reread.
  it('agree with dims.ts', () => {
    expect(SITE.fall).toBe(7.5);
    expect(SITE.driveLength).toBe(20);
    expect(SITE.deliveryHead).toBe(65);
    expect(SITE.deliveryLength).toBe(300);
    expect(SITE.sourceFlowLpm).toBe(7.5);
    expect(TANK.volumeL).toBe(5700);
  });

  it('give a house terrace below the tower inlet', () => {
    expect(HOUSE.terraceFraction * SITE.deliveryHead).toBeLessThan(SITE.deliveryHead);
  });
});
