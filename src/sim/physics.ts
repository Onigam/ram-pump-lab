// Pure formulas of the ram (SI units unless a name says otherwise). The generic hydraulic helpers (g, ρ, Darcy friction,
// the HDPE wave speed) come from the kit and are re-exported so the rest of the simulation imports them from one place.

import { frictionFactor, G, NU, RHO, WAVE_SPEED_HDPE } from '@onigam/lab-kit/sim/hydraulic';
import type { PipeMaterial, ValveId } from './types';

export { frictionFactor, G, NU, RHO, WAVE_SPEED_HDPE };

/** Atmospheric pressure, Pa. */
export const P_ATM = 101325;
/** Lowest absolute-gauge pressure the water can sustain (vapour pressure), Pa gauge. */
export const P_VAPOUR = -90000;
/** Density of air, kg/m³ (the open waste valve and the snifter pass air, not water, during the recoil). */
export const RHO_AIR = 1.2;
/** Polytropic exponent of the air in the chamber (between isothermal 1.0 and adiabatic 1.4). ASSUMPTION. */
export const POLYTROPIC = 1.2;

/**
 * Wave speed of the water hammer in the drive pipe, m/s.
 *  - steel 900: CALIBRATED. The video's pipe is rigid steel and the research (K15) quotes 1 000–1 200 m/s for it; a bare
 *    27 × 3 mm steel tube is ≈ 1 400 by Korteweg. The lumped circuit of cycle.ts rings 1.57× slower than a real pipe of
 *    the same wave speed (2πL/a against 4L/a), so one constant has to serve both the surge amplitude ρ·a·v and the
 *    timing of the recoil. Asking the model for K10 (500 L/day) and K11 (100–110 strokes/min, ±10 %) at once brackets it:
 *    n ≤ 121 needs a ≲ 970 m/s, and K15 (minimum closing velocity ≤ 0.65 m/s) needs a ≳ 870 m/s. 900 is in the window.
 *  - pvc 500: PVC-U 32 × 3 mm by Korteweg (E = 3 GPa), rounded. ASSUMPTION.
 *  - hdpe 350: the kit's constant (WAVE_SPEED_HDPE), for a plastic pipe.
 */
export const WAVE_SPEED: Record<PipeMaterial, number> = { steel: 900, pvc: 500, hdpe: WAVE_SPEED_HDPE };
/** Absolute roughness of the drive pipe, m (aged galvanised steel; PVC and HDPE are smooth). ASSUMPTION. */
export const ROUGHNESS: Record<PipeMaterial, number> = { steel: 1.0e-4, pvc: 1.5e-6, hdpe: 7e-6 };
/** Sum of the minor loss coefficients of the drive pipe: entrance, strainer, inlet valve V1, two bends. ASSUMPTION. */
export const K_MINOR = 3;

/**
 * The three waste valves of the video (research K7): seat bore from the plumbing fitting names, 15×21, 20×27 and 26×34.
 * `bareMass` is the moving mass without the counterweight (head, stem, nuts): ASSUMPTION, a few tens of grams.
 */
export const VALVES: Record<ValveId, { dn: number; seat: number; bareMass: number }> = {
  1: { dn: 15, seat: 0.015, bareMass: 0.06 },
  2: { dn: 20, seat: 0.02, bareMass: 0.09 },
  3: { dn: 25, seat: 0.026, bareMass: 0.13 },
};
/** Discharge coefficient of the curtain area under the lifted waste valve. ASSUMPTION (sharp-edged gap). */
export const CD_WASTE = 0.65;
/** Discharge coefficient of the delivery check valve. ASSUMPTION. */
export const CD_DELIVERY = 0.6;
/** Delivery check valve flow area as a fraction of the drive pipe section (S4: the valves are about pipe-sized). ASSUMPTION. */
export const DELIVERY_VALVE_AREA_RATIO = 0.5;
/** Snifter orifice diameter (m), discharge coefficient and cracking pressure (Pa). ASSUMPTIONS. */
export const SNIFTER_DIAMETER = 0.0015;
export const CD_SNIFTER = 0.6;
export const SNIFTER_CRACK = 1000;
/** Air share of the chamber (fraction of its volume, at working pressure) when the snifter keeps it topped up. ASSUMPTION. */
export const AIR_FRACTION_NOMINAL = 0.6;
/** Air share left in a water-logged chamber (trapped bubbles): a few per cent of the volume. ASSUMPTION. */
export const AIR_FRACTION_LOGGED = 0.004;
/**
 * Time constants of the chamber air share, seconds of simulated time. ASSUMPTIONS (the sources are silent):
 *  - the air dissolves into the water under pressure and is carried off: a blocked snifter water-logs the chamber in
 *    a few hours (6 h);
 *  - a working snifter admits air at each recoil and refills it in about 20 min.
 */
export const AIR_TAU_LOSS = 6 * 3600;
export const AIR_TAU_REFILL = 20 * 60;

/**
 * Inner diameter of the delivery pipe, m. S4: the delivery pipe is about half the drive pipe, so a ½" pipe (≈ 16 mm bore)
 * for the video's 1" ram: 0.6 × the drive bore. ASSUMPTION.
 */
export function deliveryDiameter(driveDiameterMm: number): number {
  return Math.max(0.008, (driveDiameterMm / 1000) * 0.6);
}

/** Pipe section, m². */
export function area(diameter: number): number {
  return (Math.PI * diameter * diameter) / 4;
}

/** Joukowsky pressure rise, Pa, for a sudden stop of a flow at velocity v in a pipe of wave speed a. */
export function joukowsky(v: number, a: number): number {
  return RHO * a * v;
}

/**
 * Smallest closing velocity able to open the delivery check valve (research K15): the surge ρ·a·v must lift the
 * pressure from the static head of the drive pipe, ρ·g·h, up to the delivery head, ρ·g·H.
 */
export function minClosingVelocity(fall: number, deliveryHead: number, waveSpeed: number): number {
  return Math.max(0, (RHO * G * (deliveryHead - fall)) / (RHO * waveSpeed));
}

/** D'Aubuisson efficiency η = q·H / (Q·h) (S5). Q = total drive flow, q = delivered flow. */
export function etaDAubuisson(q: number, bigQ: number, deliveryHead: number, fall: number): number {
  return bigQ > 1e-9 ? (q * deliveryHead) / (bigQ * fall) : 0;
}

/** Rankine efficiency η = q·(H−h) / ((Q−q)·h) (S5): the delivered water is not counted in the water that fell. */
export function etaRankine(q: number, bigQ: number, deliveryHead: number, fall: number): number {
  const wasted = bigQ - q;
  return wasted > 1e-9 ? (q * (deliveryHead - fall)) / (wasted * fall) : 0;
}

/** Upper bound of the delivery for a drive flow Q (research K14, η = 1): q ≤ Q·h/H. */
export function maxDelivery(bigQ: number, deliveryHead: number, fall: number): number {
  return (bigQ * fall) / deliveryHead;
}

/** Darcy friction factor of the drive pipe at velocity v (m/s), diameter d (m). */
export function frictionOf(v: number, d: number, roughness: number): number {
  return frictionFactor(Math.max(Math.abs(v), 1e-3), d, roughness);
}

/** Air compliance of the chamber, m³/Pa, for an air volume `vAir` (m³) at the absolute pressure `pAbs` (Pa). */
export function airCompliance(vAir: number, pAbs: number): number {
  return vAir / (POLYTROPIC * pAbs);
}

/** Convert a flow in m³/s to L/min. */
export const toLpm = (q: number): number => q * 60000;
/** Convert pascals to bar. */
export const toBar = (p: number): number => p / 1e5;
