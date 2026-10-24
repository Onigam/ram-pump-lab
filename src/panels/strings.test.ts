import { describe, expect, it } from 'vitest';
import { UI_STRINGS } from '../i18n/ui';

// The lab's own interface strings: French and English written together (BRIEF §5), with the same placeholders, no empty
// string, and the short labels short enough for the grid of readouts (it truncates beyond ≈ 15 characters, more or less depending on the letters).

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
  'liveBody',
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

  it('the labels of the readout cells are short (≤ 16 characters in both languages; the browser check of the grid is the judge)', () => {
    for (const key of READOUT_KEYS) {
      const [fr, en] = UI_STRINGS[key];
      expect(fr.length, `${key} (fr): ${fr}`).toBeLessThanOrEqual(16);
      expect(en.length, `${key} (en): ${en}`).toBeLessThanOrEqual(16);
    }
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
});
