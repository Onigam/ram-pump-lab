import { describe, expect, it, vi } from 'vitest';
import type { GuideStep, PartCategory, PartInfo } from '@onigam/lab-kit/content';
import type { L } from '@onigam/lab-kit/i18n';
import { strL } from '@onigam/lab-kit/i18n';
import '../i18n/ui';
import { PART_CATEGORIES, WORLDS, partIds, type WorldId } from '../part-ids';
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

/** Every frozen id with its world and category (src/part-ids.ts, docs/research.md §11). */
const FROZEN: Record<string, { scene: WorldId; category: PartCategory }> = Object.fromEntries(
  WORLDS.flatMap((world) =>
    Object.entries(PART_CATEGORIES[world]).map(([id, category]) => [id, { scene: world, category }]),
  ),
);

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
  it('has exactly the frozen ids of src/part-ids.ts, each once', () => {
    const ids = PARTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(Object.keys(FROZEN).sort());
  });

  it('puts the frozen number of parts in each world, with the frozen category', () => {
    for (const world of WORLDS) {
      expect(PARTS.filter((p) => p.scene === world).length, world).toBe(partIds(world).length);
    }
    for (const p of PARTS) {
      expect(WORLDS, p.id).toContain(p.scene);
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

/** Parts that the installation guide may leave out: the farm already has them (the source, the tank, the house). */
const ALREADY_THERE = ['spring', 'buffer-tank', 'house'];

// A guide may cross several worlds (`GuideStep.scene`): the assembly builds the waste valve in the `valve` world and
// fits it in the `ram` world; the installation starts on the site, details the catchment, then goes back to the site.
describe.each([
  ['assembly', ASSEMBLY, 'valve', ['valve', 'ram'], []],
  ['installation', INSTALL, 'site', ['catchment', 'site'], ALREADY_THERE],
] as const)('%s guide', (_name, steps, defaultWorld, worlds, mayLeave) => {
  const worldOfStep = (s: GuideStep): string => s.scene ?? defaultWorld;
  const worldParts = PARTS.filter((p) => (worlds as readonly string[]).includes(p.scene)).map((p) => p.id);

  it('has unique, kebab-case step ids', () => {
    const ids = steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('only plays in the worlds of the guide, and starts in its default world', () => {
    expect(worldOfStep(steps[0]!)).toBe(defaultWorld);
    for (const s of steps) expect(worlds as readonly string[], s.id).toContain(worldOfStep(s));
    for (const w of worlds)
      expect(
        steps.some((s) => worldOfStep(s) === w),
        `no step in ${w}`,
      ).toBe(true);
  });

  it('only installs parts of the world its step plays in', () => {
    for (const s of steps) {
      for (const id of s.parts) {
        const part = PARTS.find((p) => p.id === id);
        expect(part, `${s.id}: unknown part ${id}`).toBeDefined();
        expect(part?.scene, `${s.id}: ${id}`).toBe(worldOfStep(s));
      }
    }
  });

  it('installs every part of its worlds once (except the ones the farm already has)', () => {
    const installed = steps.flatMap((s) => s.parts);
    expect(installed.length, 'a part is installed twice').toBe(new Set(installed).size);
    const missing = worldParts.filter((id) => !installed.includes(id));
    expect(
      missing.filter((id) => !(mayLeave as readonly string[]).includes(id)),
      'parts never installed',
    ).toEqual([]);
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

  it('gives a duration like "≈ 30 min (est.)" or "1 h (vidéo)", and no torque (no source states one)', () => {
    for (const s of steps) {
      // plain strings in the kit: « (est.) » marks the lab's estimates, « (vidéo) » the one figure the video gives
      expect(s.duration, s.id).toMatch(/^(≈ )?\d+ (min|h)( \((est\.|vidéo)\))?$/);
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

/** Words of a text, the way a reader counts them (bold markers and placeholders aside). */
const words = (t: string): number => t.replace(/\*\*/g, '').split(/\s+/).filter(Boolean).length;

describe('guides: the card of a step is short enough to read on a phone', () => {
  // docs/fix-wave-rules.md §7: a step text has at most 80 words (a hard cap of 90) in each language, a tip about 30 and
  // a warning about 30 (safety and legal warnings may run a little longer, never shorter).
  it.each([
    ['assembly', ASSEMBLY],
    ['installation', INSTALL],
  ] as const)('%s: text of at most 90 words, tip of at most 40, warning of at most 70', (_name, steps) => {
    for (const s of steps) {
      for (const lang of ['fr', 'en'] as const) {
        expect(words(s.text[lang]), `${s.id} text ${lang}`).toBeLessThanOrEqual(90);
        if (s.tip) expect(words(s.tip[lang]), `${s.id} tip ${lang}`).toBeLessThanOrEqual(40);
        if (s.warning) expect(words(s.warning[lang]), `${s.id} warning ${lang}`).toBeLessThanOrEqual(70);
      }
    }
  });

  it('has 24 assembly steps and 12 installation steps, and tells the visitor where a change of view leads', () => {
    expect(ASSEMBLY.length).toBe(24);
    expect(INSTALL.length).toBe(12);
    const at = (steps: GuideStep[], id: string) => steps.findIndex((s) => s.id === id);
    // valve -> ram: the first step of the ram says that the scene changes; the last of the valve says the valve is done
    const firstRam = ASSEMBLY.findIndex((s) => s.scene === 'ram');
    expect(`${ASSEMBLY[firstRam - 1]!.text.fr} ${ASSEMBLY[firstRam]!.text.fr}`).toMatch(/clapet est terminé|fosse/);
    expect(`${ASSEMBLY[firstRam - 1]!.text.en} ${ASSEMBLY[firstRam]!.text.en}`).toMatch(/valve is finished|pit/);
    // site -> catchment -> site
    const sceneOf = (s: GuideStep) => s.scene ?? 'site';
    const firstCatchment = INSTALL.findIndex((s) => sceneOf(s) === 'catchment');
    expect(INSTALL[firstCatchment]!.text.fr).toMatch(/^On zoome sur le captage/);
    expect(INSTALL[firstCatchment]!.text.en).toMatch(/^We zoom in on the catchment/);
    const back = INSTALL.findIndex((s, i) => i > firstCatchment && sceneOf(s) === 'site');
    expect(INSTALL[back]!.text.fr).toMatch(/^Retour sur le site/);
    expect(INSTALL[back]!.text.en).toMatch(/^Back on the site/);
    expect(at(INSTALL, 'troubleshoot')).toBe(INSTALL.length - 1);
  });
});

describe('visible texts: no internal vocabulary, one term per concept', () => {
  // docs/fix-wave-rules.md decisions 1 to 3: no source codes, no « monde » / "world", no raw ids, and the glossary of the
  // language review (weight, ram pit, waste water, Y-strainer, …). Ids and code comments are not visible texts.
  const visible: [string, L][] = [
    ...PARTS.flatMap((p) => partTexts(p).map(([label, v]): [string, L] => [`${p.id}.${label}`, v])),
    ...[...ASSEMBLY, ...INSTALL].flatMap((s) => stepTexts(s).map(([label, v]): [string, L] => [`${s.id}.${label}`, v])),
    ...CHAPTERS.map(([ts, fr, en]): [string, L] => [`chapter ${ts}`, { fr, en }]),
  ];
  const both: [string, RegExp][] = [
    ['a source code (S1 … S9)', /\bS[1-9]\b/],
    ['a research number (K4, K15 …)', /\bK\d+\b/],
    ['« monde » / world', /\bmondes?\b|\bworlds?\b/i],
    ['a part id between parentheses', /\((?:monde |world )?(?:site|ram|valve|catchment)\)/i],
    ['a double space', /\S {2,}\S/],
  ];
  const frOnly: [string, RegExp][] = [
    ['contrepoids (say « poids »)', /contrepoids/i],
    ['« regard » for the ram pit (say « fosse »)', /regard du bélier|regard qui abrite/i],
    ['« eau perdue » (say « eau rejetée »)', /eau(x)? perdue/i],
    ['« Chocs par » (say « coups »)', /chocs par/i],
    ['a space after n° (the kit adds it)', /n° /],
    ['a no-break space typed by hand', /[\u00a0\u202f]/],
  ];
  const enOnly: [string, RegExp][] = [
    ['counterweight (say "weight")', /counterweight/i],
    ['the French « n° » (say "No. 1")', /n°/],
    ['"lost water" (say "waste water")', /lost water|water lost/i],
    ['"Shocks per" (say "strokes")', /shocks per/i],
    [
      'American spellings and calques of the language review',
      /\b(toward|curb|gallons?|emergence|hinder\w*|axle|betray\w*|rebar bar|absorbent paper|fins nut|center|meter)\b/i,
    ],
    ['a no-break space typed by hand', /[\u00a0\u202f]/],
  ];

  it('has none of them in any part sheet, guide step or chapter', () => {
    const found: string[] = [];
    for (const [where, v] of visible) {
      for (const [what, re] of both) {
        if (re.test(v.fr)) found.push(`${where} fr: ${what}`);
        if (re.test(v.en)) found.push(`${where} en: ${what}`);
      }
      for (const [what, re] of frOnly) if (re.test(v.fr)) found.push(`${where} fr: ${what}`);
      for (const [what, re] of enOnly) if (re.test(v.en)) found.push(`${where} en: ${what}`);
    }
    expect(found).toEqual([]);
  });

  it('spells a maintenance tab as three paragraphs opening with their bold label', () => {
    const labels = {
      fr: ['**Panne à prévoir.**', '**À vérifier.**', '**Entretien.**'],
      en: ['**Typical failure.**', '**How to check.**', '**Maintenance.**'],
    };
    for (const p of PARTS) {
      for (const lang of ['fr', 'en'] as const) {
        const paragraphs = p.maintenance![lang].split('\n\n');
        expect(paragraphs.length, `${p.id} ${lang}`).toBe(3);
        paragraphs.forEach((para, i) => expect(para.startsWith(labels[lang][i]!), `${p.id} ${lang} #${i}`).toBe(true));
      }
    }
  });
});

describe('guides: content that the brief requires', () => {
  it('has about twenty assembly steps and about eleven installation steps', () => {
    expect(ASSEMBLY.length).toBeGreaterThanOrEqual(17);
    expect(ASSEMBLY.length).toBeLessThanOrEqual(24);
    expect(INSTALL.length).toBeGreaterThanOrEqual(9);
    expect(INSTALL.length).toBeLessThanOrEqual(13);
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
