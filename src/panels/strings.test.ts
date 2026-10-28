import { describe, expect, it } from 'vitest';
import { UI_STRINGS } from '../i18n/ui';
import { PART_TESTS } from '../sim/actions';
import { SCENARIO_IDS } from '../sim/presets';
import { KEY_READOUTS, MORE_READOUTS, PART_HINT_KEYS, SCENARIO_CAPTION_KEYS } from './model';

// The lab's own interface strings: French and English written together (BRIEF §5), with the same placeholders, no empty
// string, and the short labels short enough for the grid of readouts (it truncates beyond ≈ 15 characters, more or less
// depending on the letters). Nothing internal shows through: no source code, no "world", no raw id, no French n° in English.

const placeholders = (text: string): string[] => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

/** Keys shown in the cells of the readout grid (simulation panel and the figures of a frozen phase). */
const READOUT_KEYS = [
  'liveStrokes',
  'liveDrive',
  'liveWaste',
  'liveDelivered',
  'liveDeliveredDay',
  'liveEtaD',
  'liveEtaR',
  'liveClosing',
  'liveClosingMin',
  'liveSurge',
  'livePeak',
  'liveChamber',
  'liveTank',
  'liveAir',
  'liveWave',
  'cardValve',
  'cardCheck',
  'cardBody',
  'cardSpeed',
  'cardJet',
  'cardInto',
  'cardInPhase',
];

describe('lab interface strings', () => {
  const entries = Object.entries(UI_STRINGS);

  it('every string has a French and an English text, neither empty', () => {
    for (const [key, [fr, en]] of entries) {
      expect(fr.trim().length, `${key} (fr)`).toBeGreaterThan(0);
      expect(en.trim().length, `${key} (en)`).toBeGreaterThan(0);
    }
  });

  it('the two languages use the same placeholders', () => {
    for (const [key, [fr, en]] of entries) expect(placeholders(fr), key).toEqual(placeholders(en));
  });

  it('French typography: no straight apostrophe, no placeholder left over', () => {
    for (const [key, [fr, en]] of entries) {
      expect(fr.includes("'"), `${key}: straight apostrophe in French`).toBe(false);
      expect(en.includes('TODO') || fr.includes('TODO'), key).toBe(false);
    }
  });

  it('the labels of the readout cells are short (≤ 15 characters in both languages; the browser check of the grid is the judge)', () => {
    for (const key of READOUT_KEYS) {
      const [fr, en] = UI_STRINGS[key];
      expect(fr.length, `${key} (fr): ${fr}`).toBeLessThanOrEqual(15);
      expect(en.length, `${key} (en): ${en}`).toBeLessThanOrEqual(15);
    }
  });

  it('the readouts of the panel are exactly those the grid is tested on', () => {
    const shown = [...KEY_READOUTS, ...MORE_READOUTS].map((d) => d.key as string);
    for (const key of shown) expect(READOUT_KEYS, key).toContain(key);
    expect(KEY_READOUTS).toHaveLength(6);
    expect(MORE_READOUTS).toHaveLength(9);
  });

  it('the short labels of the chips and the strip stay short', () => {
    for (const key of [
      'scenarioPlasticPipe',
      'scenarioHeavyWeight',
      'phaseAccel',
      'phaseClose',
      'phaseDeliver',
      'phaseRecoil',
    ]) {
      const [fr, en] = UI_STRINGS[key];
      expect(fr.length, `${key} (fr)`).toBeLessThanOrEqual(24);
      expect(en.length, `${key} (en)`).toBeLessThanOrEqual(24);
    }
    for (const key of Object.keys(UI_STRINGS).filter((k) => k.startsWith('alarm_'))) {
      const [fr, en] = UI_STRINGS[key];
      expect(fr.length, `${key} (fr)`).toBeLessThanOrEqual(34);
      expect(en.length, `${key} (en)`).toBeLessThanOrEqual(34);
    }
  });

  it('the new scenarios, alarms and part actions all have their strings', () => {
    for (const key of [
      'scenarioPlasticPipe',
      'scenarioHeavyWeight',
      'alarm_softPipe',
      'alarm_gateClosed',
      'alarm_heldShut',
      'alarm_drainOpen',
      'actNutIn',
      'actNutOut',
      'actDrown',
      'actRefill',
      'actBlock',
      'actUnblock',
      'actHold',
      'actRelease',
      'actCloseGate',
      'actOpenGate',
      'actOpenDrain',
      'actCloseDrain',
    ]) {
      expect(UI_STRINGS[key], key).toBeDefined();
      expect(UI_STRINGS[`${key}Title`] ?? UI_STRINGS[key], key).toBeDefined();
    }
    // every button has a tooltip
    for (const key of Object.keys(UI_STRINGS).filter((k) => k.startsWith('act') && !k.endsWith('Title')))
      expect(UI_STRINGS[`${key}Title`], `${key}Title`).toBeDefined();
  });

  it('every scenario has a caption that says what to look at, and every part test has a line of its own', () => {
    for (const id of SCENARIO_IDS) {
      const key = SCENARIO_CAPTION_KEYS[id];
      expect(UI_STRINGS[key], `${id} → ${key}`).toBeDefined();
      const [fr, en] = UI_STRINGS[key];
      expect(fr, key).toMatch(/regardez|lisez/i);
      expect(en, key).toMatch(/watch|read/i);
    }
    for (const [part, key] of Object.entries(PART_HINT_KEYS)) {
      expect(UI_STRINGS[key], `${part} → ${key}`).toBeDefined();
      expect(UI_STRINGS[key][0], key).toMatch(/Regardez/);
      expect(UI_STRINGS[key][1], key).toMatch(/Watch/);
    }
    // the parts that carry a test button are the ones that have a line
    for (const test of PART_TESTS) for (const part of test.parts) expect(PART_HINT_KEYS[part], part).toBeDefined();
    expect(PART_HINT_KEYS['stroke-nut']).toBeDefined();
  });

  it('the panel opens on an intro and the story, and the captions stay short (a line or two on a phone)', () => {
    for (const key of [
      'simIntro',
      'presetHint',
      'scenarioPrompt',
      'scenarioHint',
      ...Object.values(SCENARIO_CAPTION_KEYS),
    ]) {
      const [fr, en] = UI_STRINGS[key];
      const words = (x: string) => x.split(/\s+/).length;
      expect(words(fr), `${key} (fr)`).toBeLessThanOrEqual(70);
      expect(words(en), `${key} (en)`).toBeLessThanOrEqual(70);
    }
    for (const key of Object.values(PART_HINT_KEYS)) {
      expect(UI_STRINGS[key][0].split(/\s+/).length, `${key} (fr)`).toBeLessThanOrEqual(35);
      expect(UI_STRINGS[key][1].split(/\s+/).length, `${key} (en)`).toBeLessThanOrEqual(35);
    }
  });

  it('shows nothing internal: no source or research code, no "world", no raw id', () => {
    for (const [key, [fr, en]] of entries) {
      for (const text of [fr, en]) {
        expect(text, `${key}: source code`).not.toMatch(/\b(S[1-9]|K\d{1,2}|TB5)\b(?!\s*(?:m|mm|g|bar))/);
        expect(text, `${key}: world`).not.toMatch(/\b(monde|mondes|world|worlds)\b/i);
        expect(text, `${key}: raw id`).not.toMatch(
          /\b(air-chamber|waste-valve|drive-gate-valve|tank-drain|stroke-nut)\b/,
        );
      }
    }
  });

  it('one term per concept: weight (not counterweight), No. in English, "Tout l’air", waste water', () => {
    for (const [key, [fr, en]] of entries) {
      expect(fr, key).not.toMatch(/contrepoids/i);
      expect(en, key).not.toMatch(/counterweight/i);
      expect(en, `${key}: French n° in English`).not.toMatch(/n°/);
      expect(fr, `${key}: agreement`).not.toMatch(/Toute l’air|toute l’air/);
      expect(fr, key).not.toMatch(/eau perdue/i);
      expect(en, key).not.toMatch(/lost at valve|water lost/i);
    }
  });

  it('English uses British spelling and no gallicism of the review', () => {
    for (const [key, [, en]] of entries) {
      expect(en, key).not.toMatch(/\b(toward|wrench|curb|meter|liter|center|pipe too soft|several bar)\b/i);
    }
  });
});

describe('the private transcript', () => {
  // docs/transcript.md is git-ignored: when it is present on this machine, no run of seven words of the interface strings, of
  // the simulation or of the panel (comments included) may be copied from it (the captions are only used to check facts and
  // find timestamps). Absent in CI: skipped.
  const transcriptFiles = import.meta.glob('../../docs/transcript.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
  const transcript = Object.values(transcriptFiles)[0];
  const sources = import.meta.glob(
    ['../sim/*.ts', './*.ts', '../part-actions.ts', '../i18n/ui.ts', '!../**/*.test.ts'],
    {
      query: '?raw',
      import: 'default',
      eager: true,
    },
  ) as Record<string, string>;

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
    const texts: [string, string][] = Object.entries(UI_STRINGS).map(([k, [fr]]) => [`ui.${k}`, fr]);
    for (const [path, text] of Object.entries(sources)) texts.push([path, text]);
    expect(texts.length).toBeGreaterThan(20);
    const copied = texts.flatMap(([where, text]) =>
      grams(words(text.replace(/\n/g, ' ')), 7)
        .filter((g) => source.has(g))
        .map((g) => `${where}: "${g}"`),
    );
    expect(copied).toEqual([]);
  });
});
