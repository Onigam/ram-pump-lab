// Helpers shared by the per-world part catalogues (src/data/parts/*.ts).
//
// Status of the figures (the same words as docs/physics.md). A figure with no tag is REPORTED by a source: the video
// S1 (with its timestamp in `video`) or the NC State table S4. Tagged figures are not reported:
//   « dérivé / derived »                   computed from reported figures;
//   « résultat du modèle / model result »  an output of the simulation;
//   « calibré / calibrated »               a setting chosen so that the model retrieves the video's figures;
//   « hypothèse / assumption »             a model constant the sources are silent on;
//   « estimation / estimate »              a dimension of the 3D model (src/three/dims.ts) that no source gives.
// The lab shows a GENERIC 1" ram, not the Walton n°3 of the video (no maker data found): only the waste valve follows
// the video. Video facts are those of S1 (L'énergie partout); textbook facts (S4 NC State, S6 Wikipedia) are
// named in the text. Nothing here is copied from the private transcript.

import type { Spec } from '@onigam/lab-kit/content';
import { l, type L } from '@onigam/lab-kit/i18n';
import { VALVE_SETTINGS } from '../sim/presets';
import { mmBox, nEnTrim, nFrTrim } from './units';

/** Stroke (mm) and counterweight (g) of the n°1 valve, calibrated on K10 / K11 (docs/physics.md §3). */
export const STROKE = VALVE_SETTINGS[1].stroke;
export const WEIGHT = VALVE_SETTINGS[1].counterweight;

/** English form of a number written the French way (7,5 -> 7.5 ; 5 700 -> 5,700 ; 40 % -> 40%). */
export function enNum(fr: string): string {
  return fr
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/(\d) (\d{3})(?!\d)/g, '$1,$2')
    .replace(/(\d) %/g, '$1%');
}

/** Plain value written the French way: derive the English form when it differs. */
export function num(fr: string): L | string {
  const en = enNum(fr);
  return en === fr ? fr : l(fr, en);
}

/** Spec row with a bilingual label and a plain (auto-localised) or bilingual value. */
export function sp(fr: string, en: string, value: string | L): Spec {
  return { label: l(fr, en), value: typeof value === 'string' ? num(value) : value };
}

export type Status = 'derived' | 'model' | 'calibrated' | 'assumed' | 'estimate';

export const TAG: Record<Status, readonly [string, string]> = {
  derived: ['dérivé', 'derived'],
  model: ['résultat du modèle', 'model result'],
  calibrated: ['calibré sur la vidéo', 'calibrated on the video'],
  assumed: ['hypothèse du modèle', 'model assumption'],
  estimate: ['estimation', 'estimate'],
};

/** A value that is not reported by a source, tagged in both languages. `en` defaults to the converted `fr`. */
export function tagged(status: Status, fr: string, en?: string): L {
  const [tf, te] = TAG[status];
  return l(`${fr} (${tf})`, `${en ?? enNum(fr)} (${te})`);
}

/** Lengths in metres from dims.ts shown as "a × b mm"; `status` tags them unless they are reported (null). */
export function lenMm(status: Status | null, ...metres: number[]): L {
  const b = mmBox(...metres);
  return status ? tagged(status, `${b.fr} mm`, `${b.en} mm`) : l(`${b.fr} mm`, `${b.en} mm`);
}

/** A length in metres from dims.ts shown in metres, tagged. */
export function lenM(status: Status | null, ...metres: number[]): L {
  const fr = metres.map((x) => nFrTrim(x)).join(' × ');
  const en = metres.map((x) => nEnTrim(x)).join(' × ');
  return status ? tagged(status, `${fr} m`, `${en} m`) : l(`${fr} m`, `${en} m`);
}

/** "Ø d × h m" for a round tank from dims.ts, tagged. */
export function diaH(status: Status | null, diameter: number, height: number): L {
  const fr = `Ø ${nFrTrim(diameter)} m × ${nFrTrim(height)} m`;
  const en = `Ø ${nEnTrim(diameter)} m × ${nEnTrim(height)} m`;
  return status ? tagged(status, fr, en) : l(fr, en);
}

// ---------------------------------------------------------------------------
// Site world
// ---------------------------------------------------------------------------

/** Volume of the delivery pipe and time to fill it at the video's delivery rate (derived from dims.ts and K10). */
