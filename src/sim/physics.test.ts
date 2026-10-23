import { describe, expect, it } from 'vitest';
import {
  area,
  deliveryDiameter,
  etaDAubuisson,
  etaRankine,
  G,
  joukowsky,
  maxDelivery,
  minClosingVelocity,
  RHO,
  ROUGHNESS,
  VALVES,
  WAVE_SPEED,
  WAVE_SPEED_HDPE,
} from './physics';

// The pure formulas. The figures of the video are checked against the whole model in engine.test.ts; here the
// arithmetic behind the derived figures (K12–K15, K18) is checked by hand.

describe('derived figures of the video (arithmetic only)', () => {
  const FALL = 7.5; // K1
  const HEAD = 65; // K3
  const DAILY = 500; // K10, L/day
  const q = DAILY / 1440; // 0.347 L/min

  it('K10: 500 L/day is 0.347 L/min', () => {
    expect(q).toBeCloseTo(0.347, 3);
  });

  it('K12: 3.2–3.5 mL per stroke at 100–110 strokes/min', () => {
    expect((q / 110) * 1000).toBeCloseTo(3.2, 1);
    expect((q / 100) * 1000).toBeCloseTo(3.5, 1);
  });

  it("K13: implied D'Aubuisson efficiency 0.30 / 0.40 / 0.60 for a drive flow of 10 / 7.5 / 5 L/min", () => {
    expect(etaDAubuisson(q, 10, HEAD, FALL)).toBeCloseTo(0.3, 1);
    expect(etaDAubuisson(q, 7.5, HEAD, FALL)).toBeCloseTo(0.4, 1);
    expect(etaDAubuisson(q, 5, HEAD, FALL)).toBeCloseTo(0.6, 1);
  });

  it('K14: the delivery cannot exceed Q·h/H = 0.87 L/min = 1 250 L/day at Q = 7.5 L/min', () => {
    const qMax = maxDelivery(7.5, HEAD, FALL);
    expect(qMax).toBeCloseTo(0.865, 2);
    expect(qMax * 1440).toBeGreaterThan(1240);
    expect(qMax * 1440).toBeLessThan(1260);
    expect(etaDAubuisson(qMax, 7.5, HEAD, FALL)).toBeCloseTo(1, 12);
  });

  it('K18: q = η·Q·h/H gives 750 L/day for η = 0.6 and Q = 7.5 L/min', () => {
    expect(0.6 * maxDelivery(7.5, HEAD, FALL) * 1440).toBeCloseTo(748, 0);
  });

  it('K4: the lift ratio of the video is H/h = 8.7', () => {
    expect(HEAD / FALL).toBeCloseTo(8.67, 2);
  });
});

describe('efficiencies', () => {
  it("D'Aubuisson and Rankine are related by η_R = η_D·(H−h)·Q / ((Q−q)·H)", () => {
    for (const [q, bigQ, head, fall] of [
      [0.35, 6.9, 65, 7.5],
      [1.1, 17.4, 65, 7.5],
      [4, 14, 12, 7.5],
      [0.2, 5, 90, 10],
    ]) {
      const dA = etaDAubuisson(q, bigQ, head, fall);
      const ra = etaRankine(q, bigQ, head, fall);
      expect(ra).toBeCloseTo((dA * (head - fall) * bigQ) / ((bigQ - q) * head), 10);
    }
  });

  it('both are zero without delivery and Rankine tends to D’Aubuisson for a small q and a high head', () => {
    expect(etaDAubuisson(0, 7, 65, 7.5)).toBe(0);
    expect(etaRankine(0, 7, 65, 7.5)).toBe(0);
    const dA = etaDAubuisson(0.01, 10, 1000, 10);
    const ra = etaRankine(0.01, 10, 1000, 10);
    expect(ra / dA).toBeCloseTo(0.99, 2);
  });

  it('guard against a zero drive flow', () => {
    expect(etaDAubuisson(1, 0, 65, 7.5)).toBe(0);
    expect(etaRankine(1, 1, 65, 7.5)).toBe(0);
  });
});

describe('water hammer (K15)', () => {
  it('Joukowsky: Δp = ρ·a·v', () => {
    expect(joukowsky(1, 1000)).toBe(1_000_000);
    expect(joukowsky(0.5, 900)).toBe(RHO * 900 * 0.5);
  });

  it('K15: the minimum closing velocity at the video site is 0.5–0.65 m/s for the chosen steel wave speed', () => {
    const v = minClosingVelocity(7.5, 65, WAVE_SPEED.steel);
    expect(v).toBeGreaterThan(0.5);
    expect(v).toBeLessThan(0.65);
    // ρ·a·v is the pressure that lifts the body from the static head of the drive pipe to the delivery head
    expect(joukowsky(v, WAVE_SPEED.steel)).toBeCloseTo(RHO * G * (65 - 7.5), 3);
  });

  it('the minimum closing velocity grows with the lift and falls with the wave speed', () => {
    expect(minClosingVelocity(7.5, 100, 900)).toBeGreaterThan(minClosingVelocity(7.5, 65, 900));
    expect(minClosingVelocity(7.5, 65, 350)).toBeGreaterThan(minClosingVelocity(7.5, 65, 900));
    expect(minClosingVelocity(7.5, 5, 900)).toBe(0);
  });

  it('plastic pipes have a much lower wave speed than steel, HDPE is the kit constant', () => {
    expect(WAVE_SPEED.hdpe).toBe(WAVE_SPEED_HDPE);
    expect(WAVE_SPEED.pvc).toBeLessThan(WAVE_SPEED.steel);
    expect(WAVE_SPEED.hdpe).toBeLessThan(WAVE_SPEED.pvc);
    expect(ROUGHNESS.steel).toBeGreaterThan(ROUGHNESS.hdpe);
  });
});

describe('geometry', () => {
  it('K7: the three waste valves have the seat bores of the 15×21, 20×27 and 26×34 fittings', () => {
    expect(VALVES[1].seat).toBe(0.015);
    expect(VALVES[2].seat).toBe(0.02);
    expect(VALVES[3].seat).toBe(0.026);
    expect(VALVES[1].dn).toBe(15);
    expect(VALVES[2].dn).toBe(20);
    expect(VALVES[3].dn).toBe(25);
  });

  it('pipe section and the delivery pipe, about half the drive pipe', () => {
    expect(area(0.027)).toBeCloseTo(5.73e-4, 6);
    expect(deliveryDiameter(27)).toBeGreaterThan(0.013);
    expect(deliveryDiameter(27)).toBeLessThan(0.02);
    expect(deliveryDiameter(5)).toBeGreaterThanOrEqual(0.008);
  });
});
